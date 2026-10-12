import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { MockBanner } from '@/components/MockBanner';
import { RamDetailsCard } from '@/features/performance/RamDetailsCard';
import { AndroidMemoryArchitectureCard } from '@/features/performance/AndroidMemoryArchitectureCard';
import { RecommendationsList } from '@/features/performance/RecommendationsList';
import { getMemorySummary, memoryService } from '@/services';
import { MemorySummary, MemoryRecommendation } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function PerformanceScreen() {
  const theme = useTheme();
  const [memory, setMemory] = useState<MemorySummary | null>(null);
  const [recommendations, setRecommendations] = useState<MemoryRecommendation[]>([]);

  useEffect(() => {
    async function loadPerformanceData() {
      try {
        const [mem, recs] = await Promise.all([
          getMemorySummary(),
          memoryService.getMemoryRecommendations(),
        ]);
        setMemory(mem);
        setRecommendations(recs);
      } catch (err) {
        console.error('Failed to load performance metrics:', err);
      }
    }
    loadPerformanceData();
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
      >
        <View style={styles.inner}>
          {/* Header */}
          <Header
            title="Performance Insights"
            subtitle="Android system telemetry & honest memory management"
            badgeText="Evidence-Based"
            badgeVariant="info"
          />

          <MockBanner customMessage="RAM figures shown are simulated AOSP ActivityManager.MemoryInfo metrics. In Phase 2, this screen will read real memory telemetry through a custom Kotlin native module." />

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
});
