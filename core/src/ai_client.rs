//! Aletheia Core - AI Client with Multi-Provider Gateway
//! ADR-AL-14: AI Retry Exponential Backoff
//! ADR-AL-15: Multi-Provider AI Gateway
//! ADR-AL-19: AI Stream Cancellation

use crate::contracts::*;
use crate::errors::AletheiaError;
use crate::store::Store;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tracing::{info, warn};

const MAX_RETRIES: u32 = 3;
const INITIAL_BACKOFF_MS: u64 = 500;

// SSL Pinning - Domain allowlist for production security
// In production, uncomment and add your actual API domains
// This prevents requests to unknown endpoints even with valid certs
#[allow(dead_code)]
const ALLOWED_DOMAINS: &[&str] = &[
    // "api.anthropic.com",
    // "api.openai.com", 
    // "generativelanguage.googleapis.com",
];

fn is_domain_allowed(url: &str) -> bool {
    if ALLOWED_DOMAINS.is_empty() {
        return true; // No restriction in dev
    }
    ALLOWED_DOMAINS.iter().any(|&domain| url.contains(domain))
}

const SYSTEM_PROMPT: &str = r#"Bạn là một chiếc gương, không phải nhà tiên tri, không phải chuyên gia tư vấn.
Bạn phản chiếu lại điều đã hiện ra, để người đọc tự nghe thấy mình rõ hơn.

Khi viết:
- Kết nối passage với biểu tượng đã được chọn
- Nếu user có chia sẻ tình huống, mirror lại chính ngôn ngữ của họ; dùng lại từ họ dùng khi phù hợp, không paraphrase khô cứng
- Đừng giải thích passage như bài giảng; đặt nó vào ngữ cảnh họ vừa mô tả
- Tone: ấm áp, chiêm nghiệm, chính xác, không phán xét
- Độ dài phần phản chiếu chính: khoảng 80-120 chữ

Tuyệt đối không:
- Đưa ra lời khuyên cụ thể ("bạn nên...")
- Khẳng định điều gì về tương lai
- Phán xét quyết định của user

Luôn kết thúc bằng một câu hỏi mở ngắn để người đọc tự nghĩ tiếp.
- Câu hỏi phải hỏi về hiện tại, không hỏi về tương lai
- Dưới 15 từ
- Ở dòng riêng cuối cùng, format: *[câu hỏi]*"#;

const CLAUDE_MODEL: &str = "claude-sonnet-4-20250514";
const GPT_MODEL: &str = "gpt-4-turbo";
const GEMINI_MODEL: &str = "gemini-2.0-flash";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum AIProvider {
    Claude,
    GPT4,
    Gemini,
}

type ChunkCallback = Arc<dyn Fn(String) + Send + Sync>;

#[derive(Clone)]
pub struct AIClient {
    http_client: Client,
    store: Arc<Store>,
    current_provider: AIProvider,
    api_keys: std::collections::HashMap<AIProvider, String>,
}

impl AIClient {
    pub fn new(store: Arc<Store>) -> Self {
        Self {
            http_client: Client::new(),
            store,
            current_provider: AIProvider::Claude,
            api_keys: std::collections::HashMap::new(),
        }
    }

    pub fn set_api_key(&mut self, provider: AIProvider, key: String) {
        self.api_keys.insert(provider, key);
    }

    pub async fn request_interpretation(
        &mut self,
        passage: &Passage,
        symbol: &Symbol,
        situation_text: Option<&str>,
        user_intent: Option<&str>,
        cancel_token: Arc<AtomicBool>,
    ) -> Result<AIInterpretation, AletheiaError> {
        self.request_interpretation_with_callback(
            passage,
            symbol,
            situation_text,
            user_intent,
            cancel_token,
            None,
        )
        .await
    }

