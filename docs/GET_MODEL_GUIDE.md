# Hướng dẫn lấy và upload model Gemma 3n E2B

## Bước 1: Download model từ HuggingFace

Gemma 3n E2B là model ~2GB, optimized cho on-device inference.

```bash
# Cần install git-lfs trước
git lfs install

# Clone model repository
git clone https://huggingface.co/google/gemma-3n-E2B-it-litert-lm

# Hoặc download trực tiếp bằng wget/curl
wget https://huggingface.co/google/gemma-3n-E2B-it-litert-lm/resolve/main/gemma-3n-E2B-it-litert-lm.task
```

**Lưu ý:** Model này yêu cầu accept license trên HuggingFace trước khi download.

## Bước 2: Rename file

```bash
mv gemma-3n-E2B-it-litert-lm.task gemma-3n-e2b.task
```

## Bước 3: Upload lên Google Cloud Storage

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Chạy script upload
./scripts/upload-model-to-gcs.sh /path/to/gemma-3n-e2b.task 1.0.0
```

Hoặc upload thủ công:

```bash
# Tạo bucket (nếu chưa có)
gsutil mb -l asia-southeast1 gs://aletheia-models

# Upload model
gsutil cp gemma-3n-e2b.task gs://aletheia-models/gemma-3n-e2b/

# Upload version info
echo '{"version": "1.0.0", "size_bytes": 2147483648}' > version.json
gsutil cp version.json gs://aletheia-models/gemma-3n-e2b/

# Set public access (nếu cần)
gsutil iam ch allUsers:objectViewer gs://aletheia-models
```

## Alternative: Sử dụng model khác

Nếu Gemma 3n E2B không available, có thể dùng:

1. **Gemma 2B**: Nhẹ hơn nhưng chất lượng thấp hơn
2. **Phi-2**: 2.7B parameters
3. **TinyLlama**: 1.1B parameters, rất nhẹ

Cần convert model sang định dạng `.task` của MediaPipe:

```bash
# Sử dụng MediaPipe converter
# (Xem documentation: https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference)
```

## Kiểm tra sau khi upload

```bash
# Kiểm tra file tồn tại
gsutil ls gs://aletheia-models/gemma-3n-e2b/

# Test download URL
curl -I https://storage.googleapis.com/aletheia-models/gemma-3n-e2b/gemma-3n-e2b.task
```

## Build và test

```bash
# Build app
pnpm android

# Trong app:
# 1. Settings > Local AI > Download Model
# 2. Đợi download xong
# 3. Thực hiện reading và request AI interpretation
```
