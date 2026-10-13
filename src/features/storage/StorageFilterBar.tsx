import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FileSortOption } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { formatBytes } from '@/utils/formatters';

export type ViewMode = 'list' | 'grid';

interface StorageFilterBarProps {
  sortOption: FileSortOption;
  onSortChange: (sort: FileSortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  minSizeBytes: number;
  onMinSizeBytesChange: (bytes: number) => void;
  showViewToggle?: boolean;
}

export const StorageFilterBar: React.FC<StorageFilterBarProps> = ({
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  minSizeBytes,
  onMinSizeBytesChange,
  showViewToggle = true,
}) => {
  const theme = useTheme();

  const cycleSort = () => {
    switch (sortOption) {
      case 'size_desc':
        return onSortChange('size_asc');
      case 'size_asc':
        return onSortChange('date_desc');
      case 'date_desc':
        return onSortChange('date_asc');
      case 'date_asc':
        return onSortChange('name_asc');
      case 'name_asc':
        return onSortChange('name_desc');
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
        return 'Date: Newest';
      case 'date_asc':
        return 'Date: Oldest';
      case 'name_asc':
        return 'Name: A-Z';
      case 'name_desc':
        return 'Name: Z-A';
      default:
        return 'Size: Largest First';
    }
  };

  const toggleSizeFilter = () => {
    if (minSizeBytes === 0) {
      onMinSizeBytesChange(50 * 1024 * 1024); // 50MB
    } else {
      onMinSizeBytesChange(0); // All files
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Controls Row */}
      <View style={styles.topRow}>
        {/* Sort Button */}
        <Pressable
          onPress={cycleSort}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.surface, borderColor: theme.border },
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

        {/* Size Filter Toggle */}
        <Pressable
          onPress={toggleSizeFilter}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: minSizeBytes > 0 ? theme.primaryContainer : theme.surface,
              borderColor: minSizeBytes > 0 ? theme.primary : theme.border,
            },
            pressed && { opacity: 0.75 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Toggle size filter"
        >
          <Ionicons
            name="funnel-outline"
            size={14}
            color={minSizeBytes > 0 ? theme.onPrimaryContainer : theme.textSecondary}
          />
          <Text
            style={[
              Typography.labelSmall,
              { color: minSizeBytes > 0 ? theme.onPrimaryContainer : theme.text },
            ]}
          >
            {minSizeBytes > 0 ? `>${formatBytes(minSizeBytes)}` : 'All Sizes'}
          </Text>
        </Pressable>

        {/* View Mode Toggle (Grid vs List) */}
        {showViewToggle && (
          <View style={[styles.viewToggleGroup, { borderColor: theme.border }]}>
            <Pressable
              onPress={() => onViewModeChange('list')}
              style={[
                styles.viewToggleBtn,
                viewMode === 'list' && { backgroundColor: theme.primaryContainer },
              ]}
              accessibilityRole="button"
              accessibilityLabel="List View"
            >
              <Ionicons
                name="list"
                size={16}
                color={viewMode === 'list' ? theme.onPrimaryContainer : theme.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={() => onViewModeChange('grid')}
              style={[
                styles.viewToggleBtn,
                viewMode === 'grid' && { backgroundColor: theme.primaryContainer },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Grid View"
            >
              <Ionicons
                name="grid"
                size={16}
                color={viewMode === 'grid' ? theme.onPrimaryContainer : theme.textSecondary}
              />
            </Pressable>
          </View>
        )}
      </View>

      {/* Active Filter Criteria Pill with Clear Option */}
      {minSizeBytes > 0 && (
        <View style={styles.filterPillRow}>
          <View style={[styles.filterPill, { backgroundColor: theme.primaryContainer, borderColor: theme.primary }]}>
            <Text style={[Typography.labelSmall, { color: theme.onPrimaryContainer }]}>
              Filtered: Files &gt; {formatBytes(minSizeBytes)}
            </Text>
            <Pressable
              onPress={() => onMinSizeBytesChange(0)}
              hitSlop={8}
              accessibilityLabel="Clear size filter"
            >
              <Ionicons name="close-circle" size={16} color={theme.onPrimaryContainer} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  filterPillRow: {
    flexDirection: 'row',
    marginTop: Spacing.two,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
