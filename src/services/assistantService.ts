import { AssistantResponse, PromptSuggestion } from '@/types';
import { MOCK_PROMPT_SUGGESTIONS } from '@/constants/mockData';
import { toolRegistry } from './toolRegistry';
import { resolveIntent } from './intentRouter';
import {
  buildGroundedPrompt,
  formatRuleBasedGroundedResponse,
} from './toolGrounding';

/**
 * ILLMProvider
 * Strategy interface to allow swapping between the rule-based provider
 * and the on-device local LLM engine (llama.cpp) with status callbacks.
 */
export interface ILLMProvider {
  name: string;
  isReady(): boolean;
  generateResponse(
    prompt: string,
    onStatusChange?: (status: string) => void
  ): Promise<AssistantResponse>;
}

/**
 * NativeAwareAssistantProvider
 * Provides deterministic, offline responses grounded in actual native hardware measurements.
 * Executes validated read-only tools and clearly notes data sources and boundaries.
 */
export class NativeAwareAssistantProvider implements ILLMProvider {
  name = 'Rule-Based Offline Assistant';

  isReady(): boolean {
    return true;
  }

  async generateResponse(
    prompt: string,
    onStatusChange?: (status: string) => void
  ): Promise<AssistantResponse> {
    onStatusChange?.('Analyzing request...');

    const resolution = resolveIntent(prompt);

    if (resolution.type === 'destructive_rejected') {
      return {
        text:
          `Operation Rejected: ${resolution.reason}\n\n` +
          `To safely review and confirm file deletions with preview safeguards, use Deep Cleanup.`,
        isMock: false,
        provider: this.name,
        disclaimer: 'Safety Guard: AI cannot delete or modify files directly.',
        suggestedAction: resolution.suggestedAction,
      };
    }

    if (resolution.type === 'unsupported_capability') {
      return {
        text:
          `Unsupported Capability: ${resolution.reason}\n\n` +
          `Alternative Guidance: ${resolution.recommendedAlternative}`,
        isMock: false,
        provider: this.name,
        disclaimer: 'System boundary enforcement.',
      };
    }

    if (resolution.type === 'system_navigation') {
      return {
        text: `System Navigation:\n\n${resolution.guidance}`,
        isMock: false,
        provider: this.name,
        disclaimer: 'System settings direction.',
        suggestedAction: {
          label: 'Open Storage Explorer',
          route: '/storage',
        },
      };
    }

    if (resolution.type === 'tool_execution') {
      onStatusChange?.('Retrieving device data...');
      const outcome = await toolRegistry.executeTool({
        toolName: resolution.toolName,
        parameters: resolution.parameters,
      });
      return formatRuleBasedGroundedResponse(prompt, outcome);
    }

    // Conversational fallback when no specific capability matches
    return {
      text:
        `I am your 100% offline AI phone assistant.\n\n` +
        `I can inspect real device storage and memory metrics using native Android APIs. Try asking:\n` +
        `• "What is using the most storage?"\n` +
        `• "Find videos larger than 500 MB."\n` +
        `• "Show my largest screenshots."\n` +
        `• "How much device RAM is available?"\n` +
        `• "Which accessible files could I review for cleanup?"\n\n` +
        `You can also load an on-device GGUF language model above for natural-language answers!`,
      isMock: false,
      provider: this.name,
      disclaimer: 'On-device rule engine. Load a local GGUF model for generative AI responses.',
    };
  }
}

/**
 * LocalLLMProvider
 * Generates responses using the on-device llama.cpp native inference bridge,
 * strictly grounded in real tool data retrieved from native Android APIs.
 */
export class LocalLLMProvider implements ILLMProvider {
  name = 'On-Device Local LLM (llama.cpp)';

  isReady(): boolean {
    return true;
  }

