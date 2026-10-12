import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Badge } from '@/components/Badge';
import { StorageSummary } from '@/types';
import { formatBytes, formatPercentage } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface StorageOverviewCardProps {
  summary: StorageSummary | null;
  loading?: boolean;
}

export const StorageOverviewCard: React.FC<StorageOverviewCardProps> = ({
  summary,
  loading = false,
}) => {
  const theme = useTheme();

  if (!summary && !loading) {
    return (
      <Card style={styles.container}>
        <Text style={[Typography.bodyMedium, { color: theme.textSecondary }]}>
          Storage information unavailable.
        </Text>
      </Card>
    );
  }

  const used = summary?.usedBytes ?? 0;
  const total = summary?.totalBytes ?? 1;
  const free = summary?.freeBytes ?? 0;
  const percentage = formatPercentage(used, total);

  return (
    <Card style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: theme.primaryContainer },
            ]}
          >
            <Ionicons name="hardware-chip-outline" size={20} color={theme.primary} />
          </View>
          <View>
            <Text style={[Typography.h3, { color: theme.text }]}>Device Storage</Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {summary?.lastScanTimestamp ? `Scanned ${summary.lastScanTimestamp}` : 'Ready for scan'}
            </Text>
          </View>
        </View>
        <Badge label="Mock Data" variant="warning" size="sm" />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Used</Text>
          <Text style={[Typography.h2, { color: theme.text }]}>
            {formatBytes(used)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Free</Text>
          <Text style={[Typography.h2, { color: theme.success }]}>
            {formatBytes(free)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Total</Text>
          <Text style={[Typography.h2, { color: theme.textSecondary }]}>
            {formatBytes(total)}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={[Typography.labelMedium, { color: theme.textSecondary }]}>
            Capacity Utilized
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.primary }]}>
            {percentage}%
          </Text>
        </View>
        <ProgressBar percentage={percentage} height={10} color={theme.primary} />
      </View>

      {/* Category breakdown pills */}
      <View style={styles.categoriesGrid}>
        {summary?.categories.slice(0, 4).map((cat) => (
          <View
            key={cat.category}
            style={[
              styles.catChip,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: cat.color }]} />
            <Text
              style={[
                Typography.labelSmall,
                { color: theme.textSecondary, flexShrink: 1 },
              ]}
              numberOfLines={1}
            >
              {cat.name}: {formatBytes(cat.sizeBytes)}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/storage')}
        style={({ pressed }) => [
          styles.actionRow,
          { borderTopColor: theme.borderSubtle },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Explore storage breakdown"
      >
        <Text style={[Typography.labelMedium, { color: theme.primary }]}>
          Explore All Categories & Files
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
    marginVertical: Spacing.three,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
