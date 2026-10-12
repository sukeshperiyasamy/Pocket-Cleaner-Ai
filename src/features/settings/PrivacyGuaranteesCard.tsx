import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

export const PrivacyGuaranteesCard: React.FC = () => {
  const theme = useTheme();

  return (
    <Card style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: theme.successContainer },
            ]}
          >
            <Ionicons name="shield-checkmark" size={20} color={theme.success} />
          </View>
          <View>
            <Text style={[Typography.h3, { color: theme.text }]}>
              Privacy & Offline Guarantee
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              Zero Cloud Compromises
            </Text>
          </View>
        </View>
        <Badge label="100% Offline" variant="success" size="sm" />
      </View>

      {/* Primary requirement quote */}
      <View
        style={[
          styles.highlightQuoteBox,
          {
            backgroundColor: theme.surfaceSubtle,
            borderLeftColor: theme.primary,
          },
        ]}
      >
        <Text style={[Typography.bodyMedium, { color: theme.text, fontStyle: 'italic' }]}>
          &quot;Designed for on-device processing. Cloud AI is not part of the initial release.&quot;
        </Text>
      </View>

      <View style={styles.bulletsList}>
        <View style={styles.bulletItem}>
          <Ionicons name="lock-closed-outline" size={16} color={theme.success} />
          <Text style={[Typography.bodySmall, { color: theme.textSecondary, flex: 1 }]}>
            No external servers, cloud APIs, or telemetry analytics are embedded.
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Ionicons name="eye-off-outline" size={16} color={theme.success} />
          <Text style={[Typography.bodySmall, { color: theme.textSecondary, flex: 1 }]}>
            Your file metadata and query logs never leave your device.
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Ionicons name="code-slash-outline" size={16} color={theme.success} />
          <Text style={[Typography.bodySmall, { color: theme.textSecondary, flex: 1 }]}>
            Completely free and open-source software (FOSS). Audit the entire code.
          </Text>
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
  highlightQuoteBox: {
    padding: Spacing.three,
    borderRadius: Radius.sm,
    borderLeftWidth: 4,
    marginVertical: Spacing.two,
  },
  bulletsList: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
});
