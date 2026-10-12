import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { RecentScanInfo } from '@/types';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Typography } from '@/constants/theme';

interface RecentScansSectionProps {
  scans: RecentScanInfo[];
  loading?: boolean;
}

export const RecentScansSection: React.FC<RecentScansSectionProps> = ({
  scans,
  loading = false,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[Typography.h3, { color: theme.text }]}>
          Recent Scans
        </Text>
        <Badge label="Sample Log" variant="neutral" size="sm" />
      </View>

      {scans.length === 0 && !loading ? (
        <EmptyState
          title="No Scans Yet"
          description="Run a scan from Quick Actions above to preview space-saving opportunities."
          icon="time-outline"
        />
      ) : (
        scans.map((scan) => (
          <Card key={scan.id} style={styles.scanCard} variant="subtle">
            <View style={styles.cardHeader}>
              <View style={styles.titleWithIcon}>
                <Ionicons
                  name={scan.status === 'completed' ? 'checkmark-circle' : 'hourglass'}
                  size={18}
                  color={scan.status === 'completed' ? theme.success : theme.warning}
                />
                <Text style={[Typography.labelLarge, { color: theme.text }]}>
                  {scan.timestamp}
                </Text>
              </View>
              <Badge
                label={`~${formatBytes(scan.potentialSavingsBytes)} reviewable`}
                variant="primary"
                size="sm"
              />
            </View>

            <Text
              style={[
                Typography.bodySmall,
                { color: theme.textSecondary, marginTop: Spacing.one },
              ]}
            >
              {scan.summary}
            </Text>

            <View style={styles.footerRow}>
              <Text
                style={[
                  Typography.labelSmall,
                  { color: theme.textMuted },
                ]}
              >
                {scan.scannedItemsCount} simulated files inspected
              </Text>
            </View>
          </Card>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.five,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  scanCard: {
    marginBottom: Spacing.two,
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  footerRow: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
});
