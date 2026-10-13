import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageCategoryDetail, FileFilterOption, StorageCategory } from '@/types';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface CategoryBreakdownProps {
  categories: StorageCategoryDetail[];
  activeFilter: FileFilterOption;
  onSelectCategory: (filter: FileFilterOption) => void;
  allFilesTotalBytes?: number;
}

const DEFAULT_CATEGORIES: { category: StorageCategory; name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { category: 'images', name: 'Photos', icon: 'image-outline', color: '#3B82F6' },
  { category: 'videos', name: 'Videos', icon: 'videocam-outline', color: '#EF4444' },
  { category: 'audio', name: 'Audio', icon: 'musical-notes-outline', color: '#10B981' },
  { category: 'downloads', name: 'Downloads', icon: 'download-outline', color: '#8B5CF6' },
];

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories,
  activeFilter,
  onSelectCategory,
  allFilesTotalBytes,
}) => {
  const theme = useTheme();

  // Merge live categories with defaults so all tabs are accessible
  const mergedCategories = DEFAULT_CATEGORIES.map((def) => {
    const live = categories.find((c) => c.category === def.category);
    return {
      ...def,
      sizeBytes: live ? live.sizeBytes : 0,
      fileCount: live ? live.fileCount : 0,
    };
  });

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {/* All Files chip */}
        <Pressable
          onPress={() => onSelectCategory('all')}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor:
                activeFilter === 'all'
                  ? theme.primaryContainer
                  : theme.surface,
              borderColor:
                activeFilter === 'all' ? theme.primary : theme.border,
            },
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Filter by All Files"
        >
          <Ionicons
            name="layers-outline"
            size={16}
            color={
              activeFilter === 'all'
                ? theme.onPrimaryContainer
                : theme.textSecondary
            }
          />
          <Text
            style={[
              Typography.labelMedium,
              {
                color:
                  activeFilter === 'all'
                    ? theme.onPrimaryContainer
                    : theme.text,
              },
            ]}
          >
            All Files
          </Text>
          {allFilesTotalBytes !== undefined && allFilesTotalBytes > 0 && (
            <Text
              style={[
                Typography.labelSmall,
                {
                  color:
                    activeFilter === 'all'
                      ? theme.onPrimaryContainer
                      : theme.textMuted,
                },
              ]}
            >
              ({formatBytes(allFilesTotalBytes)})
            </Text>
          )}
        </Pressable>

        {/* Specific categories */}
        {mergedCategories.map((cat) => {
          const isSelected = activeFilter === cat.category;
          return (
            <Pressable
              key={cat.category}
              onPress={() => onSelectCategory(cat.category)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.primaryContainer
                    : theme.surface,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${cat.name}`}
            >
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Ionicons
                name={cat.icon}
                size={14}
                color={isSelected ? theme.onPrimaryContainer : theme.textSecondary}
              />
              <Text
                style={[
                  Typography.labelMedium,
                  {
                    color: isSelected
                      ? theme.onPrimaryContainer
                      : theme.text,
                  },
                ]}
              >
                {cat.name}
              </Text>
              {cat.sizeBytes > 0 && (
                <Text
                  style={[
                    Typography.labelSmall,
                    {
                      color: isSelected
                        ? theme.onPrimaryContainer
                        : theme.textMuted,
                    },
                  ]}
                >
                  ({formatBytes(cat.sizeBytes)})
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.two,
  },
  scrollList: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
