import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageItem } from '@/types';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface FileListSectionProps {
  files: StorageItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const FileListSection: React.FC<FileListSectionProps> = ({
  files,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}) => {
  const theme = useTheme();

  const getFileIcon = (
    category: StorageItem['category'],
    extension: string
  ): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'videos':
        return 'film-outline';
      case 'images':
        return 'image-outline';
      case 'audio':
        return 'musical-note-outline';
      case 'downloads':
        return 'download-outline';
      default:
        return 'document-text-outline';
    }
  };

  const isAllSelected = files.length > 0 && selectedIds.size === files.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[Typography.h3, { color: theme.text }]}>
          Identified Files ({files.length})
        </Text>
        <View style={styles.selectionActions}>
          <Pressable
            onPress={isAllSelected ? onDeselectAll : onSelectAll}
            style={({ pressed }) => [
              styles.actionLink,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[Typography.labelMedium, { color: theme.primary }]}>
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>
        </View>
      </View>

      {files.map((file) => {
        const isSelected = selectedIds.has(file.id);
        const iconName = getFileIcon(file.category, file.extension);

        return (
          <Pressable
            key={file.id}
            onPress={() => onToggleSelect(file.id)}
            style={({ pressed }) => [
              styles.cardPressable,
              pressed && { opacity: 0.88 },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${file.name}, size ${formatBytes(file.sizeBytes)}`}
          >
            <Card
              style={[
                styles.fileCard,
                isSelected && {
                  borderColor: theme.primary,
                  backgroundColor: theme.surfaceSubtle,
                },
              ]}
              variant="outlined"
            >
              {/* Checkbox */}
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isSelected ? theme.primary : theme.border,
                    backgroundColor: isSelected
                      ? theme.primary
                      : 'transparent',
                  },
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>

              {/* Icon */}
              <View
                style={[
                  styles.fileIconWrapper,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                <Ionicons name={iconName} size={20} color={theme.primary} />
              </View>

              {/* Details */}
              <View style={styles.fileDetails}>
                <Text
                  style={[Typography.labelLarge, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {file.name}
                </Text>

                <Text
                  style={[Typography.bodySmall, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {file.path}
                </Text>

                {file.description && (
                  <Text
                    style={[
                      Typography.labelSmall,
                      { color: theme.textMuted, marginTop: 2 },
                    ]}
                    numberOfLines={1}
                  >
                    {file.description}
                  </Text>
                )}

                <View style={styles.badgesRow}>
                  <Badge
                    label={formatBytes(file.sizeBytes)}
                    variant="neutral"
                    size="sm"
                  />
                  <Badge
                    label={file.isSafeToReview ? 'Safe Candidate' : 'App Asset'}
                    variant={file.isSafeToReview ? 'success' : 'warning'}
                    size="sm"
                  />
                  <Badge label="Sample" variant="neutral" size="sm" />
                </View>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionLink: {
    paddingVertical: Spacing.one,
  },
  cardPressable: {
    marginBottom: Spacing.two,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
    flexWrap: 'wrap',
  },
});
