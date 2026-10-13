import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  RefreshControl,
  View,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { DataSourceIndicator } from '@/components/DataSourceIndicator';
import { StorageOverviewCard } from '@/features/dashboard/StorageOverviewCard';
import { RamOverviewCard } from '@/features/dashboard/RamOverviewCard';
import { QuickActions } from '@/features/dashboard/QuickActions';
import { RecentScansSection } from '@/features/dashboard/RecentScansSection';
import {
  getStorageSummary,
  getMemorySummary,
  getRecentScans,
  storageService,
  memoryService,
} from '@/services';
import { StorageSummary, MemorySummary, RecentScanInfo, DataSourceStatus } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function DashboardScreen() {
  const theme = useTheme();
  const [storage, setStorage] = useState<StorageSummary | null>(null);
  const [memory, setMemory] = useState<MemorySummary | null>(null);
  const [scans, setScans] = useState<RecentScanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);

  const isNative = storageService.isNativeAvailable();

  const dataSourceStatus: DataSourceStatus = useMemo(() => {
    if (storage?.dataSourceStatus === 'unavailable' || memory?.dataSourceStatus === 'unavailable') {
      return 'unavailable';
    }
    if (storage?.dataSourceStatus === 'live' && memory?.dataSourceStatus === 'live') {
      return 'live';
    }
    if (storage?.dataSourceStatus === 'simulated' || memory?.dataSourceStatus === 'simulated') {
      return 'simulated';
    }
    return isNative ? 'live' : 'simulated';
  }, [storage, memory, isNative]);

  const fetchDashboardData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const [storageData, memoryData, scanData] = await Promise.all([
        getStorageSummary(forceRefresh).catch((e) => {
          setStorageError('Could not query storage filesystem: ' + e.message);
          return null;
        }),
        getMemorySummary(forceRefresh).catch((e) => {
          setMemoryError('Could not query system memory: ' + e.message);
          return null;
        }),
        getRecentScans(),
      ]);
      if (storageData) setStorage(storageData);
      if (memoryData) setMemory(memoryData);
      setScans(scanData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const task = InteractionManager.runAfterInteractions(() => {
      Promise.all([
        getStorageSummary().catch((e) => {
          if (active) setStorageError('Could not query storage filesystem: ' + e.message);
          return null;
        }),
        getMemorySummary().catch((e) => {
          if (active) setMemoryError('Could not query system memory: ' + e.message);
          return null;
        }),
        getRecentScans(),
      ])
        .then(([storageData, memoryData, scanData]) => {
          if (!active) return;
          if (storageData) setStorage(storageData);
          if (memoryData) setMemory(memoryData);
          setScans(scanData);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Failed to load dashboard data:', error);
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
      task.cancel();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setStorageError(null);
    setMemoryError(null);
    storageService.invalidateCache();
    memoryService.invalidateCache();
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const handleSimulateScan = async () => {
    setScanning(true);
    try {
      const newStorage = await storageService.requestStorageScan();
      setStorage(newStorage);
      const updatedScans = await getRecentScans();
      setScans(updatedScans);
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setScanning(false);
    }
  };

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
            title="Offline AI Phone Assistant"
            subtitle="Android native storage & memory inspector"
            badgeText={
              dataSourceStatus === 'live'
                ? 'LIVE DEVICE DATA'
                : dataSourceStatus === 'unavailable'
                ? 'UNAVAILABLE'
                : 'SIMULATED DATA'
            }
            badgeVariant={
              dataSourceStatus === 'live'
                ? 'success'
                : dataSourceStatus === 'unavailable'
                ? 'error'
                : 'warning'
            }
          />

          {/* Data Source Indicator */}
          <DataSourceIndicator
            status={dataSourceStatus}
            sourceName="Android StatFs & ActivityManager"
            timestamp={storage?.lastScanTimestamp}
            errorMessage={
              storage?.dataSourceError ||
              memory?.dataSourceError ||
              storageError ||
              memoryError
            }
            onRetry={onRefresh}
          />

          {/* Quick Actions */}
          <QuickActions
            onScanStorage={handleSimulateScan}
            scanning={scanning}
          />

          {/* Storage Overview Card */}
          <StorageOverviewCard
            summary={storage}
            loading={loading}
            error={storageError}
            onRefresh={fetchDashboardData}
          />

          {/* RAM Overview Card */}
          <RamOverviewCard
            summary={memory}
            loading={loading}
            error={memoryError}
            onRefresh={fetchDashboardData}
          />

          {/* Recent Scans Section */}
          <RecentScansSection scans={scans} loading={loading} />
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.six,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
