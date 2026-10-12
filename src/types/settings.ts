export type LocalAIStatusType = 'not_installed' | 'downloading' | 'ready' | 'unsupported';

export interface LocalAIModelInfo {
  name: string;
  architecture: string;
  quantization: string;
  status: LocalAIStatusType;
  modelSizeBytes: number;
  minRamBytes: number;
  executionProvider: string;
  isMock: boolean;
}

export interface AppMetadata {
  name: string;
  version: string;
  buildNumber: string;
  license: string;
  repoUrl: string;
  privacyHighlights: string[];
}
