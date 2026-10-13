import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { ModelInfo, ModelStatus, ModelDownloadProgress } from '@/types';
import { formatBytes } from '@/utils/formatters';
import { Radius, Spacing } from '@/constants/theme';

export interface ModelControlBarProps {
  status: ModelStatus;
  modelInfo?: ModelInfo | null;
  loading: boolean;
  error?: string | null;
  onLoadModel: () => void;
  onUnloadModel: () => void;
  isGenerating?: boolean;
  generationStage?: 'idle' | 'retrieving_data' | 'generating' | 'cancelled' | 'failed';
  activeStageText?: string | null;
  onCancelGeneration?: () => void;
  // Model delivery additions
  isDownloading?: boolean;
  downloadProgress?: ModelDownloadProgress | null;
  onDownloadModel?: () => void;
  onCancelDownload?: () => void;
}

export const ModelControlBar: React.FC<ModelControlBarProps> = ({
  status,
  modelInfo,
  loading,
  error,
  onLoadModel,
  onUnloadModel,
  isGenerating = false,
  generationStage = 'idle',
  activeStageText,
  onCancelGeneration,
  isDownloading = false,
  downloadProgress,
  onDownloadModel,
  onCancelDownload,
}) => {
  const theme = useTheme();

  const getStatusBadge = () => {
    if (isDownloading) {
      const pct = downloadProgress?.percentage ?? 0;
      const stage = downloadProgress?.stage;
      if (stage === 'verifying_checksum') {
        return {
          label: 'VERIFYING CHECKSUM (SHA-256)',
          color: theme.info,
          bgColor: theme.surfaceSubtle,
          textColor: theme.primary,
          icon: 'shield-checkmark-outline' as const,
        };
      }
      return {
        label: `DOWNLOADING MODEL (${pct}%)`,
        color: theme.aiAccent,
        bgColor: theme.aiContainer,
        textColor: theme.onAiContainer,
        icon: 'cloud-download-outline' as const,
      };
    }

    if (generationStage === 'retrieving_data') {
      return {
        label: 'RETRIEVING DEVICE DATA',
        color: theme.info,
        bgColor: theme.surfaceSubtle,
        textColor: theme.primary,
        icon: 'file-tray-full-outline' as const,
      };
    }
    if (generationStage === 'generating') {
      return {
        label: 'GENERATING RESPONSE',
        color: theme.aiAccent,
        bgColor: theme.aiContainer,
        textColor: theme.onAiContainer,
        icon: 'sparkles' as const,
      };
    }
    if (generationStage === 'cancelled') {
      return {
        label: 'CANCELLED REQUEST',
        color: theme.warning,
        bgColor: theme.warningContainer,
        textColor: theme.onWarningContainer,
        icon: 'stop-circle-outline' as const,
      };
    }
    if (generationStage === 'failed') {
      return {
        label: 'FAILED REQUEST',
        color: theme.error,
        bgColor: theme.errorContainer,
        textColor: theme.onErrorContainer,
        icon: 'alert-circle-outline' as const,
      };
    }

    switch (status) {
      case 'loaded':
        return {
          label: 'LOCAL MODEL READY',
          color: theme.success,
          bgColor: theme.successContainer,
          textColor: theme.onSuccessContainer,
          icon: 'checkmark-circle-outline' as const,
        };
      case 'loading':
        return {
          label: 'MODEL LOADING',
          color: theme.warning,
          bgColor: theme.warningContainer,
          textColor: theme.onWarningContainer,
          icon: 'sync' as const,
        };
      case 'available':
        return {
          label: 'LOCAL MODEL READY (ON DISK)',
          color: theme.aiAccent,
          bgColor: theme.aiContainer,
          textColor: theme.onAiContainer,
          icon: 'download-outline' as const,
        };
      default:
        return {
          label: 'MODEL NOT INSTALLED',
          color: theme.textMuted,
          bgColor: theme.backgroundElement,
          textColor: theme.textSecondary,
          icon: 'cloud-download-outline' as const,
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: status === 'loaded' ? theme.aiAccent : theme.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.infoCol}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: badge.bgColor }]}>
              <Ionicons name={badge.icon} size={13} color={badge.textColor} />
              <Text style={[styles.badgeText, { color: badge.textColor }]}>
                {badge.label}
              </Text>
            </View>
            {status === 'loaded' && (
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {modelInfo?.quantization || 'Q4_K_M'} • {modelInfo?.contextWindow || 1024} ctx
              </Text>
            )}
          </View>

          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {isDownloading
              ? 'SmolLM2 360M Instruct (Q4_K_M)'
              : modelInfo?.modelName || (status === 'loaded' ? 'Local LLM' : 'SmolLM2 360M Instruct')}
          </Text>

          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {isDownloading
              ? downloadProgress?.stageText || 'Downloading model weights...'
              : status === 'loaded'
              ? 'Native llama.cpp background inference'
              : status === 'available'
              ? `${formatBytes(modelInfo?.sizeBytes || 0)} in app storage • Ready to load`
              : status === 'loading'
              ? 'Allocating context and mapping weights...'
              : 'On-demand install (~258 MB) • ~550 MB free required'}
          </Text>
        </View>

        <View style={styles.actionCol}>
          {isDownloading && onCancelDownload ? (
            <Pressable
              onPress={onCancelDownload}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.error },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel download"
            >
              <Ionicons name="stop" size={14} color="#FFFFFF" />
              <Text style={styles.actionBtnTextWhite}>Cancel</Text>
            </Pressable>
          ) : isGenerating && onCancelGeneration ? (
            <Pressable
              onPress={onCancelGeneration}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.error },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel generation"
            >
              <Ionicons name="stop" size={14} color="#FFFFFF" />
              <Text style={styles.actionBtnTextWhite}>Stop</Text>
            </Pressable>
          ) : status === 'loaded' ? (
            <Pressable
              onPress={onUnloadModel}
              disabled={loading}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, borderWidth: 1 },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Unload model"
            >
              <Ionicons name="power-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>Unload</Text>
            </Pressable>
          ) : status === 'available' ? (
            <Pressable
              onPress={onLoadModel}
              disabled={loading}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Load model"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="play" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnTextWhite}>Load</Text>
                </>
              )}
            </Pressable>
          ) : status === 'unavailable' && onDownloadModel ? (
            <Pressable
              onPress={onDownloadModel}
              disabled={loading || isDownloading}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Download model"
            >
              <Ionicons name="cloud-download" size={14} color="#FFFFFF" />
              <Text style={styles.actionBtnTextWhite}>Download</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Download Progress Bar */}
      {isDownloading && downloadProgress && (
        <View style={styles.progressBarWrapper}>
          <View style={[styles.progressBarTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: theme.aiAccent,
                  width: `${Math.min(100, Math.max(0, downloadProgress.percentage))}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {error && (
        <View style={[styles.errorRow, { backgroundColor: theme.errorContainer }]}>
          <Ionicons name="alert-circle-outline" size={14} color={theme.onErrorContainer} />
          <Text style={[styles.errorText, { color: theme.onErrorContainer }]}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginVertical: Spacing.two,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaText: {
    fontSize: 11,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnTextWhite: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressBarWrapper: {
    marginTop: Spacing.two,
  },
  progressBarTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
    padding: 6,
    borderRadius: Radius.sm,
    gap: 6,
  },
  errorText: {
    fontSize: 11,
    flex: 1,
  },
});
