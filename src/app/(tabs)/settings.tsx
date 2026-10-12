import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { MockBanner } from '@/components/MockBanner';
import { LocalAIStatusCard } from '@/features/settings/LocalAIStatusCard';
import { ModelManagementCard } from '@/features/settings/ModelManagementCard';
import { PrivacyGuaranteesCard } from '@/features/settings/PrivacyGuaranteesCard';
import { AppInfoCard } from '@/features/settings/AppInfoCard';
import { settingsService } from '@/services';
import { LocalAIModelInfo, AppMetadata } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const [modelInfo, setModelInfo] = useState<LocalAIModelInfo | null>(null);
  const [metadata, setMetadata] = useState<AppMetadata | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const info = await settingsService.getLocalAIStatus();
        const meta = settingsService.getAppMetadata();
        setModelInfo(info);
        setMetadata(meta);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
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
            title="Settings & Privacy"
            subtitle="Local AI engine, privacy guarantees, and open-source info"
            badgeText="FOSS"
            badgeVariant="primary"
          />

          <MockBanner customMessage="Phase 1 Settings View. No personal data, telemetry keys, or credentials are required or stored." />

          {/* Local AI Status */}
          {modelInfo && <LocalAIStatusCard modelInfo={modelInfo} />}

          {/* Model Management / Preflight Hardware Checklist */}
          {modelInfo && <ModelManagementCard modelInfo={modelInfo} />}

          {/* Privacy & Offline Guarantee */}
          <PrivacyGuaranteesCard />

          {/* App Info & Open Source License */}
          {metadata && <AppInfoCard metadata={metadata} />}
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
