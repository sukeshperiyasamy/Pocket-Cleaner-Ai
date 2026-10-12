import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { LocalAIModelInfo } from '@/types';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface LocalAIStatusCardProps {
  modelInfo: LocalAIModelInfo;
}

export const LocalAIStatusCard: React.FC<LocalAIStatusCardProps> = ({
  modelInfo,
}) => {
  const theme = useTheme();

  return (
    <Card style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: theme.aiContainer },
            ]}
          >
            <Ionicons name="hardware-chip-outline" size={20} color={theme.aiAccent} />
          </View>
          <View>
            <Text style={[Typography.h3, { color: theme.text }]}>
              On-Device LLM Status
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {modelInfo.architecture}
            </Text>
          </View>
        </View>
        <Badge label="Not Installed" variant="warning" size="sm" />
      </View>

      <View style={styles.detailsBox}>
        <View style={styles.detailRow}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Target Model:
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            {modelInfo.name}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Quantization:
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            {modelInfo.quantization}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Model Weight Size:
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            ~{formatBytes(modelInfo.modelSizeBytes)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Execution Engine:
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            {modelInfo.executionProvider}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.actionBox,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
        <Text
          style={[
            Typography.bodySmall,
            { color: theme.textSecondary, flex: 1 },
          ]}
        >
          Model integration will be available in Phase 2 via local ONNX/ExecuTorch modules.
        </Text>
      </View>

      <Button
        label="Download Weights (Phase 2 Preview)"
        onPress={() => {}}
        disabled
        variant="tonal"
        icon="download-outline"
        style={{ marginTop: Spacing.two }}
      />
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
  detailsBox: {
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
});
