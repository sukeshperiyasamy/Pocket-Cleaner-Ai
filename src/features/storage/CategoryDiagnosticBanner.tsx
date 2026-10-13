import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryDiagnostics } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface CategoryDiagnosticBannerProps {
  diagnostics: CategoryDiagnostics;
  category: string;
}

export const CategoryDiagnosticBanner: React.FC<CategoryDiagnosticBannerProps> = ({
  diagnostics,
  category,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="hardware-chip-outline" size={14} color={theme.primary} />
          <Text style={[Typography.labelSmall, { color: theme.textSecondary }]}>
            Diagnostic Telemetry • {category.toUpperCase()}
          </Text>
        </View>
        <Text style={[Typography.labelSmall, { color: diagnostics.permissionStatus === 'granted' ? theme.success : theme.error }]}>
          {diagnostics.permissionStatus === 'granted' ? 'Access Authorized' : 'Permission Required'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[Typography.labelSmall, { color: theme.textMuted }]}>MediaStore</Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            {diagnostics.mediaStoreTotalCount} records
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[Typography.labelSmall, { color: theme.textMuted }]}>Mapped</Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            {diagnostics.validMappedCount} valid
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[Typography.labelSmall, { color: theme.textMuted }]}>Visible</Text>
          <Text style={[Typography.labelMedium, { color: theme.text }]}>
            {diagnostics.visibleCount} files
          </Text>
        </View>
      </View>

      {diagnostics.queryError && (
        <View style={[styles.errorRow, { backgroundColor: theme.errorContainer }]}>
          <Ionicons name="alert-circle-outline" size={14} color={theme.error} />
          <Text style={[Typography.labelSmall, { color: theme.error, flex: 1 }]}>
            {diagnostics.queryError}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
    marginVertical: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
  statItem: {
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.sm,
    marginTop: Spacing.two,
  },
});
