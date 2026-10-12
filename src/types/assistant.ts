export type MessageSender = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  isMock: boolean;
  suggestedAction?: {
    label: string;
    route?: string;
  };
}

export interface PromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  category: 'storage' | 'performance' | 'cleanup' | 'general';
}

export interface AssistantResponse {
  text: string;
  isMock: boolean;
  provider: string;
  disclaimer: string;
  suggestedAction?: {
    label: string;
    route?: string;
  };
}
