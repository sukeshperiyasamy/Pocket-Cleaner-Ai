import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { MockBanner } from '@/components/MockBanner';
import { Button } from '@/components/Button';
import { RamDetailsCard } from '@/features/performance/RamDetailsCard';
import { AndroidMemoryArchitectureCard } from '@/features/performance/AndroidMemoryArchitectureCard';
import { RecommendationsList } from '@/features/performance/RecommendationsList';
import { getMemorySummary, memoryService } from '@/services';
import { MemorySummary, MemoryRecommendation } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, Typography } from '@/constants/theme';

export default function PerformanceScreen() {
  const theme = useTheme();
  const [memory, setMemory] = useState<MemorySummary | null>(null);
  const [recommendations, setRecommendations] = useState<MemoryRecommendation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getMemorySummary(),
      memoryService.getMemoryRecommendations(),
    ])
      .then(([mem, recs]) => {
        if (!active) return;
        setMemory(mem);
        setRecommendations(recs);
      })
      .catch((err: any) => {
        if (!active) return;
        console.error('Failed to load performance metrics:', err);
        setError(err?.message || 'Failed to query system memory.');
      });

    return () => {
      active = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [mem, recs] = await Promise.all([
        getMemorySummary(),
        memoryService.getMemoryRecommendations(),
      ]);
      setMemory(mem);
      setRecommendations(recs);
    } catch (err: any) {
      console.error('Failed to load performance metrics:', err);
      setError(err?.message || 'Failed to query system memory.');
    } finally {
      setRefreshing(false);
    }
  }, []);

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
            title="Performance Insights"
            subtitle="Android system telemetry & honest memory management"
            badgeText={memory?.isMock ? 'Simulated' : 'ActivityManager'}
            badgeVariant={memory?.isMock ? 'warning' : 'success'}
          />

          {error && (
            <View style={[styles.errorContainer, { backgroundColor: theme.errorContainer }]}>
              <Text style={[Typography.bodyMedium, { color: theme.error }]}>
                {error}
              </Text>
              <Button
                label="Retry"
                size="sm"
                variant="outlined"
                onPress={loadPerformanceData}
                style={{ marginTop: Spacing.two }}
              />
            </View>
          )}

          {memory?.isMock && (
            <MockBanner customMessage="RAM figures shown are simulated AOSP metrics because the app is running in the Expo Go sandbox. In a custom development build, real telemetry is queried via the native Kotlin DeviceMetricsModule." />
          )}

          {/* RAM Breakdown & Pressure */}
          <RamDetailsCard summary={memory} />

          {/* Educational OS Architecture Card */}
          <AndroidMemoryArchitectureCard />

          {/* Recommendations List */}
          <RecommendationsList recommendations={recommendations} />
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
  errorContainer: {
    padding: Spacing.three,
    borderRadius: 8,
    marginBottom: Spacing.three,
  },
});
