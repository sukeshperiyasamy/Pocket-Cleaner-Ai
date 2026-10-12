import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageItem } from '@/types';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface CleanupPreviewModalProps {
  visible: boolean;
  selectedFiles: StorageItem[];
  onClose: () => void;
}

export const CleanupPreviewModal: React.FC<CleanupPreviewModalProps> = ({
  visible,
  selectedFiles,
  onClose,
}) => {
  const theme = useTheme();

  const totalBytes = selectedFiles.reduce(
    (sum, item) => sum + item.sizeBytes,
    0
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[Typography.h2, { color: theme.text }]}>
                Cleanup Preview
              </Text>
              <Text
                style={[
                  Typography.bodySmall,
                  { color: theme.textSecondary, marginTop: Spacing.half },
                ]}
              >
                Inspection before any potential action
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
            >
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Non-destructive guarantee notice */}
          <View
            style={[
              styles.safetyBox,
              {
                backgroundColor: theme.infoContainer,
                borderColor: theme.info,
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={20} color={theme.info} />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  Typography.labelMedium,
                  { color: theme.onInfoContainer },
                ]}
              >
                Safe Non-Destructive Review (Phase 1)
              </Text>
              <Text
                style={[
                  Typography.bodySmall,
                  { color: theme.onInfoContainer, marginTop: 2 },
                ]}
              >
                No files are deleted in this version. In future phases, you will
                always explicitly authorize files via Android Storage Access
                Framework.
              </Text>
            </View>
          </View>

          {/* Reclaim summary */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.surfaceSubtle },
            ]}
          >
            <View>
              <Text
                style={[
                  Typography.bodySmall,
                  { color: theme.textSecondary },
                ]}
              >
                Selected Candidates
              </Text>
              <Text style={[Typography.h1, { color: theme.primary }]}>
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  Typography.bodySmall,
                  { color: theme.textSecondary },
                ]}
              >
                Potential Space Saved
              </Text>
              <Text style={[Typography.h1, { color: theme.success }]}>
                {formatBytes(totalBytes)}
              </Text>
            </View>
          </View>

          {/* File list preview */}
          <Text
            style={[
              Typography.labelMedium,
              { color: theme.textSecondary, marginVertical: Spacing.two },
            ]}
          >
            FILES IN PREVIEW
          </Text>

          <ScrollView style={styles.filesScroll} showsVerticalScrollIndicator>
            {selectedFiles.map((file) => (
              <View
                key={file.id}
                style={[
                  styles.previewItem,
                  { borderBottomColor: theme.borderSubtle },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[Typography.labelMedium, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>
                  <Text
                    style={[
                      Typography.bodySmall,
                      { color: theme.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {file.path}
                  </Text>
                </View>
                <Badge
                  label={formatBytes(file.sizeBytes)}
                  variant="neutral"
                  size="sm"
                />
              </View>
            ))}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.actionsFooter}>
            <Button
              label="Close Preview"
              onPress={onClose}
              variant="tonal"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    maxHeight: '85%',
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  closeButton: {
    padding: Spacing.one,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.md,
    gap: Spacing.two,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
  },
  filesScroll: {
    maxHeight: 220,
    marginBottom: Spacing.four,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
