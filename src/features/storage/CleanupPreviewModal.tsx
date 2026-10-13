import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageItem, FileDeletionResult } from '@/types';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { storageService } from '@/services/storageService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CleanupPreviewModalProps {
  visible: boolean;
  selectedFiles: StorageItem[];
  onClose: () => void;
  onDeselectItem: (id: string) => void;
  onCleanupComplete: (result: FileDeletionResult) => void;
}

export const CleanupPreviewModal: React.FC<CleanupPreviewModalProps> = ({
  visible,
  selectedFiles,
  onClose,
  onDeselectItem,
  onCleanupComplete,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [deletionResult, setDeletionResult] = useState<FileDeletionResult | null>(null);

  const totalBytes = selectedFiles.reduce(
    (sum, item) => sum + item.sizeBytes,
    0
  );

  const handleStartDelete = () => {
    setShowConfirmStep(true);
  };

  const handleConfirmExecute = async () => {
    setIsDeleting(true);
    try {
      const result = await storageService.deleteFiles(selectedFiles);
      setDeletionResult(result);
      if (result.status === 'success') {
        onCleanupComplete(result);
      }
    } catch (err: any) {
      setDeletionResult({
        status: 'failed',
        deletedCount: 0,
        freedBytes: 0,
        error: err?.message || 'Deletion operation failed',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setShowConfirmStep(false);
    setDeletionResult(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.four),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[Typography.h2, { color: theme.text }]}>
                Cleanup Review &amp; Consent
              </Text>
              <Text
                style={[
                  Typography.bodySmall,
                  { color: theme.textSecondary, marginTop: Spacing.half },
                ]}
              >
                {selectedFiles.length} item{selectedFiles.length === 1 ? '' : 's'} selected • {formatBytes(totalBytes)} total
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close cleanup review"
            >
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Deletion Outcome State */}
          {deletionResult ? (
            <View style={styles.resultContainer}>
              {deletionResult.status === 'success' ? (
                <View style={[styles.resultCard, { backgroundColor: theme.successContainer, borderColor: theme.success }]}>
                  <Ionicons name="checkmark-circle" size={48} color={theme.success} />
                  <Text style={[Typography.h3, { color: theme.onSuccessContainer, marginTop: Spacing.two }]}>
                    Cleanup Completed
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: theme.onSuccessContainer, marginTop: Spacing.one, textAlign: 'center' }]}>
                    Successfully removed {deletionResult.deletedCount} file{deletionResult.deletedCount === 1 ? '' : 's'} and freed {formatBytes(deletionResult.freedBytes)} of storage.
                  </Text>
                </View>
              ) : deletionResult.status === 'cancelled' ? (
                <View style={[styles.resultCard, { backgroundColor: theme.warningContainer, borderColor: theme.warning }]}>
                  <Ionicons name="close-circle-outline" size={48} color={theme.warning} />
                  <Text style={[Typography.h3, { color: theme.onWarningContainer, marginTop: Spacing.two }]}>
                    Operation Cancelled
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: theme.onWarningContainer, marginTop: Spacing.one, textAlign: 'center' }]}>
                    The Android system deletion dialog was declined or dismissed. No files were modified or deleted.
                  </Text>
                </View>
              ) : (
                <View style={[styles.resultCard, { backgroundColor: theme.errorContainer, borderColor: theme.error }]}>
                  <Ionicons name="alert-circle" size={48} color={theme.error} />
                  <Text style={[Typography.h3, { color: theme.error, marginTop: Spacing.two }]}>
                    Deletion Failed
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: theme.error, marginTop: Spacing.one, textAlign: 'center' }]}>
                    {deletionResult.error || 'The system could not delete the selected files.'}
                  </Text>
                </View>
              )}

              <Button
                label="Done"
                variant="filled"
                size="md"
                onPress={handleClose}
                style={{ marginTop: Spacing.four }}
              />
            </View>
          ) : showConfirmStep ? (
            /* Explicit Confirmation Step */
            <View style={styles.confirmContainer}>
              <View style={[styles.warningBox, { backgroundColor: theme.errorContainer, borderColor: theme.error }]}>
                <Ionicons name="warning" size={32} color={theme.error} />
                <Text style={[Typography.h3, { color: theme.error, marginTop: Spacing.two }]}>
                  Permanent Deletion Warning
                </Text>
                <Text style={[Typography.bodyMedium, { color: theme.error, marginTop: Spacing.one, textAlign: 'center' }]}>
                  You are about to delete {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} ({formatBytes(totalBytes)}).
                  {'\n\n'}
                  On the next step, Android will show an official system prompt: &quot;Allow Pocket Cleaner to delete these files?&quot;.
                </Text>
              </View>

              <View style={styles.confirmActionRow}>
                <Button
                  label="Back to Review"
                  variant="outlined"
                  size="md"
                  onPress={() => setShowConfirmStep(false)}
                  disabled={isDeleting}
                  style={{ flex: 1, marginRight: Spacing.two }}
                />
                <Button
                  label={isDeleting ? 'Requesting...' : 'Proceed to System Consent'}
                  variant="filled"
                  size="md"
                  onPress={handleConfirmExecute}
                  disabled={isDeleting}
                  style={{ flex: 1, backgroundColor: theme.error }}
                />
              </View>

              {isDeleting && (
                <View style={styles.deletingProgress}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginLeft: Spacing.two }]}>
                    Waiting for Android system consent...
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* Regular Review List */
            <>
              {/* Privacy and Consent Notice */}
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
                    Explicit Android Consent Guaranteed
                  </Text>
                  <Text
                    style={[
                      Typography.bodySmall,
                      {
                        color: theme.onInfoContainer,
                        marginTop: Spacing.half,
                        lineHeight: 18,
                      },
                    ]}
                  >
                    Files are never deleted automatically. Deletion requires explicit approval through Android&apos;s scoped-storage system dialog (MediaStore.createDeleteRequest).
                  </Text>
                </View>
              </View>

              {/* Selected Files List */}
              <ScrollView
                style={styles.fileListScroll}
                contentContainerStyle={styles.fileListContent}
                showsVerticalScrollIndicator={false}
              >
                {selectedFiles.map((file) => (
                  <View
                    key={file.id}
                    style={[
                      styles.fileItemCard,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.fileItemLeft}>
                      <Ionicons
                        name={
                          file.category === 'videos'
                            ? 'videocam-outline'
                            : file.category === 'images'
                            ? 'image-outline'
                            : file.category === 'audio'
                            ? 'musical-notes-outline'
                            : 'document-outline'
                        }
                        size={20}
                        color={theme.primary}
                      />
                      <View style={{ flex: 1, marginLeft: Spacing.two }}>
                        <Text
                          style={[Typography.labelMedium, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {file.name}
                        </Text>
                        <Text
                          style={[
                            Typography.labelSmall,
                            {
                              color: theme.textMuted,
                              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                              marginTop: 2,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {file.contentUri || file.path}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fileItemRight}>
                      <Badge
                        label={formatBytes(file.sizeBytes)}
                        variant="primary"
                        size="sm"
                      />
                      <Pressable
                        onPress={() => onDeselectItem(file.id)}
                        hitSlop={8}
                        style={{ marginLeft: Spacing.two }}
                        accessibilityLabel={`Remove ${file.name} from selection`}
                      >
                        <Ionicons name="trash-bin-outline" size={18} color={theme.error} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Bottom Action Footer */}
              <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <View style={styles.footerTotals}>
                  <Text style={[Typography.labelMedium, { color: theme.textSecondary }]}>
                    Selected to Clean:
                  </Text>
                  <Text style={[Typography.h3, { color: theme.text }]}>
                    {formatBytes(totalBytes)}
                  </Text>
                </View>

                <Button
                  label={`Delete ${selectedFiles.length} File${selectedFiles.length === 1 ? '' : 's'}`}
                  variant="filled"
                  size="md"
                  onPress={handleStartDelete}
                  disabled={selectedFiles.length === 0}
                  style={{ backgroundColor: theme.error }}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  closeButton: {
    padding: Spacing.one,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  fileListScroll: {
    maxHeight: 340,
  },
  fileListContent: {
    paddingBottom: Spacing.three,
  },
  fileItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  fileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.two,
  },
  fileItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    borderTopWidth: 1,
  },
  footerTotals: {
    flexDirection: 'column',
  },
  confirmContainer: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  warningBox: {
    width: '100%',
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmActionRow: {
    flexDirection: 'row',
    marginTop: Spacing.four,
    width: '100%',
  },
  deletingProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  resultContainer: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  resultCard: {
    width: '100%',
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});
