# Local AI Models

This directory is for bundling AI models with the APK.

## Qwen3.5-2B LiteRT-LM

The local inference engine expects `Qwen3.5-2B-IT.litertlm` (LiteRT-LM format).

### Option 1: Bundle with APK (Not Recommended)

Place the model file here:
```
assets/models/Qwen3.5-2B-IT.litertlm
```

This will increase APK size by ~1.5GB.

### Option 2: Runtime Download (Recommended)

1. Upload model to GCS using the script:
   ```bash
   ./scripts/upload-model-to-gcs.sh /path/to/Qwen3.5-2B-IT.litertlm
   ```

2. Users download the model from Settings > Local AI

### Model Sources

- **Google AI Edge LiteRT-LM**: https://github.com/google-ai-edge/LiteRT-LM
- **HuggingFace**: `paulsp94/Qwen3.5-2B-LiteRT-LM`

### Format

Do not use MediaPipe `.task` files here. The Android runtime loads LiteRT-LM `.litertlm`
files through `com.google.ai.edge.litertlm:litertlm-android`.

### Version Tracking

Create `version.txt` alongside the model:
```
1.0.0
```
