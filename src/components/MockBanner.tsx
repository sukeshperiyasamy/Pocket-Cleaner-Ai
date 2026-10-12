import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

export interface MockBannerProps {
  customMessage?: string;
}

export const MockBanner: React.FC<MockBannerProps> = ({ customMessage }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.warningContainer,
          borderColor: theme.warning,
        },
      ]}
    >
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.headerRow}
        accessibilityRole="button"
        accessibilityLabel="Toggle sample data notice"
      >
        <Ionicons name="flask-outline" size={18} color={theme.onWarningContainer} />
        <View style={styles.titleContainer}>
          <Text style={[Typography.labelMedium, { color: theme.onWarningContainer }]}>
            Phase 1 MVP • Simulated Sample Data
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.onWarningContainer}
        />
      </Pressable>

      {expanded && (
        <View style={styles.contentBody}>
          <Text style={[Typography.bodySmall, { color: theme.onWarningContainer }]}>
            {customMessage ||
              'Values displayed on this screen are realistic mock fixtures. In this foundation phase, the app does not request Android storage permissions, scan personal files, or execute destructive operations. 100% on-device & private.'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleContainer: {
    flex: 1,
  },
  contentBody: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
