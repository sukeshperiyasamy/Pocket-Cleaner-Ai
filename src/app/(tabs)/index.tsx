import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  RefreshControl,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { MockBanner } from '@/components/MockBanner';
import { StorageOverviewCard } from '@/features/dashboard/StorageOverviewCard';
import { RamOverviewCard } from '@/features/dashboard/RamOverviewCard';
import { QuickActions } from '@/features/dashboard/QuickActions';
import { RecentScansSection } from '@/features/dashboard/RecentScansSection';
import {
  getStorageSummary,
  getMemorySummary,
  getRecentScans,
  storageService,
} from '@/services';
import { StorageSummary, MemorySummary, RecentScanInfo } from '@/types';
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

  const fetchDashboardData = useCallback(async () => {
    try {
      const [storageData, memoryData, scanData] = await Promise.all([
        getStorageSummary().catch((e) => {
          setStorageError('Could not query storage filesystem: ' + e.message);
          return null;
        }),
        getMemorySummary().catch((e) => {
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

    return () => {
      active = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setStorageError(null);
    setMemoryError(null);
    fetchDashboardData();
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
            badgeText={isNative ? 'Native Build Active' : 'Expo Go Preview'}
            badgeVariant={isNative ? 'success' : 'warning'}
          />

          {/* Banner: Only show mock notice if not running native build */}
          {!isNative ? (
            <MockBanner customMessage="Running in Expo Go sandbox. Storage and RAM values above are simulated fallbacks. Build with `npx expo run:android` to view real physical phone measurements." />
          ) : (
            <MockBanner customMessage="Phase 2 Active: Storage and RAM readings are measured live from your Android device using StatFs and ActivityManager. File deletion remains strictly disabled." />
          )}

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
