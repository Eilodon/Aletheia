# Model Quantization Guide for Gemma 3n E2B

This document outlines options for reducing the model footprint through quantization, enabling deployment on devices with limited resources.

## Current Model Specifications

| Property | Value |
|----------|-------|
| Model | Gemma 3n E2B |
| Parameters | ~2B |
| Original Size | ~2GB (FP32) |
| Min RAM Required | 2GB |
| Target Devices | Mid-tier Android phones |

## Quantization Options

### 1. FP16 (16-bit Float)
- **Size Reduction**: 50% (~1GB)
- **Quality Loss**: Negligible
- **Speed**: Same or faster
- **Compatibility**: Most devices

```
Original: 2GB (FP32)
Quantized: 1GB (FP16)
```

### 2. INT8 (8-bit Integer)
- **Size Reduction**: 75% (~500MB)
- **Quality Loss**: Minimal (1-2% perplexity increase)
- **Speed**: 2-3x faster inference
- **Compatibility**: Requires INT8 SIMD support

```
Original: 2GB (FP32)
Quantized: 500MB (INT8)
```

### 3. INT4 (4-bit Integer)
- **Size Reduction**: 87.5% (~250MB)
- **Quality Loss**: Moderate (3-5% perplexity increase)
- **Speed**: 3-4x faster inference
- **Compatibility**: Good for low-end devices

```
Original: 2GB (FP32)
Quantized: 250MB (INT4)
```

### 4. Q4_K_M (4-bit with K-quantization)
- **Size Reduction**: ~85% (~300MB)
- **Quality Loss**: Low (2-3% perplexity increase)
- **Speed**: Fast
- **Compatibility**: llama.cpp format

## Recommended Quantization for Aletheia

### Primary: INT8 Quantized Model

**Rationale:**
- Best balance of size, quality, and speed
- Fits on devices with 1.5GB+ available RAM
- Minimal quality degradation for interpretation task
- Wide device compatibility

**Implementation:**
```bash
# Using llama.cpp for quantization
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# Convert to GGUF format
python convert-hf-to-gguf.py /path/to/gemma-3n-e2b --outfile gemma-3n-e2b-f16.gguf --outtype f16

# Quantize to INT8
./llama-quantize gemma-3n-e2b-f16.gguf gemma-3n-e2b-q8_0.gguf Q8_0
```

### Alternative: INT4 Quantized Model

For devices with <1.5GB RAM:
```bash
# Quantize to INT4
./llama-quantize gemma-3n-e2b-f16.gguf gemma-3n-e2b-q4_k_m.gguf Q4_K_M
```

## MediaPipe Model Conversion

MediaPipe requires `.task` format models. Convert from GGUF:

```bash
# Using MediaPipe model converter
pip install mediapipe-model-maker

# Convert GGUF to MediaPipe format
python -m mediapipe_model_maker \
  --input gemma-3n-e2b-q8_0.gguf \
  --output gemma-3n-e2b-q8_0.task \
  --format task
```

## Device Tier Recommendations

| Device Tier | RAM | Recommended Model |
|-------------|-----|-------------------|
| High-end | 4GB+ | FP16 (1GB) |
| Mid-tier | 2-4GB | INT8 (500MB) |
| Low-end | 1-2GB | INT4 (250MB) |
| Unsupported | <1GB | Cloud only |

## Quality Evaluation

Run evaluation against the interpretation eval dataset:

```bash
# Evaluate quantized model
pnpm test tests/interpretation-eval.test.ts --model=local --quantized=q8_0

# Compare with baseline
pnpm test tests/interpretation-eval.test.ts --model=cloud
```

### Acceptance Criteria

| Metric | FP16 | INT8 | INT4 |
|--------|------|------|------|
| Language Fidelity | >95% | >94% | >92% |
| Tone Fidelity | >90% | >88% | >85% |
| Non-advice Compliance | >98% | >98% | >97% |
| Ending Question | >95% | >94% | >92% |

## Storage on CDN

Upload multiple quantization variants:

```
gs://aletheia-models/gemma-3n-e2b/
  gemma-3n-e2b-f16.task      # 1GB - High-end devices
  gemma-3n-e2b-q8_0.task     # 500MB - Mid-tier (RECOMMENDED)
  gemma-3n-e2b-q4_k_m.task   # 250MB - Low-end
  version.json               # Metadata
```

## Dynamic Model Selection

The app should select the appropriate model based on device capability:

```kotlin
// In DeviceCapabilityDetector.kt
fun getRecommendedModelVariant(): String {
    return when {
        availableRamMb >= 3000 -> "f16"      // High-end
        availableRamMb >= 1500 -> "q8_0"     // Mid-tier
        availableRamMb >= 800 -> "q4_k_m"    // Low-end
        else -> "cloud"                      // Unsupported
    }
}
```

## Future Optimizations

1. **LoRA Adapters**: Fine-tune for Vietnamese interpretation task
2. **Speculative Decoding**: Faster inference with draft model
3. **KV Cache Quantization**: Reduce memory during inference
4. **Model Pruning**: Remove unused weights for task-specific model

## References

- [llama.cpp Quantization](https://github.com/ggerganov/llama.cpp#quantization)
- [MediaPipe LLM Inference](https://developers.google.com/mediapipe/solutions/genai/llm_inference)
- [Gemma Model Card](https://ai.google.dev/gemma)
