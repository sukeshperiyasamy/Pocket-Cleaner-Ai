import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
  InteractionManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StorageCandidate,
  CandidateCategory,
  AgeFilterDays,
  CategorySummaryInfo,
  NativeFolderAnalysisItem,
  NativePersistedDirectoryItem,
  NativeDeepScanDiagnostics,
} from '@/types/storageAnalysis';
import { FileDeletionResult } from '@/types/storage';
import { formatBytes } from '@/utils/formatters';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { storageAnalysisService } from '@/services/storageAnalysisService';
import { DeepCleanupCategoryCard } from '@/features/cleanup/DeepCleanupCategoryCard';
import { DeepCleanupCandidateRow } from '@/features/cleanup/DeepCleanupCandidateRow';
import { SafDirectoryPickerCard } from '@/features/cleanup/SafDirectoryPickerCard';
import { FolderAggregatesCard } from '@/features/cleanup/FolderAggregatesCard';
import { DeepCleanupReviewModal } from '@/features/cleanup/DeepCleanupReviewModal';

export default function DeepCleanupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Data states
  const [candidates, setCandidates] = useState<StorageCandidate[]>([]);
  const [folders, setFolders] = useState<NativeFolderAnalysisItem[]>([]);
  const [persistedDirectories, setPersistedDirectories] = useState<NativePersistedDirectoryItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<NativeDeepScanDiagnostics | null>(null);
  const [dataSourceStatus, setDataSourceStatus] = useState<'live' | 'simulated' | 'unavailable'>('live');

  // Loading & refresh states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPickerLoading, setIsPickerLoading] = useState<boolean>(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<CandidateCategory | 'all'>('all');
  const [selectedAgeDays, setSelectedAgeDays] = useState<AgeFilterDays>(0);
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'size_desc' | 'date_desc' | 'name_asc'>('size_desc');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Review modal state
  const [isReviewModalVisible, setIsReviewModalVisible] = useState<boolean>(false);

  // Load scan data
  const loadScanData = useCallback(async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
      storageAnalysisService.invalidateCache();
    }

    try {
      const dirs = await storageAnalysisService.getPersistedDirectoryUris();
      setPersistedDirectories(dirs);

      const scanResult = await storageAnalysisService.scanCandidates({ forceRefresh });
      setCandidates(scanResult.candidates);
      setFolders(scanResult.folders);
      setDiagnostics(scanResult.diagnostics);
      setDataSourceStatus(scanResult.dataSourceStatus);
    } catch (err) {
      console.warn('[DeepCleanupScreen] Scan error:', err);
      setDataSourceStatus('unavailable');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setIsLoading(true);
    loadScanData(true);
  }, [loadScanData]);

  useEffect(() => {
    let active = true;

    // Defer heavy storage candidate sweep until slide-in navigation finishes
    const task = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const dirs = await storageAnalysisService.getPersistedDirectoryUris();
          if (!active) return;
          setPersistedDirectories(dirs);

          const scanResult = await storageAnalysisService.scanCandidates();
          if (!active) return;
          setCandidates(scanResult.candidates);
          setFolders(scanResult.folders);
          setDiagnostics(scanResult.diagnostics);
          setDataSourceStatus(scanResult.dataSourceStatus);
        } catch (err) {
          if (!active) return;
          console.warn('[DeepCleanupScreen] Mount scan error:', err);
          setDataSourceStatus('unavailable');
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      })();
    });

    return () => {
      active = false;
      task.cancel();
      // Cancel native scan executor immediately when navigating back
      storageAnalysisService.cancelScan();
    };
  }, []);

  // SAF Directory Picker handler
  const handleOpenPicker = async () => {
    setIsPickerLoading(true);
    try {
      const result = await storageAnalysisService.openDirectoryPicker();
      if (result.success && result.treeUri) {
        await loadScanData();
      }
    } catch (err) {
      console.warn('[DeepCleanupScreen] SAF Picker failed:', err);
    } finally {
      setIsPickerLoading(false);
    }
  };

  const handleRevokeDirectory = async (treeUri: string) => {
    await storageAnalysisService.releasePersistedDirectoryUri(treeUri);
    await loadScanData();
  };

  // Summaries
  const categorySummaries = useMemo<CategorySummaryInfo[]>(() => {
    return storageAnalysisService.getCategorySummaries(candidates);
  }, [candidates]);

  // Filtered & Sorted candidates
  const filteredCandidates = useMemo<StorageCandidate[]>(() => {
    return storageAnalysisService.filterCandidates(candidates, {
      category: selectedCategory,
      minAgeDays: selectedAgeDays,
      searchQuery: debouncedSearch,
      sortBy,
    });
  }, [candidates, selectedCategory, selectedAgeDays, debouncedSearch, sortBy]);

  // Selected candidates objects for review
  const selectedCandidatesList = useMemo<StorageCandidate[]>(() => {
    return candidates.filter((c) => selectedIds.has(c.id));
  }, [candidates, selectedIds]);

  const totalSelectedBytes = useMemo<number>(() => {
    return selectedCandidatesList.reduce((sum, c) => sum + c.sizeBytes, 0);
  }, [selectedCandidatesList]);

  // Selection toggles
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredCandidates.every((c) => next.has(c.id));
      if (allSelected) {
        filteredCandidates.forEach((c) => next.delete(c.id));
      } else {
        filteredCandidates.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }, [filteredCandidates]);

  const handleDeselectSingle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleCleanupComplete = useCallback((_result: FileDeletionResult) => {
    setSelectedIds(new Set());
    loadScanData(true);
  }, [loadScanData]);

  const areAllFilteredSelected =
    filteredCandidates.length > 0 &&
    filteredCandidates.every((c) => selectedIds.has(c.id));

  const keyExtractor = useCallback((item: StorageCandidate) => item.id, []);

  const renderCandidateItem = useCallback(
    ({ item }: { item: StorageCandidate }) => (
      <DeepCleanupCandidateRow
        candidate={item}
        isSelected={selectedIds.has(item.id)}
        onToggleSelect={() => handleToggleSelect(item.id)}
      />
    ),
    [selectedIds, handleToggleSelect]
  );

  const listHeader = (
    <View>
      {/* Scope Disclosure Banner */}
      <View style={[styles.scopeBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="shield-outline" size={18} color={theme.primary} style={{ marginRight: 8, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: theme.text }}>Storage Boundaries: </Text>
            Scans accessible MediaStore collections and user-granted SAF folders. Private app sandboxes and unindexed root storage are excluded.
          </Text>
          {diagnostics && (
            <Text style={[Typography.labelSmall, { color: theme.textMuted, marginTop: 4 }]}>
              {`Candidates found: ${diagnostics.totalCandidates} (${diagnostics.mediaStoreCandidates} shared${diagnostics.safCandidates > 0 ? `, ${diagnostics.safCandidates} SAF` : ''}) · ${diagnostics.scanDurationMs}ms`}
            </Text>
          )}
        </View>
      </View>

      {/* Categories Carousel */}
      <View style={styles.sectionTitleRow}>
        <Text style={[Typography.h3, { color: theme.text }]}>Candidate Categories</Text>
        <Pressable
          onPress={() => setSelectedCategory('all')}
          accessibilityRole="button"
          accessibilityLabel="Show all categories"
        >
          <Text
            style={[
              Typography.labelSmall,
              { color: selectedCategory === 'all' ? theme.primary : theme.textSecondary },
            ]}
          >
            {selectedCategory === 'all' ? '● Showing All' : 'Show All'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        {categorySummaries.map((summary) => (
          <DeepCleanupCategoryCard
            key={summary.category}
            summary={summary}
            isSelected={selectedCategory === summary.category}
            onSelect={() =>
              setSelectedCategory(
                selectedCategory === summary.category ? 'all' : summary.category
              )
            }
          />
        ))}
      </ScrollView>

      {/* Age Filter Chips */}
      <View style={styles.ageFilterSection}>
        <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.one }]}>
          Filter by Inactivity (Last Modified Age):
        </Text>
        <View style={styles.chipRow}>
          {([0, 30, 90, 180, 365] as AgeFilterDays[]).map((days) => (
            <Pressable
              key={days}
              onPress={() => setSelectedAgeDays(days)}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedAgeDays === days ? theme.primary : theme.card,
                  borderColor: selectedAgeDays === days ? theme.primary : theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={days === 0 ? 'All ages' : `Older than ${days} days`}
            >
              <Text
                style={[
                  Typography.bodySmall,
                  {
                    color: selectedAgeDays === days ? '#FFFFFF' : theme.text,
                    fontWeight: selectedAgeDays === days ? '700' : '500',
                  },
                ]}
              >
                {days === 0 ? 'All Ages' : `> ${days}d`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* SAF Directory Picker Card */}
      <SafDirectoryPickerCard
        persistedDirectories={persistedDirectories}
        isPickerLoading={isPickerLoading}
        onOpenPicker={handleOpenPicker}
        onRevokeDirectory={handleRevokeDirectory}
      />

      {/* Folder Aggregation Card */}
      <FolderAggregatesCard folders={folders} />

      {/* Candidates Section Header & Search */}
      <View style={styles.candidatesHeader}>
        <View style={styles.candidateCountRow}>
          <Text style={[Typography.h3, { color: theme.text }]}>
            Candidates ({filteredCandidates.length})
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <Pressable
              onPress={() => {
                setSortBy((prev) =>
                  prev === 'size_desc'
                    ? 'date_desc'
                    : prev === 'date_desc'
                    ? 'name_asc'
                    : 'size_desc'
                );
              }}
              style={[
                styles.sortBtn,
                { borderColor: theme.border, backgroundColor: theme.surfaceSubtle },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Sort: currently ${sortBy}`}
            >
              <Ionicons name="swap-vertical" size={13} color={theme.text} />
              <Text style={[Typography.labelSmall, { color: theme.text, marginLeft: 3 }]}>
                {sortBy === 'size_desc' ? 'Size' : sortBy === 'date_desc' ? 'Date' : 'Name'}
              </Text>
            </Pressable>

            {filteredCandidates.length > 0 && (
              <Pressable
                onPress={handleSelectAllFiltered}
                style={styles.selectAllBtn}
                accessibilityRole="button"
                accessibilityLabel="Select or deselect all items"
              >
                <Ionicons
                  name={areAllFilteredSelected ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={theme.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[Typography.labelSmall, { color: theme.primary }]}>
                  {areAllFilteredSelected ? 'Deselect' : 'Select All'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: Spacing.two }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search filename, path, or reason..."
            placeholderTextColor={theme.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => setSearchInput('')} accessibilityRole="button">
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  const listEmpty = isLoading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.three }]}>
        Analyzing storage candidates...
      </Text>
    </View>
  ) : (
    <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Ionicons name="checkmark-done-circle-outline" size={48} color={theme.primary} />
      <Text style={[Typography.h3, { color: theme.text, marginTop: Spacing.three }]}>
        No Candidates Matching Criteria
      </Text>
      <Text style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.one }]}>
        Try clearing filters or adding folders via Storage Access Framework to inspect more directories.
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Back to previous screen"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>

        <View style={{ flex: 1, marginHorizontal: Spacing.two }}>
          <Text style={[Typography.h2, { color: theme.text }]} numberOfLines={1}>
            Deep Storage Analyzer
          </Text>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            Shared Media &amp; Indexed Storage Discovery
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Badge
            label={
              dataSourceStatus === 'live'
                ? 'LIVE DATA'
                : dataSourceStatus === 'simulated'
                ? 'SIMULATED'
                : 'UNAVAILABLE'
            }
            variant={
              dataSourceStatus === 'live'
                ? 'success'
                : dataSourceStatus === 'simulated'
                ? 'warning'
                : 'error'
            }
            size="sm"
          />
          <Pressable
            onPress={triggerRefresh}
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Refresh deep scan"
          >
            <Ionicons name="refresh" size={20} color={theme.primary} />
          </Pressable>
        </View>
      </View>

      <FlatList<StorageCandidate>
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        data={filteredCandidates}
        keyExtractor={keyExtractor}
        renderItem={renderCandidateItem}
        extraData={selectedIds}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadScanData(true)}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={<View style={{ height: 110 + insets.bottom }} />}
      />

      {/* Floating Bottom Action Bar */}
      {selectedCandidatesList.length > 0 && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          <View>
            <Text style={[Typography.labelLarge, { color: theme.text }]}>
              {selectedCandidatesList.length} candidate{selectedCandidatesList.length === 1 ? '' : 's'}
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              Total size: {formatBytes(totalSelectedBytes)}
            </Text>
          </View>

          <Button
            label={`Review & Clean (${formatBytes(totalSelectedBytes)})`}
            onPress={() => setIsReviewModalVisible(true)}
            variant="danger"
            size="md"
          />
        </View>
      )}

      {/* Review & Consent Modal */}
      <DeepCleanupReviewModal
        visible={isReviewModalVisible}
        selectedCandidates={selectedCandidatesList}
        onClose={() => setIsReviewModalVisible(false)}
        onDeselectItem={handleDeselectSingle}
        onCleanupComplete={handleCleanupComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  refreshBtn: {
    padding: 6,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  scopeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  categoriesScroll: {
    marginBottom: Spacing.three,
  },
  ageFilterSection: {
    marginBottom: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  candidatesHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  candidateCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: Spacing.five,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
