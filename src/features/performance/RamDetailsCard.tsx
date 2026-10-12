import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MemorySummary } from '@/types';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Badge } from '@/components/Badge';
import { formatBytes, formatPercentage } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface RamDetailsCardProps {
  summary: MemorySummary | null;
}

export const RamDetailsCard: React.FC<RamDetailsCardProps> = ({ summary }) => {
  const theme = useTheme();

  const total = summary?.totalBytes ?? 1;
  const used = summary?.usedBytes ?? 0;
  const available = summary?.availableBytes ?? 0;
  const appUsage = summary?.appUsageBytes ?? 0;
  const percentage = formatPercentage(used, total);

  const getPressureConfig = () => {
    switch (summary?.pressureLevel) {
      case 'critical':
        return {
          label: 'Critical Pressure',
          variant: 'error' as const,
          color: theme.error,
          desc: 'High memory pressure. Android kernel LMK will reclaim cached background apps if needed.',
        };
      case 'moderate':
        return {
          label: 'Moderate Pressure',
          variant: 'info' as const,
          color: theme.info,
          desc: 'Healthy operating state. Modern Android keeps memory utilized for responsive app switching.',
        };
      default:
        return {
          label: 'Normal Pressure',
          variant: 'success' as const,
          color: theme.success,
          desc: 'Plenty of headroom. System has ample available and cached pages.',
        };
    }
  };

  const pressure = getPressureConfig();

  return (
    <Card style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: theme.infoContainer },
            ]}
          >
            <Ionicons name="hardware-chip-outline" size={20} color={theme.info} />
          </View>
          <View>
            <Text style={[Typography.h3, { color: theme.text }]}>
              System Memory (RAM)
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {summary?.lastUpdated || 'Telemetry'}
            </Text>
          </View>
        </View>
        <Badge
          label={summary?.isMock ? 'Expo Go Fallback' : 'ActivityManager'}
          variant={summary?.isMock ? 'warning' : 'success'}
          size="sm"
        />
      </View>

      {/* Primary Metrics Grid */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Available
          </Text>
          <Text style={[Typography.h2, { color: theme.text }]}>
            {formatBytes(available)}
          </Text>
          <Text style={[Typography.labelSmall, { color: theme.textMuted }]}>
            Free + Cached Pages
          </Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            In-Use
          </Text>
          <Text style={[Typography.h2, { color: theme.text }]}>
            {formatBytes(used)}
          </Text>
          <Text style={[Typography.labelSmall, { color: theme.textMuted }]}>
            Active OS & Services
          </Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Total RAM
          </Text>
          <Text style={[Typography.h2, { color: theme.textSecondary }]}>
            {formatBytes(total)}
          </Text>
          <Text style={[Typography.labelSmall, { color: theme.textMuted }]}>
            Hardware Capacity
          </Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Assistant App RAM
          </Text>
          <Text style={[Typography.h2, { color: theme.primary }]}>
            {formatBytes(appUsage)}
          </Text>
          <Text style={[Typography.labelSmall, { color: theme.textMuted }]}>
            Runtime Heap Usage
          </Text>
        </View>
      </View>

      {/* Kernel LMK Status Row */}
      {summary && (
        <View style={[styles.kernelRow, { backgroundColor: theme.surfaceSubtle }]}>
          <View style={styles.kernelMetric}>
            <Text style={[Typography.labelSmall, { color: theme.textMuted }]}>
              Kernel LMK Threshold
            </Text>
            <Text style={[Typography.labelMedium, { color: theme.text }]}>
              {summary.thresholdBytes ? formatBytes(summary.thresholdBytes) : 'N/A'}
            </Text>
          </View>
          <View style={styles.kernelDivider} />
          <View style={styles.kernelMetric}>
            <Text style={[Typography.labelSmall, { color: theme.textMuted }]}>
              Low Memory State
            </Text>
            <Text
              style={[
                Typography.labelMedium,
                { color: summary.isLowMemory ? theme.error : theme.success },
              ]}
            >
              {summary.isLowMemory ? 'Triggered (Critical)' : 'Normal (Optimal)'}
            </Text>
          </View>
        </View>
      )}

      {/* Progress & Pressure Level */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={[Typography.labelMedium, { color: theme.textSecondary }]}>
            Memory Allocation
          </Text>
          <View style={styles.pressureBadgeRow}>
            <Badge label={pressure.label} variant={pressure.variant} size="sm" />
            <Text style={[Typography.labelMedium, { color: pressure.color }]}>
              {percentage}%
            </Text>
          </View>
        </View>
        <ProgressBar percentage={percentage} height={10} color={pressure.color} />
      </View>

      <View
        style={[
          styles.pressureExplainer,
          { backgroundColor: theme.surfaceSubtle },
        ]}
      >
        <Ionicons name="information-circle-outline" size={16} color={theme.info} />
        <Text
          style={[
            Typography.bodySmall,
            { color: theme.textSecondary, flex: 1 },
          ]}
        >
          {pressure.desc}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginVertical: Spacing.two,
  },
  gridItem: {
    width: '47%',
    padding: Spacing.two,
  },
  progressSection: {
    marginVertical: Spacing.two,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  pressureBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressureExplainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  kernelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
  },
  kernelMetric: {
    alignItems: 'center',
  },
  kernelDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
});
