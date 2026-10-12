import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Badge } from '@/components/Badge';
import { MemorySummary } from '@/types';
import { formatBytes, formatPercentage } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface RamOverviewCardProps {
  summary: MemorySummary | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const RamOverviewCard: React.FC<RamOverviewCardProps> = ({
  summary,
  loading = false,
  error,
  onRefresh,
}) => {
  const theme = useTheme();

  if (loading && !summary) {
    return (
      <Card style={[styles.container, styles.centerCard]}>
        <ActivityIndicator size="small" color={theme.info} />
        <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.two }]}>
          Querying Android ActivityManager...
        </Text>
      </Card>
    );
  }

  if (error && !summary) {
    return (
      <Card style={styles.container}>
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.error} />
          <Text style={[Typography.labelMedium, { color: theme.error, flex: 1 }]}>
            {error}
          </Text>
        </View>
        {onRefresh && (
          <Pressable onPress={onRefresh} style={{ marginTop: Spacing.two }}>
            <Text style={[Typography.labelMedium, { color: theme.primary }]}>
              Tap to Retry
            </Text>
          </Pressable>
        )}
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card style={styles.container}>
        <Text style={[Typography.bodyMedium, { color: theme.textSecondary }]}>
          RAM telemetry unavailable.
        </Text>
      </Card>
    );
  }

  const used = summary.usedBytes ?? 0;
  const total = summary.totalBytes ?? 1;
  const available = summary.availableBytes ?? 0;
  const percentage = formatPercentage(used, total);
  const isReal = !summary.isMock;

  const getPressureBadge = () => {
    switch (summary.pressureLevel) {
      case 'critical':
        return { label: 'High Pressure', variant: 'error' as const };
      case 'moderate':
        return { label: 'Optimal / Moderate', variant: 'info' as const };
      default:
        return { label: 'Normal Pressure', variant: 'success' as const };
    }
  };

  const pressure = getPressureBadge();

  return (
    <Card style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: theme.infoContainer },
            ]}
          >
            <Ionicons name="speedometer-outline" size={20} color={theme.info} />
          </View>
          <View>
            <Text style={[Typography.h3, { color: theme.text }]}>Memory (RAM)</Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {summary.lastUpdated || 'Telemetry active'}
            </Text>
          </View>
        </View>
        <Badge
          label={isReal ? 'ActivityManager' : 'Expo Go Fallback'}
          variant={isReal ? 'success' : 'warning'}
          size="sm"
        />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Available</Text>
          <Text style={[Typography.h2, { color: theme.text }]}>
            {formatBytes(available)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>In-Use</Text>
          <Text style={[Typography.h2, { color: theme.text }]}>
            {formatBytes(used)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Total Installed</Text>
          <Text style={[Typography.h2, { color: theme.textSecondary }]}>
            {formatBytes(total)}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <View style={styles.badgeRow}>
            <Text style={[Typography.labelMedium, { color: theme.textSecondary }]}>
              RAM Allocation:
            </Text>
            <Badge label={pressure.label} variant={pressure.variant} size="sm" />
          </View>
          <Text style={[Typography.labelMedium, { color: theme.info }]}>
            {percentage}%
          </Text>
        </View>
        <ProgressBar percentage={percentage} height={10} color={theme.info} />
      </View>

      {summary.isLowMemory && (
        <View
          style={[
            styles.warningBox,
            { backgroundColor: theme.errorContainer },
          ]}
        >
          <Ionicons name="warning-outline" size={16} color={theme.onErrorContainer} />
          <Text
            style={[
              Typography.bodySmall,
              { color: theme.onErrorContainer, flex: 1 },
            ]}
          >
            System is in Low Memory condition. Kernel LMK is reclaiming cached pages.
          </Text>
        </View>
      )}

      <View
        style={[
          styles.noticeBox,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        <Ionicons name="shield-checkmark-outline" size={16} color={theme.success} />
        <Text
          style={[
            Typography.bodySmall,
            { color: theme.textSecondary, flex: 1 },
          ]}
        >
          Android automatically manages background tasks. No force-killing needed.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/performance')}
        style={({ pressed }) => [
          styles.actionRow,
          { borderTopColor: theme.borderSubtle },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="View performance details"
      >
        <Text style={[Typography.labelMedium, { color: theme.primary }]}>
          View Android Memory Architecture & Insights
        </Text>
        <Ionicons name="arrow-forward" size={16} color={theme.primary} />
      </Pressable>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
  },
  centerCard: {
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  metricItem: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginHorizontal: Spacing.two,
  },
  progressContainer: {
    marginVertical: Spacing.two,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Radius.sm,
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Radius.sm,
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
