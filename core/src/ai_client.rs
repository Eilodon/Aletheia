//! Aletheia Core - AI Client with Multi-Provider Gateway
//! ADR-AL-14: AI Retry Exponential Backoff
//! ADR-AL-15: Multi-Provider AI Gateway
//! ADR-AL-19: AI Stream Cancellation

use crate::contracts::*;
use crate::errors::AletheiaError;
use crate::store::Store;
use reqwest::Client;
use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tracing::{info, warn};

const MAX_RETRIES: u32 = 3;
const INITIAL_BACKOFF_MS: u64 = 500;

const SYSTEM_PROMPT: &str = r#"Bạn là người đọc lá bài — không phải tiên tri, không phải chuyên gia tư vấn.
Bạn chỉ diễn giải những gì đã được lật ra.

Khi diễn giải:
- Kết nối nội dung passage với biểu tượng đã được chọn
- Nếu user có chia sẻ tình huống, gợi mở từ góc nhìn đó — nhưng không phán xét
- Tone: ấm áp, chiêm nghiệm, đôi khi có một chút dí dỏm nhẹ
- Độ dài: khoảng 80-120 chữ tiếng Việt

Tuyệt đối không:
- Đưa ra lời khuyên cụ thể ("bạn nên...")
- Khẳng định điều gì về tương lai
- Phán xét quyết định của user

Luôn kết thúc bằng một câu hỏi mở in nghiêng để user tự suy nghĩ tiếp.
Câu hỏi bắt đầu bằng dòng mới, format: *[câu hỏi]*"#;

const CLAUDE_MODEL: &str = "claude-sonnet-4-20250514";
const GPT_MODEL: &str = "gpt-4-turbo";
const GEMINI_MODEL: &str = "gemini-2.0-flash";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum AIProvider {
    Claude,
    GPT4,
    Gemini,
}

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
        cancel_token: Arc<AtomicBool>,
    ) -> Result<Vec<String>, AletheiaError> {
        let prompt = self.build_prompt(passage, symbol, situation_text);

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

            match self.call_with_retry(provider, &prompt, Arc::clone(&cancel_token)).await {
                Ok(response) => {
                    info!("AI response from {:?}", provider);
                    return Ok(response);
                }
                Err(e) => {
                    warn!("AI call failed with {:?}: {}", provider, e);
                    // Try next provider
                    continue;
                }
            }
        }

        // All providers failed, use fallback
        info!("All AI providers failed, using fallback");
        self.get_fallback(passage)
    }

    fn build_prompt(&self, passage: &Passage, symbol: &Symbol, situation_text: Option<&str>) -> String {
        let mut parts = Vec::new();
        
        if let Some(situation) = situation_text {
            parts.push(format!("Tình huống: {}", situation));
        }
        parts.push(format!("Biểu tượng đã chọn: {}", symbol.display_name));
        parts.push(format!("Đoạn trích ({}):\n{}", passage.reference, passage.text));
        
        parts.join("\n\n")
    }

    async fn call_with_retry(
        &self,
        provider: AIProvider,
        prompt: &str,
        cancel_token: Arc<AtomicBool>,
    ) -> Result<Vec<String>, AletheiaError> {
        let mut delay = INITIAL_BACKOFF_MS;
        let mut last_error: Option<AletheiaError> = None;

        for attempt in 0..MAX_RETRIES {
            if cancel_token.load(Ordering::SeqCst) {
                return Err(AletheiaError::ai_unavailable());
            }

            let result = match provider {
                AIProvider::Claude => self.call_claude(prompt, Arc::clone(&cancel_token)).await,
                AIProvider::GPT4 => self.call_gpt4(prompt, Arc::clone(&cancel_token)).await,
                AIProvider::Gemini => self.call_gemini(prompt, Arc::clone(&cancel_token)).await,
            };

            match result {
                Ok(response) => return Ok(response),
                Err(e) => {
                    last_error = Some(e);
                    
                    // Check if retryable
                    if let Some(ref err) = last_error {
                        let is_retryable = matches!(
                            err.code,
                            ErrorCode::AiTimeout | ErrorCode::AiUnavailable
                        );
                        
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

    async fn call_claude(&self, prompt: &str, _cancel_token: Arc<AtomicBool>) -> Result<Vec<String>, AletheiaError> {
        let api_key = self.api_keys.get(&AIProvider::Claude)
            .ok_or_else(|| AletheiaError::ai_unavailable())?;

        let request_body = serde_json::json!({
            "model": CLAUDE_MODEL,
            "max_tokens": 1000,
            "stream": false,
            "system": SYSTEM_PROMPT,
            "messages": [{ "role": "user", "content": prompt }]
        });

        let response = self.http_client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_millis(AI_STREAM_TIMEOUT_MS as u64))
            .send()
            .await?;

        if response.status() == 429 {
            return Err(AletheiaError::ai_unavailable());
        }

        if !response.status().is_success() {
            return Err(AletheiaError::ai_unavailable());
        }

        let json: Value = response.json().await?;
        let content = json["content"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|v| v.get("text"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        Ok(vec![content])
    }

    async fn call_gpt4(&self, prompt: &str, _cancel_token: Arc<AtomicBool>) -> Result<Vec<String>, AletheiaError> {
        let api_key = self.api_keys.get(&AIProvider::GPT4)
            .ok_or_else(|| AletheiaError::ai_unavailable())?;

        let request_body = serde_json::json!({
            "model": GPT_MODEL,
            "max_tokens": 1000,
            "messages": [
                { "role": "system", "content": SYSTEM_PROMPT },
                { "role": "user", "content": prompt }
            ]
        });

        let response = self.http_client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("content-type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_millis(AI_STREAM_TIMEOUT_MS as u64))
            .send()
            .await?;

        if response.status() == 429 {
            return Err(AletheiaError::ai_unavailable());
        }

        if !response.status().is_success() {
            return Err(AletheiaError::ai_unavailable());
        }

        let json: Value = response.json().await?;
        let content = json["choices"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|v| v.get("message"))
            .and_then(|v| v.get("content"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        Ok(vec![content])
    }

    async fn call_gemini(&self, prompt: &str, _cancel_token: Arc<AtomicBool>) -> Result<Vec<String>, AletheiaError> {
        let api_key = self.api_keys.get(&AIProvider::Gemini)
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

        let response = self.http_client
            .post(&url)
            .header("content-type", "application/json")
            .json(&request_body)
            .timeout(std::time::Duration::from_millis(AI_STREAM_TIMEOUT_MS as u64))
            .send()
            .await?;

        if response.status() == 429 {
            return Err(AletheiaError::ai_unavailable());
        }

        if !response.status().is_success() {
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
}
