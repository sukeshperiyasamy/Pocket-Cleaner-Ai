import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategorySummaryInfo } from '@/types/storageAnalysis';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Badge } from '@/components/Badge';

interface DeepCleanupCategoryCardProps {
  summary: CategorySummaryInfo;
  isSelected: boolean;
  onSelect: () => void;
}

const DeepCleanupCategoryCardComponent: React.FC<DeepCleanupCategoryCardProps> = ({
  summary,
  isSelected,
  onSelect,
}) => {
  const theme = useTheme();

  const getRiskVariant = (risk: 'low' | 'medium' | 'high'): 'success' | 'warning' | 'error' => {
    switch (risk) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
    }
  };

  const getRiskLabel = (risk: 'low' | 'medium' | 'high'): string => {
    switch (risk) {
      case 'low':
        return 'Low Risk';
      case 'medium':
        return 'Review';
      case 'high':
        return 'Caution';
    }
  };

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isSelected ? theme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
        },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${summary.title}, ${summary.count} items, ${formatBytes(summary.totalSizeBytes)}`}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${summary.color}20` }]}>
          <Ionicons name={summary.icon as any} size={20} color={summary.color} />
        </View>
        <Badge
          label={getRiskLabel(summary.riskLevel)}
          variant={getRiskVariant(summary.riskLevel)}
          size="sm"
        />
      </View>

      <Text style={[Typography.labelLarge, { color: theme.text, marginTop: Spacing.two }]} numberOfLines={1}>
        {summary.title}
      </Text>

      <View style={styles.metricsRow}>
        <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
          {summary.count} {summary.count === 1 ? 'file' : 'files'}
        </Text>
        <Text style={[Typography.bodySmall, { color: theme.text, fontWeight: '700' }]}>
          {formatBytes(summary.totalSizeBytes)}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 148,
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginRight: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
});

export const DeepCleanupCategoryCard = React.memo<DeepCleanupCategoryCardProps>(
  DeepCleanupCategoryCardComponent,
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.summary.category === next.summary.category &&
    prev.summary.count === next.summary.count &&
    prev.summary.totalSizeBytes === next.summary.totalSizeBytes &&
    prev.summary.riskLevel === next.summary.riskLevel
);
