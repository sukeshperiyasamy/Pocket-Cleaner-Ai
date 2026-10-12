import { AssistantResponse, PromptSuggestion } from '@/types';
import { MOCK_PROMPT_SUGGESTIONS } from '@/constants/mockData';
import { storageService } from './storageService';
import { memoryService } from './memoryService';
import { formatBytes } from '@/utils/formatters';

/**
 * ILLMProvider
 * Strategy interface to allow swapping between the Phase 1/2 rule-based provider
 * and future on-device local LLM engines (ExecuTorch / llama.cpp).
 */
export interface ILLMProvider {
  name: string;
  isReady(): boolean;
  generateResponse(prompt: string): Promise<AssistantResponse>;
}

/**
 * NativeAwareAssistantProvider
 * Provides contextual offline guidance grounded in real native measurements when available,
 * and clearly identifies simulated values when in sandbox fallback mode.
 */
export class NativeAwareAssistantProvider implements ILLMProvider {
  name = 'Rule-Based Offline Assistant';

  isReady(): boolean {
    return true;
  }

  async generateResponse(prompt: string): Promise<AssistantResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const normalized = prompt.toLowerCase().trim();
    const isNative = storageService.isNativeAvailable();

    if (normalized.includes('storage') && (normalized.includes('what') || normalized.includes('using'))) {
      try {
        const summary = await storageService.getStorageSummary();
        const isReal = !summary.isMock;

        const prefix = isReal
          ? '[REAL ANDROID STORAGE MEASUREMENT]'
          : '[SIMULATED STORAGE PREVIEW - EXPO GO FALLBACK]';

        return {
          text:
            `${prefix}\n\n` +
            `• Total Storage: ${formatBytes(summary.totalBytes)}\n` +
            `• In-Use Space: ${formatBytes(summary.usedBytes)}\n` +
            `• Available Free: ${formatBytes(summary.freeBytes)}\n\n` +
            (isReal
              ? `Inspected via Android StatFs at ${summary.storagePath || '/data'}. Tap below to view discoverable media files.`
              : 'Notice: Running in Expo Go sandbox. Build a custom development build to measure physical phone storage.'),
          isMock: summary.isMock,
          provider: this.name,
          disclaimer: isReal
            ? 'Measured live via Android native StatFs API.'
            : 'Simulated fixture data for Expo Go development preview.',
          suggestedAction: {
            label: 'Open Storage Explorer',
            route: '/storage',
          },
        };
      } catch {
        // Fallback
      }
    }

    if (normalized.includes('largest') || normalized.includes('large file')) {
      return {
        text:
          (isNative ? '[REAL MEDIASTORE INSPECTION]' : '[SIMULATED LARGE FILES]') +
          '\n\nTo discover large files, the app queries Android MediaStore (Videos, Images, Audio, and Downloads) without scanning private app directories.\n\nTap below to review currently accessible large files and check storage permissions.',
        isMock: !isNative,
        provider: this.name,
        disclaimer: isNative
          ? 'Live queries to MediaStore with size-based sorting.'
          : 'Sample fixtures shown in sandbox mode.',
        suggestedAction: {
          label: 'Inspect Large Files',
          route: '/storage',
        },
      };
    }

    if (normalized.includes('performance') || normalized.includes('ram') || normalized.includes('speed')) {
      try {
        const mem = await memoryService.getMemorySummary();
        const isReal = !mem.isMock;
        const prefix = isReal
          ? '[REAL ANDROID RAM TELEMETRY]'
          : '[SIMULATED RAM PREVIEW]';

        return {
          text:
            `${prefix}\n\n` +
            `• Total RAM: ${formatBytes(mem.totalBytes)}\n` +
            `• Available RAM: ${formatBytes(mem.availableBytes)}\n` +
            `• Used RAM: ${formatBytes(mem.usedBytes)} (${mem.pressurePercentage}% allocation)\n` +
            `• Low Memory State: ${mem.isLowMemory ? 'YES (High Pressure)' : 'No (Optimal)'}\n\n` +
            `Android Architectural Fact: Android intentionally keeps cached apps in RAM to prevent CPU relaunch spikes. You do NOT need to kill background processes.`,
          isMock: mem.isMock,
          provider: this.name,
          disclaimer: isReal
            ? 'Queried via Android ActivityManager.MemoryInfo.'
            : 'Simulated fixture data.',
          suggestedAction: {
            label: 'View Performance Insights',
            route: '/performance',
          },
        };
      } catch {
        // Fallback
      }
    }

    if (normalized.includes('free up') || normalized.includes('clean') || normalized.includes('safely')) {
      return {
        text:
          `Safe Cleanup Principles:\n` +
          `• Destructive file deletion is strictly disabled in this phase.\n` +
          `• In Phase 2, the app only performs non-destructive inspection of accessible media files.\n` +
          `• Safe candidates for review are downloaded duplicate archives and redundant 4K video clips.\n\n` +
          `Tap below to preview selected files safely.`,
        isMock: !isNative,
        provider: this.name,
        disclaimer: 'Non-destructive inspection policy. No files are deleted.',
        suggestedAction: {
          label: 'Open Storage Explorer',
          route: '/storage',
        },
      };
    }

    return {
      text:
        `You asked: "${prompt}"\n\n` +
        `I am your offline assistant. In Phase 2, I provide honest explanations of your storage and memory measurements.\n\n` +
        `Try tapping one of the suggested prompts below to inspect real device storage or RAM behavior!`,
      isMock: !isNative,
      provider: this.name,
      disclaimer: 'On-device rule engine. Local LLM will be integrated in Phase 3.',
    };
  }
}

export interface IAssistantService {
  sendAssistantMessage(message: string): Promise<AssistantResponse>;
  getSuggestedPrompts(): PromptSuggestion[];
  setProvider(provider: ILLMProvider): void;
}

export class AssistantService implements IAssistantService {
  private provider: ILLMProvider;

  constructor(provider: ILLMProvider = new NativeAwareAssistantProvider()) {
    this.provider = provider;
  }

  setProvider(provider: ILLMProvider): void {
    this.provider = provider;
  }

  async sendAssistantMessage(message: string): Promise<AssistantResponse> {
    return this.provider.generateResponse(message);
  }

  getSuggestedPrompts(): PromptSuggestion[] {
    return MOCK_PROMPT_SUGGESTIONS;
  }
}

export const assistantService: IAssistantService = new AssistantService();

export const sendAssistantMessage = (message: string): Promise<AssistantResponse> =>
  assistantService.sendAssistantMessage(message);
