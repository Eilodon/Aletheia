/**
 * Local AI Model Configuration
 * 
 * CDN hosting configuration for Gemma 3n E2B model files.
 * Models are hosted on Google Cloud Storage with versioning support.
 */

export const LOCAL_MODEL_CONFIG = {
  /** Model identifier */
  MODEL_ID: 'gemma-3n-e2b',
  
  /** Current supported model version */
  MODEL_VERSION: '1.0.0',
  
  /** CDN base URL for model files */
  CDN_BASE_URL: 'https://storage.googleapis.com/aletheia-models/gemma-3n-e2b',
  
  /** Model file paths */
  FILES: {
    /** Main model file (MediaPipe .task format) */
    MODEL: 'gemma-3n-e2b.task',
    
    /** Version info JSON */
    VERSION: 'version.json',
    
    /** Model checksum for verification */
    CHECKSUM: 'checksum.sha256',
  },
  
  /** Model requirements */
  REQUIREMENTS: {
    /** Minimum RAM in MB */
    MIN_RAM_MB: 2048,
    
    /** Minimum CPU cores */
    MIN_CPU_CORES: 4,
    
    /** Estimated model size in bytes (~2GB) */
    MODEL_SIZE_BYTES: 2_000_000_000,
    
    /** Estimated tokens per second on low-end device */
    ESTIMATED_TPS_LOW: 2.0,
    
    /** Estimated tokens per second on high-end device */
    ESTIMATED_TPS_HIGH: 10.0,
  },
  
  /** Inference parameters */
  INFERENCE: {
    /** Maximum tokens to generate */
    MAX_TOKENS: 1024,
    
    /** Top-K sampling */
    TOP_K: 40,
    
    /** Temperature for sampling */
    TEMPERATURE: 0.7,
    
    /** Random seed for reproducibility */
    RANDOM_SEED: 42,
  },
} as const;

/**
 * Get full URL for a model file
 */
export function getModelFileUrl(filename: string): string {
  return `${LOCAL_MODEL_CONFIG.CDN_BASE_URL}/${filename}`;
}

/**
 * Get model download URL
 */
export function getModelDownloadUrl(): string {
  return getModelFileUrl(LOCAL_MODEL_CONFIG.FILES.MODEL);
}

/**
 * Get version check URL
 */
export function getVersionCheckUrl(): string {
  return getModelFileUrl(LOCAL_MODEL_CONFIG.FILES.VERSION);
}

/**
 * Model version info returned from CDN
 */
export interface ModelVersionInfo {
  version: string;
  releaseDate: string;
  checksum: string;
  sizeBytes: number;
  minAppVersion: string;
  changelog?: string;
}

/**
 * Parse version info from CDN response
 */
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
