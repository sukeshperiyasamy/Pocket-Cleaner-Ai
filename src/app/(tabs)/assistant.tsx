import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/Header';
import { DataSourceIndicator } from '@/components/DataSourceIndicator';
import { ChatMessageItem } from '@/features/assistant/ChatMessageItem';
import { PromptChips } from '@/features/assistant/PromptChips';
import { ChatInputBar } from '@/features/assistant/ChatInputBar';
import { ModelControlBar } from '@/features/assistant/ModelControlBar';
import {
  assistantService,
  sendAssistantMessage,
  storageService,
  localLLMService,
  modelDeliveryService,
  DEFAULT_DELIVERY_MODEL,
} from '@/services';
import { ChatMessage, PromptSuggestion, ModelStatus, ModelInfo, ModelDownloadProgress } from '@/types';
import { MOCK_INITIAL_MESSAGES } from '@/constants/mockData';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function AssistantScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ initialPrompt?: string; testPrompt?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_INITIAL_MESSAGES);
  const [suggestions] = useState<PromptSuggestion[]>(() =>
    assistantService.getSuggestedPrompts()
  );
  const [sending, setSending] = useState(false);
  const [generationStage, setGenerationStage] = useState<'idle' | 'retrieving_data' | 'generating' | 'cancelled' | 'failed'>('idle');
  const [stageText, setStageText] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('unavailable');
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const lastPromptRef = useRef<string | null>(null);

  const refreshModelStatus = useCallback(async () => {
    try {
      const res = await localLLMService.getModelStatus();
      setModelStatus(res.status);
      setModelInfo(res.modelInfo || null);
      setModelError(res.error || null);
    } catch (err) {
      setModelStatus('error');
      setModelError(String(err));
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    const init = async () => {
      try {
        const res = await localLLMService.getModelStatus();
        if (isSubscribed) {
          setModelStatus(res.status);
          setModelInfo(res.modelInfo || null);
          setModelError(res.error || null);
        }
      } catch (err) {
        if (isSubscribed) {
          setModelStatus('error');
          setModelError(String(err));
        }
      }
    };
    void init();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Screen blur / unmount lifecycle: cancel any running inference
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      localLLMService.cancelInference();
      setSending(false);
      setGenerationStage('idle');
      setStageText(null);
    });
    return () => {
      unsubscribe();
      localLLMService.cancelInference();
    };
  }, [navigation]);

  const handleLoadModel = async () => {
    setModelLoading(true);
    setModelError(null);
    try {
      const res = await localLLMService.loadModel();
      setModelStatus(res.status);
      setModelInfo(res.modelInfo || null);
      if (res.error) {
        setModelError(res.error);
      }
    } catch (err) {
      setModelStatus('error');
      setModelError(String(err));
    } finally {
      setModelLoading(false);
    }
  };

  const handleUnloadModel = async () => {
    setModelLoading(true);
    try {
      await localLLMService.unloadModel();
      await refreshModelStatus();
    } catch (err) {
      setModelError(String(err));
    } finally {
      setModelLoading(false);
    }
  };

  const handleCancelGeneration = async () => {
    await localLLMService.cancelInference();
    setSending(false);
    setGenerationStage('cancelled');
    setStageText('Cancelled request');
    setTimeout(() => {
      setGenerationStage('idle');
      setStageText(null);
    }, 2500);
  };

  const handleDownloadModel = async () => {
    setIsDownloading(true);
    setModelError(null);
    try {
      await modelDeliveryService.downloadAndInstallModel(
        DEFAULT_DELIVERY_MODEL,
        (progress) => {
          setDownloadProgress(progress);
        }
      );
      setDownloadProgress(null);
      await refreshModelStatus();
    } catch (err) {
      setModelError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCancelDownload = async () => {
    await modelDeliveryService.cancelDownload();
    setIsDownloading(false);
    setDownloadProgress(null);
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: 'Just now',
      isMock: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    setGenerationStage('retrieving_data');
    setStageText('Retrieving device data...');

    try {
      const response = await sendAssistantMessage(text.trim(), (statusMsg) => {
        if (statusMsg.includes('Retrieving')) {
          setGenerationStage('retrieving_data');
          setStageText('Retrieving device data...');
        } else if (statusMsg.includes('Generating')) {
          setGenerationStage('generating');
          setStageText('Generating response...');
        }
      });

      const assistantMessage: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: response.text,
        timestamp: 'Just now',
        isMock: response.isMock,
        suggestedAction: response.suggestedAction,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setGenerationStage('idle');
      setStageText(null);
    } catch (err) {
      const isCancelled = String(err).toLowerCase().includes('cancel');
      if (isCancelled) {
        setGenerationStage('cancelled');
        setStageText('Cancelled request');
        setTimeout(() => {
          setGenerationStage('idle');
          setStageText(null);
        }, 2500);
      } else {
        setGenerationStage('failed');
        setStageText('Failed request');
        setTimeout(() => {
          setGenerationStage('idle');
          setStageText(null);
        }, 3000);

        const errorMessage: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Error processing your query with the assistant. Please try again.',
          timestamp: 'Just now',
          isMock: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setSending(false);
    }
  }, [sending]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (params.testPrompt && params.testPrompt !== lastPromptRef.current) {
      lastPromptRef.current = params.testPrompt;
      const promptToRun = params.testPrompt;
      const t = setTimeout(() => {
        void handleSendMessage(promptToRun);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [params.testPrompt, handleSendMessage]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.container}>
          {/* Header & Controls */}
          <View style={styles.headerWrapper}>
            <Header
              title="AI Assistant"
              subtitle={
                modelStatus === 'loaded'
                  ? `llama.cpp native inference (${modelInfo?.modelName || 'SmolLM2'})`
                  : modelStatus === 'available'
                  ? 'Rule-based offline assistant • Model ready'
                  : 'Rule-based offline assistant'
              }
              badgeText={
                modelStatus === 'loaded'
                  ? 'ON-DEVICE LLM (OFFLINE)'
                  : storageService.isNativeAvailable()
                  ? 'LIVE DEVICE DATA'
                  : 'SIMULATED DATA'
              }
              badgeVariant={
                modelStatus === 'loaded'
                  ? 'info'
                  : storageService.isNativeAvailable()
                  ? 'success'
                  : 'warning'
              }
            />

            <ModelControlBar
              status={modelStatus}
              modelInfo={modelInfo}
              loading={modelLoading}
              error={modelError}
              onLoadModel={handleLoadModel}
              onUnloadModel={handleUnloadModel}
              isGenerating={sending}
              generationStage={generationStage}
              activeStageText={stageText}
              onCancelGeneration={handleCancelGeneration}
              isDownloading={isDownloading}
              downloadProgress={downloadProgress}
              onDownloadModel={handleDownloadModel}
              onCancelDownload={handleCancelDownload}
            />

            <DataSourceIndicator
              status={modelStatus === 'loaded' ? 'live' : storageService.isNativeAvailable() ? 'live' : 'simulated'}
              sourceName={
                modelStatus === 'loaded'
                  ? `Local llama.cpp Engine (${modelInfo?.filename || 'SmolLM2'})`
                  : 'Offline Rule Engine (Ground-truth native metrics)'
              }
              customLiveMessage={
                modelStatus === 'loaded'
                  ? 'Responses generated on-device via native llama.cpp ARMv8.2 dotprod kernels with zero cloud connectivity.'
                  : 'Assistant responses are grounded in real Android hardware telemetry (StatFs & ActivityManager).'
              }
              customSimulatedMessage="Assistant responses operate on simulated fixtures in Expo Go sandbox."
            />
          </View>

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatMessageItem message={item} />}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />

          {/* Suggested Prompts Bar */}
          <View style={styles.promptsWrapper}>
            <PromptChips
              suggestions={suggestions}
              onSelectPrompt={handleSendMessage}
              disabled={sending || modelLoading}
            />
          </View>

          {/* Input Bar */}
          <ChatInputBar
            onSend={handleSendMessage}
            loading={sending}
            onCancel={handleCancelGeneration}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  headerWrapper: {
    paddingHorizontal: Spacing.four,
  },
  messagesList: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  promptsWrapper: {
    paddingHorizontal: Spacing.four,
  },
});