    pub async fn request_interpretation_with_callback(
        &mut self,
        passage: &Passage,
        symbol: &Symbol,
        situation_text: Option<&str>,
        user_intent: Option<&str>,
        cancel_token: Arc<AtomicBool>,
        on_chunk: Option<ChunkCallback>,
    ) -> Result<AIInterpretation, AletheiaError> {
        let prompt = self.build_prompt(passage, symbol, situation_text, user_intent);

        // Try with retry and failover
        let providers = vec![
            self.current_provider,
            self.get_next_provider(self.current_provider),
            self.get_next_provider(self.get_next_provider(self.current_provider)),
        ];

        for provider in providers {
            if cancel_token.load(Ordering::SeqCst) {
                info!("AI request cancelled");
                break;
            }

            match self
                .call_with_retry(
                    provider,
                    &prompt,
                    Arc::clone(&cancel_token),
                    on_chunk.clone(),
                )
                .await
            {
                Ok(response) => {
                    info!("AI response from {:?}", provider);
                    return Ok(AIInterpretation {
                        chunks: response,
                        used_fallback: false,
                    });
                }
                Err(e) => {
                    warn!("AI call failed with {:?}: {}", provider, e);
                    // Try next provider
                    continue;
                }
            }
        }

        if cancel_token.load(Ordering::SeqCst) {
            return Err(AletheiaError::ai_unavailable());
        }

        // All providers failed, use fallback
        info!("All AI providers failed, using fallback");
        Ok(AIInterpretation {
            chunks: self.get_fallback(passage)?,
            used_fallback: true,
        })
    }

    fn build_prompt(
        &self,
        passage: &Passage,
        symbol: &Symbol,
        situation_text: Option<&str>,
        user_intent: Option<&str>,
    ) -> String {
        let mut parts = Vec::new();

        let passage_language = self
            .store
            .get_source(&passage.source_id)
            .ok()
            .flatten()
            .map(|source| source.language)
            .unwrap_or_else(|| "vi".to_string());

        parts.push(format!(
            "Hãy trả lời hoàn toàn bằng ngôn ngữ của đoạn trích này: {}.",
            passage_language
        ));

        // Add intent-based tone instruction
        if let Some(intent) = user_intent {
            let intent_instruction = match intent {
                "clarity" => "Tone cho lần đọc này: phân tích rõ ràng, chính xác. User cần sự rõ ràng — giúp họ thấy pattern và structure trong tình huống.",
                "comfort" => "Tone cho lần đọc này: ấm áp, chữa lành. User cần được an ủi — đặt sự nhẹ nhàng và compassion lên trên hết.",
                "challenge" => "Tone cho lần đọc này: trực tiếp, không ngại đối mặt. User muốn bị thách thức — đừng ngại nêu lên những điều khó nghe.",
                "guidance" => "Tone cho lần đọc này: mở, không định hướng. User để vũ trụ dẫn lối — đừng push bất kỳ hướng nào, chỉ mở không gian.",
                _ => "",
            };
            if !intent_instruction.is_empty() {
                parts.push(intent_instruction.to_string());
            }
        }

        if let Some(situation) = situation_text {
            parts.push(format!("Tình huống: {}", situation));
            parts.push(
                "Mirror lại ngôn ngữ của người dùng khi phản chiếu, nhưng đừng lặp lại một cách máy móc."
                    .to_string(),
            );
        }

        parts.push(format!("Biểu tượng đã chọn: {}", symbol.display_name));
        parts.push(format!(
            "Đoạn trích ({}):\n{}",
            passage.reference, passage.text
        ));

        if let Some(context) = passage
            .resonance_context
            .as_ref()
            .or(passage.context.as_ref())
        {
            parts.push(format!(
                "Ngữ cảnh ẩn cho người đọc (không nhắc lộ ra): {}",
                context
            ));
        }

        parts.join("\n\n")
    }

