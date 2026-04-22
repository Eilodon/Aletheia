//! Aletheia Core - Local Inference Engine
//! CYCLE 2: On-device inference with Gemma 3n E2B
//!
//! This module provides the contract for local inference. The actual implementation
//! will be done in native modules (Android/iOS) using platform-specific ML runtimes.
//!
//! Architecture:
//! - Rust core defines the interface and provides stub implementations
//! - Android native module uses MediaPipe Tasks or llama.cpp
//! - iOS native module uses Core ML or llama.cpp
//!
//! The inference flow:
//! 1. Check device capability (RAM, CPU, SIMD)
//! 2. Download/cache model file if needed
//! 3. Initialize inference engine
//! 4. Run inference with streaming output
//! 5. Return results through callback

use crate::contracts::*;
use crate::errors::AletheiaError;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tracing::info;

/// Model configuration for Gemma 3n E2B
/// These constants are used by native modules for capability checks
#[allow(dead_code)]
pub const MODEL_ID: &str = "gemma-3n-e2b";
#[allow(dead_code)]
pub const MODEL_VERSION: &str = "1.0.0";
#[allow(dead_code)]
pub const MODEL_SIZE_BYTES: u64 = 2_000_000_000; // ~2GB
#[allow(dead_code)]
pub const REQUIRED_RAM_MB: u32 = 2048; // 2GB minimum
#[allow(dead_code)]
pub const MIN_CPU_CORES: u32 = 4;
#[allow(dead_code)]
pub const ESTIMATED_TPS_LOW: f32 = 2.0; // Low-end device
#[allow(dead_code)]
pub const ESTIMATED_TPS_HIGH: f32 = 10.0; // High-end device

/// Local inference engine state
#[derive(Debug, Clone)]
pub struct LocalInferenceEngine {
    /// Model info cache
    model_info: LocalModelInfo,
    /// Whether the engine is initialized
    initialized: bool,
    /// Download in progress flag
    download_in_progress: bool,
    /// Download progress (0-100)
    download_progress: u8,
}

impl Default for LocalInferenceEngine {
    fn default() -> Self {
        Self {
            model_info: LocalModelInfo::default(),
            initialized: false,
            download_in_progress: false,
            download_progress: 0,
        }
    }
}

impl LocalInferenceEngine {
    pub fn new() -> Self {
        Self::default()
    }

    /// Check if this device is capable of running local inference.
    /// This is a stub - native module will provide actual implementation.
    pub fn check_device_capability(&self) -> DeviceCapability {
        // Stub implementation - native module will override
        DeviceCapability {
            supported: false,
            available_ram_mb: 0,
            cpu_cores: 0,
            has_simd: false,
            estimated_tps: 0.0,
            unsupported_reason: Some("Native module not initialized".to_string()),
        }
    }

    /// Get the current model status.
    pub fn get_model_status(&self) -> LocalModelInfo {
        self.model_info.clone()
    }

    /// Prepare the model for inference (download if needed).
    /// This is a stub - native module will handle actual download.
    pub fn prepare_model(
        &mut self,
        _force_download: bool,
        _cancel_token: Option<Arc<AtomicBool>>,
        _on_progress: Option<Arc<dyn Fn(u8) + Send + Sync>>,
    ) -> Result<(), AletheiaError> {
        info!("LocalInferenceEngine::prepare_model - stub implementation");
        
        // Stub - native module will handle actual download
        Err(AletheiaError::invalid_input(
            "local_model",
            "Local inference not available in Rust core - use native module",
        ))
    }

    /// Cancel an ongoing download.
    pub fn cancel_download(&mut self) {
        self.download_in_progress = false;
        self.download_progress = 0;
        info!("Download cancelled");
    }

    /// Delete the downloaded model.
    pub fn delete_model(&mut self) -> Result<bool, AletheiaError> {
        info!("LocalInferenceEngine::delete_model - stub implementation");
        
        // Reset model info
        self.model_info = LocalModelInfo::default();
        self.initialized = false;
        
        // Stub - native module will handle actual deletion
        Ok(false)
    }

