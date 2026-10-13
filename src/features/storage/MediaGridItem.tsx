import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StorageItem } from '@/types';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

export interface MediaGridItemProps {
  item: StorageItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (item: StorageItem) => void;
  columnWidth: number;
}

const MediaGridItemComponent: React.FC<MediaGridItemProps> = ({
  item,
  isSelected,
  onToggleSelect,
  onPreview,
  columnWidth,
}) => {
  const theme = useTheme();
  const [loadError, setLoadError] = useState(false);

  const formatDuration = (ms?: number) => {
    if (!ms || ms <= 0) return null;
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideo = item.category === 'videos';
  const durationStr = formatDuration(item.durationMs);

  return (
    <View
      style={[
        styles.container,
        {
          width: columnWidth,
          height: columnWidth,
          backgroundColor: theme.surface,
          borderColor: isSelected ? theme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      <Pressable
        style={styles.pressableArea}
        onPress={() => onPreview(item)}
        accessibilityRole="button"
        accessibilityLabel={`Preview ${item.name}`}
      >
        {item.contentUri && !loadError ? (
          <Image
            source={{ uri: item.contentUri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={item.contentUri}
            priority="low"
            onError={() => setLoadError(true)}
          />
        ) : (
          <View style={[styles.fallbackContainer, { backgroundColor: theme.surface }]}>
            <Ionicons
              name={
                isVideo
                  ? 'videocam-outline'
                  : item.category === 'images'
                  ? 'image-outline'
                  : item.category === 'audio'
                  ? 'musical-notes-outline'
                  : 'document-outline'
              }
              size={32}
              color={theme.textMuted}
            />
            <Text
              style={[Typography.labelSmall, { color: theme.textSecondary, marginTop: 4, textAlign: 'center' }]}
              numberOfLines={1}
            >
              .{item.extension}
            </Text>
          </View>
        )}

        {/* Video Overlay Play Icon */}
        {isVideo && (
          <View style={styles.videoOverlay}>
            <View style={styles.playBadge}>
              <Ionicons name="play" size={14} color="#FFFFFF" />
            </View>
            {durationStr && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{durationStr}</Text>
              </View>
            )}
          </View>
        )}

        {/* Size Badge */}
        <View style={styles.sizeBadge}>
          <Text style={styles.sizeText}>{formatBytes(item.sizeBytes)}</Text>
        </View>
      </Pressable>

      {/* Selection Checkbox */}
      <Pressable
        style={styles.checkboxTouch}
        onPress={() => onToggleSelect(item.id)}
        hitSlop={6}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`Select ${item.name}`}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? theme.primary : 'rgba(0,0,0,0.4)',
              borderColor: isSelected ? theme.primary : '#FFFFFF',
            },
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    margin: 4,
  },
  pressableArea: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.one,
  },
  checkboxTouch: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 10,
    padding: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
  },
  durationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  sizeBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sizeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

export const MediaGridItem = React.memo<MediaGridItemProps>(
  MediaGridItemComponent,
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.isSelected === next.isSelected &&
    prev.columnWidth === next.columnWidth
);
