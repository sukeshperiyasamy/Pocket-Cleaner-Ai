import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Typography } from '@/constants/theme';

export const AndroidMemoryArchitectureCard: React.FC = () => {
  const theme = useTheme();

  return (
    <Card style={styles.container} variant="outlined">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="shield-outline" size={20} color={theme.primary} />
          <Text style={[Typography.h3, { color: theme.text }]}>
            Android Memory Architecture
          </Text>
        </View>
        <Badge label="Engineering Truth" variant="primary" size="sm" />
      </View>

      <Text
        style={[
          Typography.bodyMedium,
          { color: theme.textSecondary, marginBottom: Spacing.three },
        ]}
      >
        Modern Android operates very differently from traditional desktop OSes.
        Here is how memory and process isolation actually work on your phone:
      </Text>

      {/* Principle 1 */}
      <View style={styles.sectionItem}>
        <View style={styles.sectionHeadingRow}>
          <Ionicons
            name="close-circle-outline"
            size={18}
            color={theme.error}
          />
          <Text style={[Typography.labelLarge, { color: theme.text }]}>
            No Third-Party Process Termination
          </Text>
        </View>
        <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
          Android strictly isolates applications in Linux user sandboxes. Since
          Android 8.0 (Oreo), ordinary apps cannot terminate background
          processes or clear other apps’ private caches. Apps claiming to &quot;Kill
          Background Tasks&quot; are technically misleading.
        </Text>
      </View>

      {/* Principle 2 */}
      <View style={styles.sectionItem}>
        <View style={styles.sectionHeadingRow}>
          <Ionicons
            name="battery-charging-outline"
            size={18}
            color={theme.warning}
          />
          <Text style={[Typography.labelLarge, { color: theme.text }]}>
            &quot;Free RAM is Wasted RAM&quot;
          </Text>
        </View>
        <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
          Android purposefully keeps recent applications loaded into RAM so
          that switching between apps is instantaneous. If an app artificially
          evicts cached processes, the CPU must reload them from slower flash
          storage when needed, causing stutter and draining battery life.
        </Text>
      </View>

      {/* Principle 3 */}
      <View style={styles.sectionItem}>
        <View style={styles.sectionHeadingRow}>
          <Ionicons
            name="checkmark-circle-outline"
            size={18}
            color={theme.success}
          />
          <Text style={[Typography.labelLarge, { color: theme.text }]}>
            Linux LMK (Low Memory Killer)
          </Text>
        </View>
        <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
          The Android kernel utilizes a driver called the Low Memory Killer
          (LMK). If a foreground application (like a camera or a heavy game)
          demands more RAM, the kernel automatically reclaims cached background
          pages in milliseconds without requiring manual intervention.
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
    marginBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionItem: {
    marginVertical: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
});
