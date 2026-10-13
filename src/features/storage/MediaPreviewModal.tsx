import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StorageItem } from '@/types';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { storageService } from '@/services/storageService';

interface MediaPreviewModalProps {
  visible: boolean;
  item: StorageItem | null;
  onClose: () => void;
  onToggleSelect?: (id: string) => void;
  isSelected?: boolean;
}

const VideoPlayerSection: React.FC<{ contentUri: string; onSystemFallback?: () => void }> = ({
  contentUri,
}) => {
  const player = useVideoPlayer(contentUri, (p) => {
    p.loop = true;
    p.play();
  });

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // Ignored
      }
    };
  }, [player]);

  return (
    <View style={styles.videoWrapper}>
      <VideoView
        style={styles.videoPlayer}
        player={player}
        contentFit="contain"
        nativeControls
      />
    </View>
  );
};

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  visible,
  item,
  onClose,
  onToggleSelect,
  isSelected = false,
}) => {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);

  const isVideo = item?.category === 'videos';
  const isImage = item?.category === 'images';

  const handleSystemOpen = async () => {
    if (item?.contentUri) {
      await storageService.openMediaInSystem(item.contentUri, item.mimeType);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms || ms <= 0) return null;
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible && Boolean(item)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {item ? (
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
          {/* Top Bar */}
          <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
            <View style={styles.headerInfo}>
              <Text
                style={[Typography.labelLarge, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={[Typography.labelSmall, { color: theme.textSecondary }]}>
                {item.category.toUpperCase()} • {formatBytes(item.sizeBytes)}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={8}
              accessibilityLabel="Close preview"
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          {/* Media Viewport */}
          <View style={styles.viewport}>
            {isVideo && item.contentUri ? (
              <VideoPlayerSection
                contentUri={item.contentUri}
                onSystemFallback={handleSystemOpen}
              />
            ) : isImage && item.contentUri && !imageError ? (
              <Image
                source={{ uri: item.contentUri }}
                style={styles.imageViewer}
                contentFit="contain"
                transition={200}
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.fallbackBox}>
                <Ionicons
                  name={
                    isVideo
                      ? 'videocam-outline'
                      : isImage
                      ? 'image-outline'
                      : item.category === 'audio'
                      ? 'musical-notes-outline'
                      : 'document-text-outline'
                  }
                  size={64}
                  color={theme.textMuted}
                />
                <Text style={[Typography.bodyMedium, { color: theme.textSecondary, marginTop: Spacing.two }]}>
                  {imageError ? 'Unable to render image thumbnail' : item.name}
                </Text>
                {item.contentUri && (
                  <Button
                    label="Open with Android System App"
                    size="sm"
                    variant="outlined"
                    onPress={handleSystemOpen}
                    style={{ marginTop: Spacing.three }}
                  />
                )}
              </View>
            )}
          </View>

          {/* Metadata & Actions Footer */}
          <ScrollView
            style={styles.detailsScroll}
            contentContainerStyle={styles.detailsContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Badges */}
            <View style={styles.badgeRow}>
              <Badge label={formatBytes(item.sizeBytes)} variant="primary" size="md" />
              <Badge label={item.extension.toUpperCase()} variant="neutral" size="md" />
              {item.mimeType ? (
                <Badge label={item.mimeType} variant="neutral" size="md" />
              ) : null}
              {typeof item.durationMs === 'number' && item.durationMs > 0 ? (
                <Badge label={`Duration: ${formatDuration(item.durationMs)}`} variant="neutral" size="md" />
              ) : null}
              {typeof item.width === 'number' && typeof item.height === 'number' && item.width > 0 && item.height > 0 ? (
                <Badge label={`${item.width} × ${item.height}`} variant="neutral" size="md" />
              ) : null}
            </View>

            {/* Path / URI Information */}
            <View style={[styles.metaBlock, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[Typography.labelSmall, { color: theme.textSecondary }]}>
                Storage Identifier / URI
              </Text>
              <Text
                style={[Typography.labelSmall, { color: theme.text, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}
                numberOfLines={2}
              >
                {item.contentUri || item.path}
              </Text>
            </View>

            {/* Date */}
            <View style={styles.metaRow}>
              <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                Last Modified:
              </Text>
              <Text style={[Typography.bodySmall, { color: theme.text, fontWeight: '600' }]}>
                {item.lastModified}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionButtonsRow}>
              {onToggleSelect && (
                <Button
                  label={isSelected ? 'Deselect File' : 'Select for Cleanup'}
                  variant={isSelected ? 'outlined' : 'filled'}
                  onPress={() => onToggleSelect(item.id)}
                  style={{ flex: 1, marginRight: Spacing.two }}
                />
              )}
              <Button
                label="Open in System"
                variant="outlined"
                onPress={handleSystemOpen}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
    marginRight: Spacing.two,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  viewport: {
    width: '100%',
    height: 320,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewer: {
    width: '100%',
    height: '100%',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  errorVideoBox: {
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackBox: {
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsScroll: {
    flexGrow: 0,
  },
  detailsContent: {
    padding: Spacing.four,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  metaBlock: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginBottom: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
