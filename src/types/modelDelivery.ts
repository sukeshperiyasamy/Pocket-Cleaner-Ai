/**
 * Types and interfaces for on-demand model delivery, checksum verification,
 * storage pre-flight validation, and attribution metadata.
 */

export type ModelDeliveryStage =
  | 'idle'
  | 'checking_storage'
  | 'downloading'
  | 'verifying_checksum'
  | 'installing'
  | 'ready'
  | 'error'
  | 'cancelled';

export interface PinnedModelArtifact {
  id: string;
  filename: string;
  displayName: string;
  expectedSizeBytes: number;
  requiredFreeStorageBytes: number;
  trustedSha256: string;
  sourceUrl: string;
  contextWindow: number;
  quantization: string;
  license: string;
  attribution: string;
  description: string;
  recommendedFor: string;
}

export interface ModelDownloadProgress {
  stage: ModelDeliveryStage;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  stageText: string;
  error?: string | null;
}

export interface ModelStorageCheckResult {
  hasSufficientSpace: boolean;
  availableFreeBytes: number;
  requiredFreeBytes: number;
  shortfallBytes: number;
}

export interface ModelInstallResult {
  success: boolean;
  filename: string;
  path: string;
  verifiedSha256: string;
  sizeBytes: number;
  error?: string;
}

export interface ModelDeliveryState {
  status: 'installed' | 'not_installed' | 'downloading' | 'verifying' | 'corrupted' | 'error';
  filename: string;
  artifact: PinnedModelArtifact;
  downloadProgress?: ModelDownloadProgress;
  errorMessage?: string | null;
}
