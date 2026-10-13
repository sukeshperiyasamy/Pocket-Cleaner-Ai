import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { DataSourceIndicator } from '@/components/DataSourceIndicator';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { CategoryBreakdown } from '@/features/storage/CategoryBreakdown';
import { StorageFilterBar, ViewMode } from '@/features/storage/StorageFilterBar';
import { FileListSection } from '@/features/storage/FileListSection';
import { CleanupPreviewModal } from '@/features/storage/CleanupPreviewModal';
import { MediaPreviewModal } from '@/features/storage/MediaPreviewModal';
import { CategoryDiagnosticBanner } from '@/features/storage/CategoryDiagnosticBanner';
import { storageService } from '@/services';
import {
  StorageItem,
  StorageCategoryDetail,
  FileFilterOption,
  FileSortOption,
  DataSourceStatus,
  CategoryDiagnostics,
  AudioPlaybackInfo,
  FileDeletionResult,
} from '@/types';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography, MaxContentWidth } from '@/constants/theme';

export default function StorageScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{
    category?: string;
    view?: string;
    sort?: string;
    minSize?: string;
    previewIndex?: string;
    cleanup?: string;
  }>();

  const [categories, setCategories] = useState<StorageCategoryDetail[]>([]);
  const [allFiles, setAllFiles] = useState<StorageItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<CategoryDiagnostics | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<AudioPlaybackInfo | null>(null);

  // User overrides over query parameters
  const [userSelectedFilter, setUserSelectedFilter] = useState<FileFilterOption | null>(null);
  const [userSortOption, setUserSortOption] = useState<FileSortOption | null>(null);
  const [userViewMode, setUserViewMode] = useState<ViewMode | null>(null);
  const [userMinSizeBytes, setUserMinSizeBytes] = useState<number | null>(null);
  const [userPreviewItem, setUserPreviewItem] = useState<StorageItem | null>(null);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);

  const activeFilter: FileFilterOption = useMemo(() => {
    if (userSelectedFilter) return userSelectedFilter;
    if (params.category && ['all', 'images', 'videos', 'audio', 'documents', 'downloads'].includes(params.category)) {
      return params.category as FileFilterOption;
    }
    return 'all';
  }, [userSelectedFilter, params.category]);

  const viewMode: ViewMode = useMemo(() => {
    if (userViewMode) return userViewMode;
    if (params.view === 'list' || params.view === 'grid') return params.view;
    return 'list';
  }, [userViewMode, params.view]);

  const sortOption: FileSortOption = useMemo(() => {
    if (userSortOption) return userSortOption;
    if (params.sort && ['size_desc', 'size_asc', 'date_desc', 'date_asc', 'name_asc', 'name_desc'].includes(params.sort)) {
      return params.sort as FileSortOption;
    }
    return 'size_desc';
  }, [userSortOption, params.sort]);

  const minSizeBytes: number = useMemo(() => {
    if (userMinSizeBytes !== null) return userMinSizeBytes;
    if (params.minSize !== undefined) return Number(params.minSize) || 0;
    return 0;
  }, [userMinSizeBytes, params.minSize]);

  const previewItem: StorageItem | null = useMemo(() => {
    if (userPreviewItem) return userPreviewItem;
    if (params.previewIndex !== undefined && allFiles.length > 0 && params.previewIndex !== 'close') {
      const idx = Number(params.previewIndex);
      if (!isNaN(idx) && allFiles[idx]) return allFiles[idx];
    }
    return null;
  }, [userPreviewItem, params.previewIndex, allFiles]);

  const cleanupModalVisible = useMemo(() => {
    if (isCleanupModalOpen) return true;
    return params.cleanup === 'true' && allFiles.length > 0;
  }, [isCleanupModalOpen, params.cleanup, allFiles.length]);

  const setActiveFilter = useCallback((f: FileFilterOption) => {
    setUserSelectedFilter(f);
    setUserPreviewItem(null);
  }, []);

  const setViewMode = useCallback((v: ViewMode) => {
    setUserViewMode(v);
  }, []);

  const setSortOption = useCallback((s: FileSortOption) => {
    setUserSortOption(s);
  }, []);

  const setMinSizeBytes = useCallback((m: number) => {
    setUserMinSizeBytes(m);
  }, []);

  const setPreviewItem = useCallback((item: StorageItem | null) => {
    setUserPreviewItem(item);
  }, []);

  const setCleanupModalVisible = useCallback((visible: boolean) => {
    setIsCleanupModalOpen(visible);
  }, []);

  const isNative = storageService.isNativeAvailable();

  const filesStatus: DataSourceStatus = useMemo(() => {
    if (loadError) return 'unavailable';
    if (!hasPermission && isNative) return 'unavailable';
    if (allFiles.length > 0 && !allFiles[0].isMock) return 'live';
    if (allFiles.length > 0 && allFiles[0].isMock) return 'simulated';
    return isNative ? 'live' : 'simulated';
  }, [loadError, hasPermission, isNative, allFiles]);

  const loadStorageFiles = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoadError(null);
      const permGranted = await storageService.hasStoragePermission();
      setHasPermission(permGranted);

      const [cats, mediaRes] = await Promise.all([
        storageService.getStorageCategories(forceRefresh),
        storageService.getMediaFiles({
          category: activeFilter,
          minSizeBytes,
          sortOption,
          limit: 100,
        }, forceRefresh),
      ]);

      setCategories(cats);
      setAllFiles(mediaRes.files);
      setDiagnostics(mediaRes.diagnostics);
    } catch (err: any) {
      console.error('Error fetching storage files:', err);
      setLoadError(err?.message || 'Failed to query MediaStore files.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, minSizeBytes, sortOption]);

  useEffect(() => {
    let active = true;

    // Defer heavy initial fetch until navigation transitions finish
    const task = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          if (active) setLoading(true);
          const permGranted = await storageService.hasStoragePermission();
          if (!active) return;
          setHasPermission(permGranted);

          const [cats, mediaRes] = await Promise.all([
            storageService.getStorageCategories(),
            storageService.getMediaFiles({
              category: activeFilter,
              minSizeBytes,
              sortOption,
              limit: 100,
            }),
          ]);

          if (!active) return;
          setCategories(cats);
          setAllFiles(mediaRes.files);
          setDiagnostics(mediaRes.diagnostics);
        } catch (err: any) {
          console.error('Error fetching storage files:', err);
          if (active) setLoadError(err?.message || 'Failed to query MediaStore files.');
        } finally {
          if (active) setLoading(false);
        }
      })();
    });

    return () => {
      active = false;
      task.cancel();
      // Stop audio playback when switching filters
      storageService.stopAudio().catch(() => {});
    };
  }, [activeFilter, minSizeBytes, sortOption]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    storageService.invalidateCache();
    loadStorageFiles(true);
  }, [loadStorageFiles]);

  const handleRequestPermission = async () => {
    const granted = await storageService.requestPermission();
    setHasPermission(granted);
    if (granted) {
      storageService.invalidateCache();
      loadStorageFiles(true);
    }
  };

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
    setSelectedIds(new Set(allFiles.map((f) => f.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Selected files list and total bytes
  const selectedFilesList = useMemo(() => {
    return allFiles.filter((f) => selectedIds.has(f.id));
  }, [allFiles, selectedIds]);

  const selectedTotalBytes = useMemo(() => {
    return selectedFilesList.reduce((acc, f) => acc + f.sizeBytes, 0);
  }, [selectedFilesList]);

  // Audio Playback Handlers
  const handlePlayAudio = async (item: StorageItem) => {
    if (!item.contentUri) return;
    const res = await storageService.playAudio(item.contentUri);
    setPlaybackState(res);
  };

  const handlePauseAudio = async () => {
    const res = await storageService.pauseAudio();
    setPlaybackState(res);
  };

  const handleCleanupComplete = (result: FileDeletionResult) => {
    if (result.status === 'success') {
      deselectAll();
      storageService.invalidateCache();
      loadStorageFiles(true);
    }
  };

  const allFilesTotalBytes = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.sizeBytes, 0);
  }, [categories]);

  const showPermissionDenied = !hasPermission && isNative;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.inner}>
          {/* Header */}
          <Header
            title="Storage Explorer"
            subtitle="Android MediaStore media inspection &amp; candidate review"
            badgeText={
              filesStatus === 'live'
                ? 'LIVE DEVICE DATA'
                : filesStatus === 'unavailable'
                ? 'UNAVAILABLE'
                : 'SIMULATED DATA'
            }
            badgeVariant={
              filesStatus === 'live'
                ? 'success'
                : filesStatus === 'unavailable'
                ? 'error'
                : 'warning'
            }
          />

          {/* Data Source Indicator */}
          <DataSourceIndicator
            status={filesStatus}
            sourceName="Android MediaStore Cursors"
            errorMessage={
              loadError ||
              (!hasPermission && isNative
                ? 'Media permissions not granted. Android MediaStore access is restricted.'
                : null)
            }
            onRetry={onRefresh}
          />

          {/* Permission-Denied State */}
          {showPermissionDenied ? (
            <EmptyState
              type="permission"
              icon="lock-closed"
              title="Media Permission Required"
              description="To inspect your device storage for videos, photos, audio, and downloads, Android requires user authorization for MediaStore read access. No private app documents or system files are inspected."
              actionLabel="Grant Media Permission"
              onAction={handleRequestPermission}
            />
          ) : (
            <>
              {/* Deep Storage Analyzer Entry Banner */}
              <Pressable
                onPress={() => router.push('/deep-cleanup')}
                style={({ pressed }) => [
                  styles.deepScanBanner,
                  { backgroundColor: `${theme.primary}12`, borderColor: theme.primary },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open Deep Storage Analyzer"
              >
                <View style={[styles.deepScanIcon, { backgroundColor: theme.primary }]}>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginHorizontal: Spacing.three }}>
                  <Text style={[Typography.labelLarge, { color: theme.text }]}>
                    Deep Storage Analyzer
                  </Text>
                  <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                    Analyze screenshots, APKs, documents &amp; user-granted SAF folders
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.primary} />
              </Pressable>

              {/* Category Breakdown Chips */}
              <CategoryBreakdown
                categories={categories}
                activeFilter={activeFilter}
                onSelectCategory={setActiveFilter}
                allFilesTotalBytes={allFilesTotalBytes}
              />

              {/* Sort & Filter Controls */}
              <StorageFilterBar
                sortOption={sortOption}
                onSortChange={setSortOption}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                minSizeBytes={minSizeBytes}
                onMinSizeBytesChange={setMinSizeBytes}
                showViewToggle={activeFilter === 'all' || activeFilter === 'images' || activeFilter === 'videos'}
              />

              {/* Diagnostic Telemetry Banner */}
              {diagnostics && (
                <CategoryDiagnosticBanner
                  diagnostics={diagnostics}
                  category={activeFilter}
                />
              )}

              {/* Loading State */}
              {loading && allFiles.length === 0 ? (
                <View style={styles.loadingWrapper}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text
                    style={[
                      Typography.bodySmall,
                      { color: theme.textSecondary, marginTop: Spacing.two },
                    ]}
                  >
                    Querying device MediaStore for {activeFilter}...
                  </Text>
                </View>
              ) : allFiles.length === 0 ? (
                <EmptyState
                  title={
                    diagnostics?.permissionStatus === 'denied'
                      ? 'Permission Required'
                      : diagnostics?.queryError
                      ? 'Unable to Load Files'
                      : minSizeBytes > 0
                      ? `No Files Found (> ${formatBytes(minSizeBytes)})`
                      : `No ${activeFilter.toUpperCase()} Files Found`
                  }
                  description={
                    diagnostics?.queryError
                      ? diagnostics.queryError
                      : minSizeBytes > 0
                      ? 'No files matching the active size threshold exist in this category.'
                      : `No accessible files were returned by Android MediaStore for the "${activeFilter}" category.`
                  }
                  actionLabel={minSizeBytes > 0 ? 'Clear Size Filter' : 'Show All Categories'}
                  onAction={() => {
                    if (minSizeBytes > 0) setMinSizeBytes(0);
                    else setActiveFilter('all');
                  }}
                />
              ) : (
                /* File List / Grid */
                <FileListSection
                  files={allFiles}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                  viewMode={viewMode}
                  onPreview={(item) => setPreviewItem(item)}
                  playbackState={playbackState}
                  onPlayAudio={handlePlayAudio}
                  onPauseAudio={handlePauseAudio}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Selection Bar for Cleanup Review */}
      {selectedIds.size > 0 && !showPermissionDenied && (
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
              Review items before system consent
            </Text>
          </View>
          <Button
            label="Review Cleanup"
            onPress={() => setCleanupModalVisible(true)}
            variant="filled"
            icon="trash-outline"
            size="sm"
            style={{ backgroundColor: theme.error }}
          />
        </View>
      )}

      {/* Cleanup Review Modal */}
      <CleanupPreviewModal
        visible={cleanupModalVisible}
        selectedFiles={selectedFilesList}
        onClose={() => setCleanupModalVisible(false)}
        onDeselectItem={toggleSelect}
        onCleanupComplete={handleCleanupComplete}
      />

      {/* Media Preview Modal (Image & Video Player) */}
      <MediaPreviewModal
        visible={Boolean(previewItem)}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onToggleSelect={toggleSelect}
        isSelected={previewItem ? selectedIds.has(previewItem.id) : false}
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
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
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
  deepScanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  deepScanIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
