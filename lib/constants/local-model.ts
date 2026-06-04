/**
 * Local AI Model Configuration — Qwen3.5-2B (LiteRT-LM format)
 * CDN: GCS storage.googleapis.com/aletheia-models/qwen3.5-2b/
 * Source model: paulsp94/Qwen3.5-2B-LiteRT-LM (HuggingFace)
 * MODEL_SIZE_BYTES: verify against HF model card before beta release.
 */
export const LOCAL_MODEL_CONFIG = {
  MODEL_ID: 'qwen3.5-2b-instruct',
  MODEL_VERSION: '1.0.0',
  CDN_BASE_URL: 'https://storage.googleapis.com/aletheia-models/qwen3.5-2b',
  FILES: {
    MODEL: 'Qwen3.5-2B-IT.litertlm',
    VERSION: 'version.json',
    CHECKSUM: 'checksum.sha256',
  },
  REQUIREMENTS: {
    MIN_RAM_MB: 3072,
    MIN_CPU_CORES: 4,
    MODEL_SIZE_BYTES: 1_500_000_000,   // ~1.5GB — VERIFY from paulsp94/Qwen3.5-2B-LiteRT-LM HF card
    ESTIMATED_TPS_LOW: 5.0,
    ESTIMATED_TPS_HIGH: 20.0,
  },
  INFERENCE: {
    MAX_TOKENS: 512,
    TOP_K: 40,
    TEMPERATURE: 0.7,
    THINKING_ENABLED: true,
  },
} as const;

export function getModelFileUrl(filename: string): string {
  return `${LOCAL_MODEL_CONFIG.CDN_BASE_URL}/${filename}`;
}

export function getModelDownloadUrl(): string {
  return getModelFileUrl(LOCAL_MODEL_CONFIG.FILES.MODEL);
}

export function getVersionCheckUrl(): string {
  return getModelFileUrl(LOCAL_MODEL_CONFIG.FILES.VERSION);
}

export interface ModelVersionInfo {
  version: string;
  releaseDate: string;
  checksum: string;
  sizeBytes: number;
  minAppVersion: string;
  changelog?: string;
}

export function parseVersionInfo(json: string): ModelVersionInfo | null {
  try {
    const data = JSON.parse(json);
    return {
      version: data.version ?? '0.0.0',
      releaseDate: data.releaseDate ?? data.release_date ?? '',
      checksum: data.checksum ?? '',
      sizeBytes: data.sizeBytes ?? data.size_bytes ?? 0,
      minAppVersion: data.minAppVersion ?? data.min_app_version ?? '0.0.0',
      changelog: data.changelog,
    };
  } catch {
    return null;
  }
}
