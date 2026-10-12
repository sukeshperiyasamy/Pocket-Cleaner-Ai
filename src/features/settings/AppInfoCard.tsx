import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { AppMetadata } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface AppInfoCardProps {
  metadata: AppMetadata;
}

export const AppInfoCard: React.FC<AppInfoCardProps> = ({ metadata }) => {
  const theme = useTheme();

  return (
    <Card style={styles.container} variant="subtle">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
          <Text style={[Typography.h3, { color: theme.text }]}>
            About This Application
          </Text>
        </View>
        <Badge label="FOSS" variant="primary" size="sm" />
      </View>

      <View style={styles.metaRows}>
        <View style={styles.metaRow}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Application Name:
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            {metadata.name}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Version:
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            v{metadata.version} (Build {metadata.buildNumber})
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            License:
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            {metadata.license}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Target Platform:
          </Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            Android-First (Custom Dev Build)
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.footerNote,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        <Ionicons name="git-branch-outline" size={16} color={theme.textSecondary} />
        <Text
          style={[
            Typography.bodySmall,
            { color: theme.textMuted, flex: 1 },
          ]}
        >
          Phase 1 Foundation • Built with React Native & Expo Router.
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.six,
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
  metaRows: {
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.three,
  },
});
