# Local AI Models

This directory is for bundling AI models with the APK.

## Gemma 3n E2B

The local inference engine expects `gemma-3n-e2b.task` (MediaPipe format).

### Option 1: Bundle with APK (Not Recommended)

Place the model file here:
```
assets/models/gemma-3n-e2b.task
```

This will increase APK size by ~2GB.

### Option 2: Runtime Download (Recommended)

1. Upload model to GCS using the script:
   ```bash
   ./scripts/upload-model-to-gcs.sh /path/to/gemma-3n-e2b.task
   ```

2. Users download the model from Settings > Local AI

### Model Sources

- **Google AI Edge**: https://ai.google.dev/edge
- **HuggingFace**: Convert from GGUF to MediaPipe format

### Format Conversion

If you have a GGUF model, convert it to MediaPipe format:
```bash
# Using MediaPipe's conversion tool
python -m mediapipe.tasks.python.text.llm_converter \
  --input_model model.gguf \
  --output_model gemma-3n-e2b.task
```

### Version Tracking

Create `version.txt` alongside the model:
```
1.0.0
```
