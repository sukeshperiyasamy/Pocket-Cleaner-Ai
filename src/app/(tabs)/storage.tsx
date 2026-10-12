import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { MockBanner } from '@/components/MockBanner';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { CategoryBreakdown } from '@/features/storage/CategoryBreakdown';
import { StorageFilterBar } from '@/features/storage/StorageFilterBar';
import { FileListSection } from '@/features/storage/FileListSection';
import { CleanupPreviewModal } from '@/features/storage/CleanupPreviewModal';
import { storageService, findLargeFiles } from '@/services';
import {
  StorageItem,
  StorageCategoryDetail,
  FileFilterOption,
  FileSortOption,
} from '@/types';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography, MaxContentWidth } from '@/constants/theme';

export default function StorageScreen() {
  const theme = useTheme();
  const [categories, setCategories] = useState<StorageCategoryDetail[]>([]);
  const [allFiles, setAllFiles] = useState<StorageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FileFilterOption>('all');
  const [sortOption, setSortOption] = useState<FileSortOption>('size_desc');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [permissionDeniedSimulated, setPermissionDeniedSimulated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageFiles() {
      try {
        const [cats, files] = await Promise.all([
          storageService.getStorageCategories(),
          findLargeFiles(0, 50),
        ]);
        setCategories(cats);
        setAllFiles(files);
      } catch (err) {
        console.error('Error fetching storage files:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStorageFiles();
  }, []);

  // Filter & sort
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...allFiles];

    // Filter by category
    if (activeFilter !== 'all') {
      result = result.filter((file) => file.category === activeFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'size_desc':
          return b.sizeBytes - a.sizeBytes;
        case 'size_asc':
          return a.sizeBytes - b.sizeBytes;
        case 'date_desc':
          return b.lastModified.localeCompare(a.lastModified);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [allFiles, activeFilter, sortOption]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const next = new Set(filteredAndSortedFiles.map((f) => f.id));
    setSelectedIds(next);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectedFilesList = useMemo(() => {
    return allFiles.filter((f) => selectedIds.has(f.id));
  }, [allFiles, selectedIds]);

  const selectedTotalBytes = useMemo(() => {
    return selectedFilesList.reduce((sum, f) => sum + f.sizeBytes, 0);
  }, [selectedFilesList]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Header */}
          <Header
            title="Storage Explorer"
            subtitle="Categorized breakdown & large files inspection"
            badgeText="Sample Files"
            badgeVariant="warning"
          />

          <MockBanner customMessage="File entries below are simulated Android fixtures. In Phase 2, this explorer will connect to the Android MediaStore and Storage Access Framework (SAF) for user-permissioned inspection." />

          {/* Permission-Denied Simulated State */}
          {permissionDeniedSimulated ? (
            <EmptyState
              type="permission"
              icon="lock-closed"
              title="Storage Permission Denied"
              description="On Android 11+ (API 30+), broad file access requires user authorization or MediaStore scoped access. In this Phase 1 MVP, no real permissions are requested."
              actionLabel="Switch Back to Sample Data"
              onAction={() => setPermissionDeniedSimulated(false)}
            />
          ) : (
            <>
              {/* Category Breakdown Chips */}
              <CategoryBreakdown
                categories={categories}
                activeFilter={activeFilter}
                onSelectCategory={setActiveFilter}
              />

              {/* Sort & Filter Controls */}
              <StorageFilterBar
                sortOption={sortOption}
                onSortChange={setSortOption}
                permissionSimulated={permissionDeniedSimulated}
                onTogglePermissionSimulation={() =>
                  setPermissionDeniedSimulated(!permissionDeniedSimulated)
                }
                selectedCount={selectedIds.size}
                totalCount={filteredAndSortedFiles.length}
              />

              {/* Empty state if filter has no files */}
              {filteredAndSortedFiles.length === 0 && !loading ? (
                <EmptyState
                  title="No Files Found"
                  description="No sample files match the current category filter."
                  actionLabel="Show All Categories"
                  onAction={() => setActiveFilter('all')}
                />
              ) : (
                /* File List */
                <FileListSection
                  files={filteredAndSortedFiles}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Selection Bar for Future Cleanup Preview */}
      {selectedIds.size > 0 && !permissionDeniedSimulated && (
        <View
          style={[
            styles.floatingBar,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.floatingInfo}>
            <Text style={[Typography.labelLarge, { color: theme.text }]}>
              {selectedIds.size} selected ({formatBytes(selectedTotalBytes)})
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              Non-destructive preview
            </Text>
          </View>
          <Button
            label="Preview Cleanup"
            onPress={() => setPreviewVisible(true)}
            variant="filled"
            icon="eye-outline"
            size="sm"
          />
        </View>
      )}

      {/* Cleanup Preview Modal */}
      <CleanupPreviewModal
        visible={previewVisible}
        selectedFiles={selectedFilesList}
        onClose={() => setPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.seven + Spacing.five,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  floatingBar: {
    position: 'absolute',
    bottom: Spacing.two,
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  floatingInfo: {
    flex: 1,
  },
});
