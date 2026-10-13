import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { DataSourceStatus } from '@/types';

export interface DataSourceIndicatorProps {
  status: DataSourceStatus;
  sourceName?: string;
  timestamp?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  customLiveMessage?: string;
  customSimulatedMessage?: string;
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
  status,
  sourceName,
  timestamp,
  errorMessage,
  onRetry,
  style,
  customLiveMessage,
  customSimulatedMessage,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const config = {
    live: {
      label: 'LIVE DEVICE DATA',
      icon: 'checkmark-circle' as const,
      bg: theme.successContainer,
      border: theme.success,
      text: theme.onSuccessContainer,
      summary: customLiveMessage || (sourceName
        ? `Live telemetry connected via native ${sourceName.startsWith('Android') ? sourceName : `Android ${sourceName}`}.`
        : 'Live telemetry connected via native Android DeviceMetrics module.'),
      detail:
        'Measurements are queried directly from Android OS APIs (StatFs, ActivityManager, MediaStore). No cloud telemetry is transmitted; all operations run 100% on-device.',
    },
    simulated: {
      label: 'SIMULATED DATA',
      icon: 'flask-outline' as const,
      bg: theme.warningContainer,
      border: theme.warning,
      text: theme.onWarningContainer,
      summary: customSimulatedMessage || (sourceName
        ? `Running in simulated fallback mode for ${sourceName}.`
        : 'Running in simulated fallback mode (Expo Go sandbox or unlinked build).'),
      detail:
        'Values displayed on this screen are realistic mock fixtures. To inspect live hardware metrics and MediaStore files, launch the custom Expo development build on a physical Android device.',
    },
    unavailable: {
      label: 'UNAVAILABLE',
      icon: 'alert-circle-outline' as const,
      bg: theme.errorContainer,
      border: theme.error,
      text: theme.onErrorContainer,
      summary: errorMessage
        ? `Native query failed: ${errorMessage}`
        : 'The native Android module call failed and no valid live result exists.',
      detail:
        'Fallback or cached sample data is strictly never labeled as live. Inspect native exceptions, JSI interop, and media permissions in Settings → Native Diagnostics.',
    },
  }[status] || {
    label: 'SIMULATED DATA',
    icon: 'flask-outline' as const,
    bg: theme.warningContainer,
    border: theme.warning,
    text: theme.onWarningContainer,
    summary: 'Running in simulated mode.',
    detail: 'Fallback data active.',
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
    >
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.headerRow}
        accessibilityRole="button"
        accessibilityLabel={`Data source status: ${config.label}. Tap to toggle details.`}
      >
        <Ionicons name={config.icon} size={18} color={config.text} style={styles.icon} />
        <View style={styles.titleContainer}>
          <Text style={[Typography.labelMedium, styles.labelText, { color: config.text }]}>
            {config.label}
          </Text>
          {timestamp ? (
            <Text style={[Typography.labelSmall, { color: config.text, opacity: 0.85 }]}>
              • {timestamp}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={config.text}
        />
      </Pressable>

      <Text style={[Typography.bodySmall, styles.summaryText, { color: config.text }]}>
        {config.summary}
      </Text>

      {expanded && (
        <View style={[styles.expandedContent, { borderTopColor: config.border }]}>
          <Text style={[Typography.bodySmall, { color: config.text, marginBottom: Spacing.two }]}>
            {config.detail}
          </Text>

          {errorMessage && status === 'unavailable' ? (
            <View style={[styles.errorDetail, { backgroundColor: theme.surface }]}>
              <Text style={[Typography.labelSmall, { color: theme.error }]}>
                Error details: {errorMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {onRetry && (status === 'unavailable' || status === 'simulated') ? (
              <Pressable
                onPress={onRetry}
                style={[styles.actionBtn, { borderColor: config.text }]}
                accessibilityRole="button"
                accessibilityLabel="Retry native query"
              >
                <Ionicons name="refresh-outline" size={14} color={config.text} />
                <Text style={[Typography.labelSmall, { color: config.text, marginLeft: 4 }]}>
                  Retry Live Query
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => router.push('/settings')}
              style={[styles.actionBtn, { borderColor: config.text, marginLeft: Spacing.two }]}
              accessibilityRole="button"
              accessibilityLabel="Open native diagnostics in settings"
            >
              <Ionicons name="hardware-chip-outline" size={14} color={config.text} />
              <Text style={[Typography.labelSmall, { color: config.text, marginLeft: 4 }]}>
                View Diagnostics
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: Spacing.two,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  labelText: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryText: {
    marginTop: 4,
    lineHeight: 18,
  },
  expandedContent: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  errorDetail: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginBottom: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
});
