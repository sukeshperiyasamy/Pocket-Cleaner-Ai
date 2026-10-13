import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageCandidate } from '@/types/storageAnalysis';
import { FileDeletionResult } from '@/types/storage';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { storageAnalysisService } from '@/services/storageAnalysisService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DeepCleanupReviewModalProps {
  visible: boolean;
  selectedCandidates: StorageCandidate[];
  onClose: () => void;
  onDeselectItem: (id: string) => void;
  onCleanupComplete: (result: FileDeletionResult) => void;
}

export const DeepCleanupReviewModal: React.FC<DeepCleanupReviewModalProps> = ({
  visible,
  selectedCandidates,
  onClose,
  onDeselectItem,
  onCleanupComplete,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [deletionOutcome, setDeletionOutcome] = useState<FileDeletionResult | null>(null);

  const totalSelectedBytes = selectedCandidates.reduce(
    (sum, item) => sum + item.sizeBytes,
    0
  );

  const handleExecuteDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await storageAnalysisService.deleteCandidates(selectedCandidates);
      setDeletionOutcome(result);
      if (result.status === 'success') {
        onCleanupComplete(result);
      }
    } catch (err: any) {
      setDeletionOutcome({
        status: 'failed',
        deletedCount: 0,
        freedBytes: 0,
        error: err?.message || 'Native deletion request failed',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setHasConfirmedCheckbox(false);
    setDeletionOutcome(null);
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
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.h2, { color: theme.text }]}>
                Pre-Deletion Review &amp; Consent
              </Text>
              <Text
                style={[
                  Typography.bodySmall,
                  { color: theme.textSecondary, marginTop: Spacing.one },
                ]}
              >
                {selectedCandidates.length} candidate{selectedCandidates.length === 1 ? '' : 's'} selected • {formatBytes(totalSelectedBytes)}
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Close review dialog"
            >
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Outcome Screen */}
          {deletionOutcome ? (
            <View style={styles.outcomeContainer}>
              {deletionOutcome.status === 'success' ? (
                <View style={styles.outcomeContent}>
                  <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  </View>
                  <Text style={[Typography.h2, { color: theme.text, marginTop: Spacing.three }]}>
                    Storage Freed Successfully
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.one }]}>
                    Android confirmed permanent deletion of the selected files.
                  </Text>

                  {/* Separate Reporting */}
                  <View style={[styles.reportCard, { backgroundColor: theme.surfaceSubtle }]}>
                    <View style={styles.reportRow}>
                      <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Selected Size</Text>
                      <Text style={[Typography.bodySmall, { color: theme.text, fontWeight: '600' }]}>{formatBytes(totalSelectedBytes)}</Text>
                    </View>
                    <View style={styles.reportRow}>
                      <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Successfully Deleted</Text>
                      <Text style={[Typography.bodySmall, { color: '#10B981', fontWeight: '700' }]}>{deletionOutcome.deletedCount} files</Text>
                    </View>
                    <View style={styles.reportRow}>
                      <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Confirmed Storage Freed</Text>
                      <Text style={[Typography.bodySmall, { color: '#10B981', fontWeight: '700' }]}>{formatBytes(deletionOutcome.freedBytes)}</Text>
                    </View>
                  </View>

                  <Button
                    label="Done & Refresh"
                    onPress={handleClose}
                    variant="filled"
                    style={{ marginTop: Spacing.five, width: '100%' }}
                  />
                </View>
              ) : deletionOutcome.status === 'cancelled' ? (
                <View style={styles.outcomeContent}>
                  <View style={[styles.iconCircle, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="close-circle" size={48} color="#F59E0B" />
                  </View>
                  <Text style={[Typography.h2, { color: theme.text, marginTop: Spacing.three }]}>
                    Deletion Cancelled
                  </Text>
                  <Text style={[Typography.bodyMedium, { color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.one }]}>
                    The deletion request was declined or cancelled in the system dialog. No files were removed from your device.
                  </Text>
                  <Button
                    label="Back to Review"
                    onPress={() => setDeletionOutcome(null)}
                    variant="outlined"
                    style={{ marginTop: Spacing.five, width: '100%' }}
                  />
                </View>
              ) : (
                <View style={styles.outcomeContent}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EF444420' }]}>
                    <Ionicons name="alert-circle" size={48} color="#EF4444" />
                  </View>
                  <Text style={[Typography.h2, { color: theme.text, marginTop: Spacing.three }]}>
                    Deletion Incomplete
                  </Text>
                  <Text style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.one }]}>
                    {deletionOutcome.error || 'One or more items could not be deleted due to system permissions.'}
                  </Text>

                  <View style={[styles.reportCard, { backgroundColor: theme.surfaceSubtle }]}>
                    <View style={styles.reportRow}>
                      <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Deleted Count</Text>
                      <Text style={[Typography.bodySmall, { color: theme.text }]}>{deletionOutcome.deletedCount} files</Text>
                    </View>
                    <View style={styles.reportRow}>
                      <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>Freed Storage</Text>
                      <Text style={[Typography.bodySmall, { color: theme.text }]}>{formatBytes(deletionOutcome.freedBytes)}</Text>
                    </View>
                  </View>

                  <Button
                    label="Dismiss"
                    onPress={handleClose}
                    variant="outlined"
                    style={{ marginTop: Spacing.five, width: '100%' }}
                  />
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Itemized List */}
              <ScrollView style={styles.itemList} showsVerticalScrollIndicator>
                <View style={[styles.safetyBanner, { backgroundColor: `${theme.primary}12` }]}>
                  <Ionicons name="shield-checkmark" size={18} color={theme.primary} style={{ marginRight: 6 }} />
                  <Text style={[Typography.labelSmall, { color: theme.text, flex: 1 }]}>
                    Files are not deleted automatically. Tapping Confirm will prompt Android&apos;s system consent dialog.
                  </Text>
                </View>

                {selectedCandidates.map((candidate) => (
                  <View
                    key={candidate.id}
                    style={[styles.itemCard, { backgroundColor: theme.surfaceSubtle }]}
                  >
                    <View style={{ flex: 1, marginRight: Spacing.two }}>
                      <Text style={[Typography.labelLarge, { color: theme.text }]} numberOfLines={1}>
                        {candidate.name}
                      </Text>
                      <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                        {candidate.path}
                      </Text>
                      <View style={styles.itemMetaRow}>
                        <Badge label={candidate.category.replace('_', ' ')} variant="neutral" size="sm" />
                        <Text style={[Typography.labelSmall, { color: theme.textSecondary, marginLeft: 6 }]}>
                          {candidate.ageLabel}
                        </Text>
                      </View>
                      <Text style={[Typography.labelSmall, { color: theme.textMuted, marginTop: 2 }]} numberOfLines={1}>
                        Reason: {candidate.recommendationReason}
                      </Text>
                    </View>

                    <View style={styles.itemRightAction}>
                      <Text style={[Typography.bodySmall, { color: theme.text, fontWeight: '700' }]}>
                        {formatBytes(candidate.sizeBytes)}
                      </Text>
                      <Pressable
                        onPress={() => onDeselectItem(candidate.id)}
                        style={styles.deselectButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${candidate.name} from selection`}
                      >
                        <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Confirmation Checkbox */}
              <Pressable
                onPress={() => setHasConfirmedCheckbox(!hasConfirmedCheckbox)}
                style={styles.confirmRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: hasConfirmedCheckbox }}
              >
                <Ionicons
                  name={hasConfirmedCheckbox ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={hasConfirmedCheckbox ? theme.primary : theme.textMuted}
                  style={{ marginRight: Spacing.two }}
                />
                <Text style={[Typography.bodySmall, { color: theme.text, flex: 1 }]}>
                  I confirm that I have reviewed these {selectedCandidates.length} candidate files for deletion.
                </Text>
              </Pressable>

              {/* Actions */}
              <View style={styles.actionRow}>
                <Button
                  label="Cancel"
                  onPress={handleClose}
                  variant="outlined"
                  style={{ flex: 1, marginRight: Spacing.two }}
                />
                <Button
                  label={
                    isDeleting
                      ? 'Prompting...'
                      : `Confirm & Delete (${formatBytes(totalSelectedBytes)})`
                  }
                  onPress={handleExecuteDelete}
                  disabled={!hasConfirmedCheckbox || isDeleting || selectedCandidates.length === 0}
                  variant="danger"
                  style={{ flex: 2 }}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderTopWidth: 1,
    padding: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  closeBtn: {
    padding: 4,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginBottom: Spacing.three,
  },
  itemList: {
    maxHeight: 340,
    marginBottom: Spacing.three,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginBottom: Spacing.two,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  itemRightAction: {
    alignItems: 'flex-end',
  },
  deselectButton: {
    marginTop: 4,
    padding: 2,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outcomeContainer: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  outcomeContent: {
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCard: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