    async fn call_with_retry(
        &self,
        provider: AIProvider,
        prompt: &str,
        cancel_token: Arc<AtomicBool>,
        on_chunk: Option<ChunkCallback>,
    ) -> Result<Vec<String>, AletheiaError> {
        let mut delay = INITIAL_BACKOFF_MS;
        let mut last_error: Option<AletheiaError> = None;

        for attempt in 0..MAX_RETRIES {
            if cancel_token.load(Ordering::SeqCst) {
                return Err(AletheiaError::ai_unavailable());
            }

            let result = match provider {
                AIProvider::Claude => {
                    self.call_claude(prompt, Arc::clone(&cancel_token), on_chunk.clone())
                        .await
                }
                AIProvider::GPT4 => {
                    self.call_gpt4(prompt, Arc::clone(&cancel_token), on_chunk.clone())
                        .await
                }
                AIProvider::Gemini => {
                    self.call_gemini(prompt, Arc::clone(&cancel_token), on_chunk.clone())
                        .await
                }
            };

            match result {
                Ok(response) => return Ok(response),
                Err(e) => {
                    last_error = Some(e);

                    // Check if retryable
                    if let Some(ref err) = last_error {
                        let is_retryable =
                            matches!(err.code, ErrorCode::AiTimeout | ErrorCode::AiUnavailable);

                        if !is_retryable || attempt == MAX_RETRIES - 1 {
                            break;
                        }
                    }

                    // Exponential backoff with jitter
                    let jitter = rand::random::<u64>() % 200;
                    tokio::time::sleep(tokio::time::Duration::from_millis(delay + jitter)).await;
                    delay *= 2;
                }
            }
        }

        Err(last_error.unwrap_or_else(|| AletheiaError::ai_unavailable()))
    }

    async fn call_claude(
        &self,
        prompt: &str,
        cancel_token: Arc<AtomicBool>,
        on_chunk: Option<ChunkCallback>,
    ) -> Result<Vec<String>, AletheiaError> {
        let api_key = self
            .api_keys
            .get(&AIProvider::Claude)
            .ok_or_else(|| AletheiaError::ai_unavailable())?;

        let request_body = serde_json::json!({
            "model": CLAUDE_MODEL,
            "max_tokens": 1000,
            "stream": true,
            "system": SYSTEM_PROMPT,
            "messages": [{ "role": "user", "content": prompt }]
        });

        let response = self
            .http_client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_millis(
                AI_STREAM_TIMEOUT_MS as u64,
            ))
            .send()
            .await?;

        if response.status() == 429 {
            return Err(AletheiaError::ai_unavailable());
        }

        if !response.status().is_success() {
            return Err(AletheiaError::ai_unavailable());
        }