    /// Run inference on the local model.
    /// This is a stub - native module will provide actual implementation.
    pub fn run_inference(
        &self,
        _prompt: &str,
        _cancel_token: Arc<AtomicBool>,
        _on_chunk: Option<Arc<dyn Fn(String) + Send + Sync>>,
    ) -> Result<Vec<String>, AletheiaError> {
        if !self.initialized {
            return Err(AletheiaError::invalid_input(
                "local_model",
                "Model not initialized",
            ));
        }

        // Stub - native module will handle actual inference
        Err(AletheiaError::invalid_input(
            "local_model",
            "Local inference not available in Rust core - use native module",
        ))
    }

    /// Build a prompt for interpretation using the same logic as cloud AI.
    pub fn build_interpretation_prompt(
        &self,
        passage: &Passage,
        symbol: &Symbol,
        situation_text: Option<&str>,
        user_intent: Option<&str>,
        language: &str,
    ) -> String {
        let mut parts = Vec::new();

        // Language instruction
        parts.push(format!(
            "Hãy trả lời hoàn toàn bằng ngôn ngữ của đoạn trích này: {}.",
            language
        ));

        parts.push("Chỉ trả về đúng 2 phần: một đoạn phản chiếu ngắn và một câu hỏi mở ở dòng cuối.".to_string());

        // Intent-based tone instruction (canonical — must match server interpretationService.ts)
        if let Some(intent) = user_intent {
            let intent_instruction = match intent {
                "clarity" => "Tone cho lần đọc này: rõ ràng, gọn, chính xác. User cần thấy pattern trong tình huống.",
                "comfort" => "Tone cho lần đọc này: ấm áp, nhẹ, giàu compassion nhưng không lên lớp.",
                "challenge" => "Tone cho lần đọc này: trực tiếp, tỉnh táo, không né điều khó.",
                "guidance" => "Tone cho lần đọc này: mở, không định hướng, giữ không gian để người đọc tự nghe mình.",
                _ => "",
            };
            if !intent_instruction.is_empty() {
                parts.push(intent_instruction.to_string());
            }
        }

        // Situation text
        if let Some(situation) = situation_text {
            parts.push(format!("Tình huống: {}", situation));
            parts.push(
                "Mirror lại ngôn ngữ của người dùng khi phản chiếu, nhưng đừng lặp lại một cách máy móc."
                    .to_string(),
            );
        }

        // Symbol and passage
        parts.push(format!("Biểu tượng đã chọn: {}", symbol.display_name));
        parts.push(format!("Đoạn trích ({}):\n{}", passage.reference, passage.text));

        // Context
        if let Some(context) = passage
            .resonance_context
            .as_ref()
            .or(passage.context.as_ref())
        {
            parts.push(format!("Ngữ cảnh ẩn cho người đọc (không nhắc lộ ra): {}", context));
        }

        parts.join("\n\n")
    }

    /// Update model info (called by native module)
    pub fn update_model_info(&mut self, info: LocalModelInfo) {
        self.model_info = info;
        self.initialized = self.model_info.status == LocalModelStatus::Ready;
    }

    /// Update download progress (called by native module)
    pub fn update_download_progress(&mut self, progress: u8) {
        self.download_progress = progress;
        self.model_info.download_progress = progress;
        self.model_info.status = LocalModelStatus::Downloading;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_creation() {
        let engine = LocalInferenceEngine::new();
        assert!(!engine.initialized);
        assert_eq!(engine.model_info.model_id, MODEL_ID);
    }

    #[test]
    fn test_device_capability_stub() {
        let engine = LocalInferenceEngine::new();
        let capability = engine.check_device_capability();
        assert!(!capability.supported);
    }

    #[test]
    fn test_model_status() {
        let engine = LocalInferenceEngine::new();
        let status = engine.get_model_status();
        assert_eq!(status.status, LocalModelStatus::NotDownloaded);
    }

    #[test]
    fn test_build_prompt() {
        let engine = LocalInferenceEngine::new();
        let passage = Passage {
            id: "test".to_string(),
            source_id: "test_source".to_string(),
            reference: "Test 1:1".to_string(),
            text: "Test passage text".to_string(),
            context: None,
            resonance_context: None,
        };
        let symbol = Symbol {
            id: "test_symbol".to_string(),
            display_name: "Test Symbol".to_string(),
            flavor_text: None,
        };

        let prompt = engine.build_interpretation_prompt(
            &passage,
            &symbol,
            Some("Test situation"),
            Some("clarity"),
            "vi",
        );

        assert!(prompt.contains("Test Symbol"));
        assert!(prompt.contains("Test passage text"));
        assert!(prompt.contains("Test situation"));
    }
}
