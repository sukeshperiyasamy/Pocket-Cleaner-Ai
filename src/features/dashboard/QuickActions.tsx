import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface QuickActionsProps {
  onScanStorage: () => void;
  scanning?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onScanStorage,
  scanning = false,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[Typography.h3, { color: theme.text, marginBottom: Spacing.three }]}>
        Quick Actions
      </Text>

      <View style={styles.actionsGrid}>
        {/* Action 1: Deep Storage Analyzer */}
        <Pressable
          onPress={() => router.push('/deep-cleanup')}
          style={({ pressed }) => [
            styles.actionCardWrapper,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Deep Storage Analyzer"
        >
          <Card style={styles.actionCard} variant="outlined">
            <View
              style={[
                styles.iconBubble,
                { backgroundColor: theme.primaryContainer },
              ]}
            >
              <Ionicons
                name="scan-outline"
                size={22}
                color={theme.primary}
              />
            </View>
            <Text style={[Typography.labelLarge, { color: theme.text }]}>
              Deep Cleaner
            </Text>
            <Text
              style={[Typography.bodySmall, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              Screenshots, APKs &amp; SAF
            </Text>
          </Card>
        </Pressable>

        {/* Action 2: Ask AI */}
        <Pressable
          onPress={() => router.push('/assistant')}
          style={({ pressed }) => [
            styles.actionCardWrapper,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Ask AI Assistant"
        >
          <Card style={styles.actionCard} variant="outlined">
            <View
              style={[
                styles.iconBubble,
                { backgroundColor: theme.aiContainer },
              ]}
            >
              <Ionicons name="sparkles" size={22} color={theme.aiAccent} />
            </View>
            <Text style={[Typography.labelLarge, { color: theme.text }]}>
              Ask AI
            </Text>
            <Text
              style={[Typography.bodySmall, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              Natural language questions
            </Text>
          </Card>
        </Pressable>

        {/* Action 3: Performance Insights */}
        <Pressable
          onPress={() => router.push('/performance')}
          style={({ pressed }) => [
            styles.actionCardWrapper,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Performance Insights"
        >
          <Card style={styles.actionCard} variant="outlined">
            <View
              style={[
                styles.iconBubble,
                { backgroundColor: theme.infoContainer },
              ]}
            >
              <Ionicons name="pulse-outline" size={22} color={theme.info} />
            </View>
            <Text style={[Typography.labelLarge, { color: theme.text }]}>
              Performance
            </Text>
            <Text
              style={[Typography.bodySmall, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              Memory facts & genuine tips
            </Text>
          </Card>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionCardWrapper: {
    flex: 1,
  },
  actionCard: {
    padding: Spacing.three,
    alignItems: 'center',
    textAlign: 'center',
    gap: Spacing.one,
    minHeight: 130,
    justifyContent: 'center',
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
});