        self.consume_sse_stream(response.bytes_stream(), cancel_token, on_chunk, |json| {
            if json["type"].as_str() != Some("content_block_delta") {
                return None;
            }

            json["delta"]["text"]
                .as_str()
                .map(|value| value.to_string())
        })
        .await
    }

    async fn call_gpt4(
        &self,
        prompt: &str,
        cancel_token: Arc<AtomicBool>,
        on_chunk: Option<ChunkCallback>,
    ) -> Result<Vec<String>, AletheiaError> {
        let api_key = self
            .api_keys
            .get(&AIProvider::GPT4)
            .ok_or_else(|| AletheiaError::ai_unavailable())?;

        let request_body = serde_json::json!({
            "model": GPT_MODEL,
            "max_tokens": 1000,
            "stream": true,
            "messages": [
                { "role": "system", "content": SYSTEM_PROMPT },
                { "role": "user", "content": prompt }
            ]
        });

        let response = self
            .http_client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("content-type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_millis(
                AI_STREAM_TIMEOUT_MS as u64,
            ))
            .send()
            .await?;

        if response.status() == 429 {
            return Err(AletheiaError::ai_unavailable());
        }

        if !response.status().is_success() {
            return Err(AletheiaError::ai_unavailable());
        }

        self.consume_sse_stream(response.bytes_stream(), cancel_token, on_chunk, |json| {
            json["choices"]
                .as_array()
                .and_then(|choices| choices.first())
                .and_then(|choice| choice.get("delta"))
                .and_then(|delta| delta.get("content"))
                .and_then(|content| content.as_str())
                .map(|value| value.to_string())
        })
        .await
    }

    async fn call_gemini(
        &self,
        prompt: &str,
        cancel_token: Arc<AtomicBool>,
        on_chunk: Option<ChunkCallback>,
    ) -> Result<Vec<String>, AletheiaError> {
        let api_key = self
            .api_keys
            .get(&AIProvider::Gemini)
            .ok_or_else(|| AletheiaError::ai_unavailable())?;

        let request_body = serde_json::json!({
            "contents": [{
                "parts": [{ "text": format!("{}\n\n{}", SYSTEM_PROMPT, prompt) }]
            }],
            "generationConfig": {
                "maxOutputTokens": 1000,
                "temperature": 0.7,
            }
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            GEMINI_MODEL, api_key
        );

        let response = self
            .http_client
            .post(&url)
            .header("content-type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_millis(
                AI_STREAM_TIMEOUT_MS as u64,
            ))
            .send()
            .await?;

        if response.status() == 429 {
            return Err(AletheiaError::ai_unavailable());
        }

        if !response.status().is_success() {
            return Err(AletheiaError::ai_unavailable());
        }

        if cancel_token.load(Ordering::SeqCst) {
            return Err(AletheiaError::ai_unavailable());
        }

        let json: Value = response.json().await?;
        let content = json["candidates"]
            .as_array()
            .and_then(|arr| arr.get(0))
            .and_then(|v| v.get("content"))
            .and_then(|v| v.get("parts"))
            .and_then(|arr| arr.get(0))
            .and_then(|v| v.get("text"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if let Some(callback) = on_chunk {
            callback(content.clone());
        }

        Ok(vec![content])
    }

    fn get_next_provider(&self, current: AIProvider) -> AIProvider {
        match current {
            AIProvider::Claude => AIProvider::GPT4,
            AIProvider::GPT4 => AIProvider::Gemini,
            AIProvider::Gemini => AIProvider::Claude,
        }
    }

    fn get_fallback(&self, passage: &Passage) -> Result<Vec<String>, AletheiaError> {
        let prompts = self.store.get_fallback_prompts(&passage.source_id)?;

        info!("Using fallback prompts for source {}", passage.source_id);
        Ok(prompts)
    }

    async fn consume_sse_stream<S, F>(
        &self,
        mut stream: S,
        cancel_token: Arc<AtomicBool>,
        on_chunk: Option<ChunkCallback>,
        parser: F,
    ) -> Result<Vec<String>, AletheiaError>
    where
        S: futures_util::stream::Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Unpin,
        F: Fn(&Value) -> Option<String>,
    {
        let mut buffer = String::new();
        let mut chunks: Vec<String> = Vec::new();

        while let Some(next) = stream.next().await {
            if cancel_token.load(Ordering::SeqCst) {
                break;
            }

            let bytes = next?;
            let fragment = String::from_utf8_lossy(&bytes);
            buffer.push_str(&fragment);

            // Process complete lines only.
            // SSE spec: each event field is a line. Only lines starting with
            // exactly "data: " are payload lines. This prevents false matches
            // when AI-generated text contains the string "data: " mid-sentence.
            loop {
                // Find the next complete line (ends with \n)
                let newline_pos = match buffer.find('\n') {
                    Some(pos) => pos,
                    None => break, // No complete line yet, wait for more data
                };

                // Extract the line (without the trailing \n)
                let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
                // Drain processed line including the \n
                buffer.drain(..newline_pos + 1);

                // Skip empty lines (SSE event separator) and comment lines
                if line.is_empty() || line.starts_with(':') {
                    continue;
                }

                // Only process lines that are exactly a "data: " field
                let payload = match line.strip_prefix("data: ") {
                    Some(p) => p.trim(),
                    None => continue, // "event:", "id:", "retry:" fields — ignore
                };

                // Stream termination signal
                if payload == "[DONE]" {
                    return if chunks.is_empty() {
                        Err(AletheiaError::ai_unavailable())
                    } else {
                        Ok(chunks)
                    };
                }

                if payload.is_empty() {
                    continue;
                }

                // Parse JSON payload
                match serde_json::from_str::<Value>(payload) {
                    Ok(json) => {
                        if let Some(chunk) = parser(&json) {
                            if !chunk.is_empty() {
                                if let Some(callback) = &on_chunk {
                                    callback(chunk.clone());
                                }
                                chunks.push(chunk);
                            }
                        }
                    }
                    Err(_) => {
                        // Malformed JSON on a complete line — log and skip
                        warn!("SSE: failed to parse JSON payload (len={})", payload.len());
                    }
                }
            }
        }

        if chunks.is_empty() {
            return Err(AletheiaError::ai_unavailable());
        }

        Ok(chunks)
    }
}
