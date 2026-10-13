import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeFolderAnalysisItem } from '@/types/storageAnalysis';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Badge } from '@/components/Badge';

interface FolderAggregatesCardProps {
  folders: NativeFolderAnalysisItem[];
}

export const FolderAggregatesCard: React.FC<FolderAggregatesCardProps> = ({ folders }) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  if (folders.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.headerPressable}
        accessibilityRole="button"
        accessibilityLabel="Toggle folder aggregation overview"
      >
        <View style={styles.titleGroup}>
          <Ionicons name="folder-outline" size={20} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[Typography.labelLarge, { color: theme.text }]}>
            Accessible Folder Breakdown ({folders.length})
          </Text>
        </View>

        <View style={styles.expandGroup}>
          <Badge label="Incomplete Scan" variant="warning" size="sm" />
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.textSecondary}
            style={{ marginLeft: 6 }}
          />
        </View>
      </Pressable>

      <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.one }]}>
        ⚠️ Sizes reflect indexed shared files and user-granted directories only. Private application sandboxes and unindexed files are excluded. Folders cannot be deleted directly without inspecting individual items.
      </Text>

      {isExpanded && (
        <View style={styles.foldersList}>
          {folders.map((folder) => (
            <View
              key={folder.folderPath}
              style={[styles.folderItem, { borderBottomColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodySmall, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                  {folder.folderPath}
                </Text>
                <Text style={[Typography.labelSmall, { color: theme.textSecondary }]}>
                  {folder.itemCount} indexed items • Partial scan
                </Text>
              </View>
              <Text style={[Typography.bodySmall, { color: theme.text, fontWeight: '700' }]}>
                {formatBytes(folder.totalSizeBytes)}
              </Text>
            </View>
          ))}
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
  headerPressable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foldersList: {
    marginTop: Spacing.three,
  },
  folderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
});
