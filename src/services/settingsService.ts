import { LocalAIModelInfo, AppMetadata } from '@/types';
import { MOCK_LOCAL_AI_STATUS, APP_METADATA } from '@/constants/mockData';

export interface ISettingsService {
  getLocalAIStatus(): Promise<LocalAIModelInfo>;
  getAppMetadata(): AppMetadata;
}

export class SettingsService implements ISettingsService {
  async getLocalAIStatus(): Promise<LocalAIModelInfo> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return MOCK_LOCAL_AI_STATUS;
  }

  getAppMetadata(): AppMetadata {
    return APP_METADATA;
  }
}

export const settingsService: ISettingsService = new SettingsService();
