import { AssistantResponse, PromptSuggestion } from '@/types';
import { MOCK_PROMPT_SUGGESTIONS } from '@/constants/mockData';

/**
 * ILLMProvider
 * Strategy interface to allow swapping between the Phase 1 Mock Provider
 * and future Phase 2 on-device LLM engines (e.g. ExecuTorch, llama.cpp, MediaPipe GenAI).
 */
export interface ILLMProvider {
  name: string;
  isReady(): boolean;
  generateResponse(prompt: string): Promise<AssistantResponse>;
}

/**
 * MockLLMProvider
 * Provides deterministic, informative offline responses for Phase 1.
 * Clearly labels all responses as mock simulations.
 */
export class MockLLMProvider implements ILLMProvider {
  name = 'Phase 1 Mock Rule-Based Engine';

  isReady(): boolean {
    return true;
  }

  async generateResponse(prompt: string): Promise<AssistantResponse> {
    // Simulate brief inference latency (200ms)
    await new Promise((resolve) => setTimeout(resolve, 200));

    const normalized = prompt.toLowerCase().trim();

    if (normalized.includes('storage') && (normalized.includes('what') || normalized.includes('using'))) {
      return {
        text:
          '[SIMULATED ASSISTANT RESPONSE]\n\nBased on your simulated storage scan:\n• Videos take up the largest portion: 34.2 GB across 42 files.\n• Images take up 24.8 GB across 1,420 photos.\n• Apps & app data consume 16.5 GB.\n• Downloads take up 8.2 GB.\n\nRecommendation: Reviewing your top 3 videos alone could potentially free up over 7.5 GB without touching system files.',
        isMock: true,
        provider: this.name,
        disclaimer: 'Data generated from sample mock profile for Phase 1 demonstration.',
        suggestedAction: {
          label: 'View Storage Explorer',
          route: '/storage',
        },
      };
    }

    if (normalized.includes('largest') || normalized.includes('large file')) {
      return {
        text:
          '[SIMULATED ASSISTANT RESPONSE]\n\nHere are the top simulated large files discovered on the device:\n1. Vacation_4K_Drone_Footage.mp4 (4.8 GB) in DCIM/Camera\n2. offline_maps_europe_bundle.obb (2.9 GB) in Android/obb [App Asset - Keep]\n3. Presentation_Keynote_Backup.zip (1.85 GB) in Download\n4. Old_Firmware_OTA_Package.zip (1.4 GB) in Download\n\nThe 2 zip packages in Downloads are safe candidates for review.',
        isMock: true,
        provider: this.name,
        disclaimer: 'File paths and sizes are simulated fixtures.',
        suggestedAction: {
          label: 'Inspect Large Files',
          route: '/storage',
        },
      };
    }

    if (normalized.includes('performance') || normalized.includes('ram') || normalized.includes('speed')) {
      return {
        text:
          '[SIMULATED ASSISTANT RESPONSE]\n\nAndroid Memory Truth:\nYour simulated RAM usage is 5.1 GB / 8.0 GB (64% pressure), which is completely normal and healthy. Android intentionally keeps apps in RAM to prevent battery-draining CPU relaunches.\n\nTo genuinely improve performance:\n1. Maintain at least 15% free storage for SSD wear leveling.\n2. Do NOT install third-party "RAM Boosters"—they drain battery by forcing Android to restart killed services.\n3. Remove apps with excessive background battery drain in Android Settings.',
        isMock: true,
        provider: this.name,
        disclaimer: 'Architectural guidance based on standard Android AOSP memory management.',
        suggestedAction: {
          label: 'View Performance Insights',
          route: '/performance',
        },
      };
    }

    if (normalized.includes('free up') || normalized.includes('clean') || normalized.includes('safely')) {
      return {
        text:
          '[SIMULATED ASSISTANT RESPONSE]\n\nSafe Cleanup Principles:\n• Never blindly delete system directories or app databases.\n• In this app, file deletion is strictly disabled during Phase 1.\n• When Phase 2 launches, you will always inspect and preview exact files before any non-destructive action is taken.\n\nTop safe candidates to review in the sample profile are obsolete zip downloads and long 4K screen recordings.',
        isMock: true,
        provider: this.name,
        disclaimer: 'Phase 1 MVP never deletes or modifies device storage.',
        suggestedAction: {
          label: 'Open Storage Explorer',
          route: '/storage',
        },
      };
    }

    // Default fallback response
    return {
      text:
        `[SIMULATED ASSISTANT RESPONSE]\n\nYou asked: "${prompt}"\n\nI am the Phase 1 offline assistant placeholder. In this phase, I provide guidance on storage breakdown, large files inspection, and Android memory management.\n\nTry tapping one of the suggested prompts below to test specific workflows!`,
      isMock: true,
      provider: this.name,
      disclaimer: 'Local mock response. On-device local LLM engine will be integrated in Phase 2.',
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

  constructor(provider: ILLMProvider = new MockLLMProvider()) {
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

// Standalone interface-matching function export as specified in requirements
export const sendAssistantMessage = (message: string): Promise<AssistantResponse> =>
  assistantService.sendAssistantMessage(message);
