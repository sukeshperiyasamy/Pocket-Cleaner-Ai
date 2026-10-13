import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativePersistedDirectoryItem } from '@/types/storageAnalysis';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/Button';

interface SafDirectoryPickerCardProps {
  persistedDirectories: NativePersistedDirectoryItem[];
  isPickerLoading: boolean;
  onOpenPicker: () => void;
  onRevokeDirectory: (treeUri: string) => void;
}

export const SafDirectoryPickerCard: React.FC<SafDirectoryPickerCardProps> = ({
  persistedDirectories,
  isPickerLoading,
  onOpenPicker,
  onRevokeDirectory,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="folder-open-outline" size={20} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[Typography.labelLarge, { color: theme.text }]}>
            Storage Access Framework (SAF)
          </Text>
        </View>
        <Button
          label={isPickerLoading ? 'Opening...' : '+ Add Folder'}
          onPress={onOpenPicker}
          disabled={isPickerLoading}
          size="sm"
          variant="outlined"
        />
      </View>

      <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.one }]}>
        Grants explicit access to specific user-selected folders (e.g., Download or Documents) to discover APKs, documents, and archives without broad storage permissions.
      </Text>

      {/* Persisted Folders List */}
      {persistedDirectories.length > 0 ? (
        <View style={styles.directoryList}>
          {persistedDirectories.map((item) => (
            <View
              key={item.treeUri}
              style={[styles.directoryItem, { backgroundColor: theme.surfaceSubtle }]}
            >
              <View style={styles.directoryInfo}>
                <Ionicons name="folder" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[Typography.bodySmall, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>

              <Pressable
                onPress={() => onRevokeDirectory(item.treeUri)}
                style={({ pressed }) => [
                  styles.revokeButton,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Revoke permission for ${item.name}`}
              >
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyPrompt, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            No external folder granted yet. MediaStore shared media is scanned automatically.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directoryList: {
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  directoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  directoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  revokeButton: {
    padding: 4,
    marginLeft: Spacing.two,
  },
  emptyPrompt: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginTop: Spacing.three,
  },
});