  async generateResponse(
    prompt: string,
    onStatusChange?: (status: string) => void
  ): Promise<AssistantResponse> {
    onStatusChange?.('Analyzing request...');
    const resolution = resolveIntent(prompt);

    // Fast-path safety refusals, unsupported operations, and navigation
    if (resolution.type === 'destructive_rejected') {
      return {
        text:
          `Operation Rejected: ${resolution.reason}\n\n` +
          `To safely review and confirm file deletions with preview safeguards, use Deep Cleanup.`,
        isMock: false,
        provider: this.name,
        disclaimer: 'Safety Guard: AI cannot delete or modify files directly.',
        suggestedAction: resolution.suggestedAction,
      };
    }

    if (resolution.type === 'unsupported_capability') {
      return {
        text:
          `Unsupported Capability: ${resolution.reason}\n\n` +
          `Alternative Guidance: ${resolution.recommendedAlternative}`,
        isMock: false,
        provider: this.name,
        disclaimer: 'System boundary enforcement.',
      };
    }

    if (resolution.type === 'system_navigation') {
      return {
        text: `System Navigation:\n\n${resolution.guidance}`,
        isMock: false,
        provider: this.name,
        disclaimer: 'System settings direction.',
        suggestedAction: {
          label: 'Open Storage Explorer',
          route: '/storage',
        },
      };
    }

    let outcome = null;
    if (resolution.type === 'tool_execution') {
      onStatusChange?.('Retrieving device data...');
      outcome = await toolRegistry.executeTool({
        toolName: resolution.toolName,
        parameters: resolution.parameters,
      });
    }

    // Build grounded prompt with strict factual boundaries
    onStatusChange?.('Generating response...');
    const groundedPrompt = buildGroundedPrompt(prompt, outcome);

    const { localLLMService } = await import('./localLLMService');
    const result = await localLLMService.generateResponse(groundedPrompt, {
      maxTokens: 256,
      temperature: 0.2, // Lower temperature to minimize hallucination
      topP: 0.85,
    });

    let suggestedAction = undefined;
    if (outcome && outcome.success) {
      switch (outcome.result.toolName) {
        case 'get_storage_summary':
        case 'get_storage_categories':
        case 'find_large_files':
        case 'search_accessible_files':
          suggestedAction = {
            label: 'Open Storage Explorer',
            route: '/storage',
          };
          break;
        case 'find_screenshots':
        case 'find_screen_recordings':
          suggestedAction = {
            label: 'Open Deep Cleanup',
            route: '/deep-cleanup',
          };
          break;
        case 'get_memory_summary':
          suggestedAction = {
            label: 'View Performance',
            route: '/performance',
          };
          break;
      }
    }

    return {
      text: result.text || 'No response generated.',
      isMock: Boolean(outcome && outcome.success && outcome.result.isMock),
      provider: `${this.name} [${result.modelName}]`,
      disclaimer: `Generated on-device in ${result.durationMs}ms (${result.tokensPerSecond} t/s). 100% offline. Grounded in actual device telemetry.`,
      suggestedAction,
    };
  }
}

export interface IAssistantService {
  sendAssistantMessage(
    message: string,
    onStatusChange?: (status: string) => void
  ): Promise<AssistantResponse>;
  getSuggestedPrompts(): PromptSuggestion[];
  setProvider(provider: ILLMProvider): void;
  getProvider(): ILLMProvider;
}

export class AssistantService implements IAssistantService {
  private provider: ILLMProvider;
  private fallbackProvider: ILLMProvider;
  private localLLMProvider: ILLMProvider;

  constructor(provider?: ILLMProvider) {
    this.fallbackProvider = new NativeAwareAssistantProvider();
    this.localLLMProvider = new LocalLLMProvider();
    this.provider = provider || this.fallbackProvider;
  }

  setProvider(provider: ILLMProvider): void {
    this.provider = provider;
  }

  getProvider(): ILLMProvider {
    return this.provider;
  }

  async sendAssistantMessage(
    message: string,
    onStatusChange?: (status: string) => void
  ): Promise<AssistantResponse> {
    const { localLLMService } = await import('./localLLMService');
    const statusResult = await localLLMService.getModelStatus();

    // If a local GGUF model is loaded, route via LocalLLMProvider
    if (statusResult.status === 'loaded') {
      try {
        return await this.localLLMProvider.generateResponse(message, onStatusChange);
      } catch (err) {
        // If user cancelled, rethrow so caller handles cancellation
        if (String(err).toLowerCase().includes('cancel')) {
          throw err;
        }
        // Graceful fallback to rule-based engine on local generation failure
        return this.fallbackProvider.generateResponse(message, onStatusChange);
      }
    }

    return this.provider.generateResponse(message, onStatusChange);
  }

  getSuggestedPrompts(): PromptSuggestion[] {
    return MOCK_PROMPT_SUGGESTIONS;
  }
}

export const assistantService: IAssistantService = new AssistantService();

export const sendAssistantMessage = (
  message: string,
  onStatusChange?: (status: string) => void
): Promise<AssistantResponse> =>
  assistantService.sendAssistantMessage(message, onStatusChange);
