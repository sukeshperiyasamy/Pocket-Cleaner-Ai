import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { StorageItem, AudioPlaybackInfo } from '@/types';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface AudioPlayerItemProps {
  item: StorageItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  playbackState: AudioPlaybackInfo | null;
  onPlay: (item: StorageItem) => void;
  onPause: () => void;
}

export const AudioPlayerItem: React.FC<AudioPlayerItemProps> = ({
  item,
  isSelected,
  onToggleSelect,
  playbackState,
  onPlay,
  onPause,
}) => {
  const theme = useTheme();

  const isCurrentTrack = playbackState?.uri === item.contentUri;
  const isPlaying = Boolean(isCurrentTrack && playbackState?.isPlaying);

  const formatDuration = (ms?: number) => {
    if (!ms || ms <= 0) return null;
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const durationStr = formatDuration(item.durationMs);

  return (
    <Card
      style={[
        styles.card,
        isSelected && { borderColor: theme.primary, borderWidth: 1.5 },
      ]}
      variant="subtle"
    >
      <View style={styles.container}>
        {/* Checkbox */}
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => onToggleSelect(item.id)}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
          accessibilityLabel={`Select audio track ${item.name}`}
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
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
        </Pressable>

        {/* Play/Pause Button */}
        <Pressable
          style={[
            styles.playButton,
            { backgroundColor: isPlaying ? theme.primary : theme.primaryContainer },
          ]}
          onPress={() => {
            if (isPlaying) {
              onPause();
            } else {
              onPlay(item);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? `Pause ${item.name}` : `Play ${item.name}`}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isPlaying ? '#FFFFFF' : theme.onPrimaryContainer}
          />
        </Pressable>

        {/* Track Details */}
        <View style={styles.trackInfo}>
          <Text
            style={[Typography.bodyMedium, { color: theme.text, fontWeight: '600' }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <Text
            style={[Typography.labelSmall, { color: theme.textSecondary, marginTop: 2 }]}
            numberOfLines={1}
          >
            {item.artist ? `${item.artist} • ` : ''}
            {item.album ? `${item.album} • ` : ''}
            {item.lastModified}
          </Text>

          {/* Badges Row */}
          <View style={styles.badgesRow}>
            <Badge label={formatBytes(item.sizeBytes)} variant="neutral" size="sm" />
            {durationStr && (
              <Badge label={durationStr} variant="primary" size="sm" />
            )}
            <Badge label={`.${item.extension.toUpperCase()}`} variant="neutral" size="sm" />
            {isPlaying && (
              <Badge label="Playing" variant="success" size="sm" />
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.two,
    padding: Spacing.three,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: Spacing.two,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  trackInfo: {
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
