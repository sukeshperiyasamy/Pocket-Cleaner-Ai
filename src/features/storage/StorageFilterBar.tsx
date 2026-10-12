import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FileSortOption } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface StorageFilterBarProps {
  sortOption: FileSortOption;
  onSortChange: (sort: FileSortOption) => void;
  permissionSimulated: boolean;
  onTogglePermissionSimulation: () => void;
  isNativeAvailable: boolean;
}

export const StorageFilterBar: React.FC<StorageFilterBarProps> = ({
  sortOption,
  onSortChange,
  permissionSimulated,
  onTogglePermissionSimulation,
  isNativeAvailable,
}) => {
  const theme = useTheme();

  const cycleSort = () => {
    switch (sortOption) {
      case 'size_desc':
        return onSortChange('size_asc');
      case 'size_asc':
        return onSortChange('date_desc');
      case 'date_desc':
        return onSortChange('name_asc');
      default:
        return onSortChange('size_desc');
    }
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'size_desc':
        return 'Size: Largest First';
      case 'size_asc':
        return 'Size: Smallest First';
      case 'date_desc':
        return 'Date: Newest First';
      case 'name_asc':
        return 'Name: A-Z';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <Pressable
          onPress={cycleSort}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && { opacity: 0.75 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Change sort order. Currently ${getSortLabel()}`}
        >
          <Ionicons name="swap-vertical" size={14} color={theme.primary} />
          <Text style={[Typography.labelSmall, { color: theme.text }]}>
            {getSortLabel()}
          </Text>
        </Pressable>
      </View>

      <View style={styles.rightRow}>
        {/* Development-only permission test toggle */}
        {!isNativeAvailable && (
          <Pressable
            onPress={onTogglePermissionSimulation}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: permissionSimulated
                  ? theme.warningContainer
                  : theme.backgroundElement,
                borderColor: permissionSimulated ? theme.warning : theme.border,
              },
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle Android Permission-Denied State simulation"
          >
            <Ionicons
              name={permissionSimulated ? 'lock-closed' : 'lock-open-outline'}
              size={14}
              color={permissionSimulated ? theme.onWarningContainer : theme.textSecondary}
            />
            <Text
              style={[
                Typography.labelSmall,
                {
                  color: permissionSimulated
                    ? theme.onWarningContainer
                    : theme.textSecondary,
                },
              ]}
            >
              {permissionSimulated ? 'Dev: Denied State' : 'Dev: Test UI'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.two,
    gap: Spacing.two,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
});
