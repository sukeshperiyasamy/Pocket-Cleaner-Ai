import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { LocalAIModelInfo } from '@/types';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Typography } from '@/constants/theme';

interface ModelManagementCardProps {
  modelInfo: LocalAIModelInfo;
}

export const ModelManagementCard: React.FC<ModelManagementCardProps> = ({
  modelInfo,
}) => {
  const theme = useTheme();

  return (
    <Card style={styles.container} variant="outlined">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="cog-outline" size={20} color={theme.primary} />
          <Text style={[Typography.h3, { color: theme.text }]}>
            Local AI Hardware Requirements
          </Text>
        </View>
        <Badge label="Pre-flight" variant="info" size="sm" />
      </View>

      <Text
        style={[
          Typography.bodySmall,
          { color: theme.textSecondary, marginBottom: Spacing.three },
        ]}
      >
        To ensure smooth offline performance without causing UI stutter, your
        device must satisfy these hardware baselines:
      </Text>

      <View style={styles.checklist}>
        <View style={styles.checkItem}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <View style={{ flex: 1 }}>
            <Text style={[Typography.labelMedium, { color: theme.text }]}>
              Available Memory Headroom
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              Requires {formatBytes(modelInfo.minRamBytes)} RAM (Detected: ~5.1 GB Available)
            </Text>
          </View>
        </View>

        <View style={styles.checkItem}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <View style={{ flex: 1 }}>
            <Text style={[Typography.labelMedium, { color: theme.text }]}>
              Storage for Model Weights
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              Requires ~{formatBytes(modelInfo.modelSizeBytes)} free storage (Detected: 39.6 GB Free)
            </Text>
          </View>
        </View>

        <View style={styles.checkItem}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <View style={{ flex: 1 }}>
            <Text style={[Typography.labelMedium, { color: theme.text }]}>
              Architecture Support
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              ARM64 / ARMv8-A with FP16/DotProd acceleration
            </Text>
          </View>
        </View>
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
    marginBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checklist: {
    gap: Spacing.three,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
});
