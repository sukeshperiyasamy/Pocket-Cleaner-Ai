/**
 * Types and interfaces for on-device Local LLM inference and model lifecycle management.
 */

export type ModelStatus =
  | 'unavailable' // No model file found in app directory
  | 'available'   // Model file found on disk, ready to load
  | 'loading'     // Model weights currently being loaded into memory
  | 'loaded'      // Model loaded and active in native runtime
  | 'error';      // Failed to load or unrecoverable native error

export interface ModelInfo {
  filename: string;
  modelName: string;
  path: string;
  sizeBytes: number;
  contextWindow: number;
  quantization: string;
  isAvailable: boolean;
}

export interface ModelStatusResult {
  status: ModelStatus;
  modelInfo?: ModelInfo;
  error?: string;
  isNativeAvailable: boolean;
}

export interface InferenceOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  onToken?: (token: string) => void;
}

export interface InferenceResult {
  text: string;
  tokensGenerated: number;
  durationMs: number;
  tokensPerSecond: number;
  isCancelled: boolean;
  modelName: string;
}

export interface ModelLoadOptions {
  modelFilename?: string;
  nCtx?: number;
  nThreads?: number;
  onProgress?: (progress: number) => void;
}
