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

  const fetchDashboardData = useCallback(async () => {
    try {
      const [storageData, memoryData, scanData] = await Promise.all([
        getStorageSummary(),
        getMemorySummary(),
        getRecentScans(),
      ]);
      setStorage(storageData);
      setMemory(memoryData);
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
      getStorageSummary(),
      getMemorySummary(),
      getRecentScans(),
    ])
      .then(([storageData, memoryData, scanData]) => {
        if (!active) return;
        setStorage(storageData);
        setMemory(memoryData);
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
            subtitle="Private, on-device storage & memory inspector"
            badgeText="100% Offline"
            badgeVariant="ai"
          />

          {/* Prominent Mock Data Banner */}
          <MockBanner />

          {/* Quick Actions */}
          <QuickActions
            onScanStorage={handleSimulateScan}
            scanning={scanning}
          />

          {/* Storage Overview Card */}
          <StorageOverviewCard summary={storage} loading={loading} />

          {/* RAM Overview Card */}
          <RamOverviewCard summary={memory} loading={loading} />

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
