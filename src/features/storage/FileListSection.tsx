import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StorageItem, AudioPlaybackInfo } from '@/types';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { MediaGridItem } from './MediaGridItem';
import { AudioPlayerItem } from './AudioPlayerItem';

interface FileListSectionProps {
  files: StorageItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  viewMode?: 'list' | 'grid';
  onPreview: (item: StorageItem) => void;
  playbackState?: AudioPlaybackInfo | null;
  onPlayAudio?: (item: StorageItem) => void;
  onPauseAudio?: () => void;
}

export const FileListSection: React.FC<FileListSectionProps> = ({
  files,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  viewMode = 'list',
  onPreview,
  playbackState = null,
  onPlayAudio = () => {},
  onPauseAudio = () => {},
}) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const isAllSelected = files.length > 0 && selectedIds.size === files.length;

  const formatDuration = (ms?: number) => {
    if (!ms || ms <= 0) return null;
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Compute 3-column grid dimensions
  const gridPadding = Spacing.four * 2;
  const numColumns = 3;
  const columnWidth = Math.floor((width - gridPadding - (numColumns - 1) * 8) / numColumns);

  return (
    <View style={styles.container}>
      {/* Header Row */}
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

      {/* Grid Mode */}
      {viewMode === 'grid' ? (
        <View style={styles.gridContainer}>
          {files.map((file) => (
            <MediaGridItem
              key={file.id}
              item={file}
              isSelected={selectedIds.has(file.id)}
              onToggleSelect={onToggleSelect}
              onPreview={onPreview}
              columnWidth={columnWidth}
            />
          ))}
        </View>
      ) : (
        /* List Mode */
        <View style={styles.listContainer}>
          {files.map((file) => {
            const isSelected = selectedIds.has(file.id);

            // Dedicated player for audio files
            if (file.category === 'audio') {
              return (
                <AudioPlayerItem
                  key={file.id}
                  item={file}
                  isSelected={isSelected}
                  onToggleSelect={onToggleSelect}
                  playbackState={playbackState}
                  onPlay={onPlayAudio}
                  onPause={onPauseAudio}
                />
              );
            }

            const isVideo = file.category === 'videos';
            const durationStr = formatDuration(file.durationMs);

            return (
              <Pressable
                key={file.id}
                onPress={() => onPreview(file)}
                style={({ pressed }) => [
                  styles.cardPressable,
                  pressed && { opacity: 0.92 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Preview ${file.name}, size ${formatBytes(file.sizeBytes)}`}
              >
                <Card
                  style={[
                    styles.fileCard,
                    isSelected && {
                      borderColor: theme.primary,
                      borderWidth: 1.5,
                      backgroundColor: theme.surfaceSubtle,
                    },
                  ]}
                  variant="outlined"
                >
                  {/* Checkbox */}
                  <Pressable
                    onPress={() => onToggleSelect(file.id)}
                    hitSlop={8}
                    style={styles.checkboxTouch}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`Select ${file.name}`}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? theme.primary : theme.border,
                          backgroundColor: isSelected ? theme.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </Pressable>

                  {/* Thumbnail / Media Icon */}
                  <View style={[styles.thumbnailBox, { backgroundColor: theme.surface }]}>
                    {file.contentUri && (file.category === 'images' || file.category === 'videos') ? (
                      <Image
                        source={{ uri: file.contentUri }}
                        style={styles.thumbnailImage}
                        contentFit="cover"
                        transition={150}
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <Ionicons
                        name={
                          isVideo
                            ? 'videocam-outline'
                            : file.category === 'images'
                            ? 'image-outline'
                            : file.category === 'downloads'
                            ? 'download-outline'
                            : 'document-text-outline'
                        }
                        size={22}
                        color={theme.primary}
                      />
                    )}

                    {isVideo && (
                      <View style={styles.thumbnailPlayBadge}>
                        <Ionicons name="play" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  {/* Content details */}
                  <View style={styles.fileDetails}>
                    <Text
                      style={[Typography.bodyMedium, { color: theme.text, fontWeight: '600' }]}
                      numberOfLines={1}
                    >
                      {file.name}
                    </Text>

                    <Text
                      style={[
                        Typography.labelSmall,
                        { color: theme.textSecondary, marginTop: 2 },
                      ]}
                      numberOfLines={1}
                    >
                      {file.lastModified} {file.mimeType ? `• ${file.mimeType}` : ''}
                    </Text>

                    <View style={styles.badgesRow}>
                      <Badge
                        label={formatBytes(file.sizeBytes)}
                        variant="neutral"
                        size="sm"
                      />
                      {durationStr && (
                        <Badge label={durationStr} variant="primary" size="sm" />
                      )}
                      {file.width && file.height && file.width > 0 && file.height > 0 && (
                        <Badge label={`${file.width}×${file.height}`} variant="neutral" size="sm" />
                      )}
                      <Badge
                        label={file.isMock ? 'Sample' : 'Device Media'}
                        variant={file.isMock ? 'neutral' : 'success'}
                        size="sm"
                      />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
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
    alignItems: 'center',
  },
  actionLink: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.one,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  listContainer: {
    gap: Spacing.two,
  },
  cardPressable: {
    borderRadius: Radius.lg,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
  },
  checkboxTouch: {
    paddingRight: Spacing.two,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: Spacing.three,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlayBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 1,
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
