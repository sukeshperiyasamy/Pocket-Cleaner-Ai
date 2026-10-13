import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

import { DataSourceStatus } from '@/types';

export interface MockBannerProps {
  customMessage?: string;
  status?: DataSourceStatus;
  title?: string;
}

export const MockBanner: React.FC<MockBannerProps> = ({
  customMessage,
  status = 'simulated',
  title,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const isLive = status === 'live';
  const isUnavailable = status === 'unavailable';

  const defaultTitle = isLive
    ? 'LIVE DEVICE DATA'
    : isUnavailable
    ? 'UNAVAILABLE'
    : 'SIMULATED DATA';

  const iconName = isLive
    ? ('checkmark-circle' as const)
    : isUnavailable
    ? ('alert-circle-outline' as const)
    : ('flask-outline' as const);

  const containerBg = isLive
    ? theme.successContainer
    : isUnavailable
    ? theme.errorContainer
    : theme.warningContainer;

  const containerBorder = isLive
    ? theme.success
    : isUnavailable
    ? theme.error
    : theme.warning;

  const textColor = isLive
    ? theme.onSuccessContainer
    : isUnavailable
    ? theme.onErrorContainer
    : theme.onWarningContainer;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: containerBg,
          borderColor: containerBorder,
        },
      ]}
    >
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.headerRow}
        accessibilityRole="button"
        accessibilityLabel="Toggle data status notice"
      >
        <Ionicons name={iconName} size={18} color={textColor} />
        <View style={styles.titleContainer}>
          <Text style={[Typography.labelMedium, { color: textColor, fontWeight: '700' }]}>
            {title || defaultTitle}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={textColor}
        />
      </Pressable>

      <Text style={[Typography.bodySmall, { color: textColor, marginTop: 4 }]}>
        {customMessage ||
          (isLive
            ? 'Real device measurements queried live via native Android Kotlin module.'
            : isUnavailable
            ? 'Native Android module call failed and no valid live result exists.'
            : 'Values displayed on this screen are realistic mock fixtures. In this sandbox/fallback environment, real Android permissions and hardware queries are simulated.')}
      </Text>

      {expanded && (
        <View style={[styles.contentBody, { borderTopColor: containerBorder }]}>
          <Text style={[Typography.bodySmall, { color: textColor }]}>
            {isLive
              ? 'Inspected live via Android StatFs, ActivityManager, and MediaStore. 100% on-device & private.'
              : isUnavailable
              ? 'Check Settings → Native Diagnostics for detailed JSI, build, and permission error traces.'
              : 'To view real hardware readings, launch the custom Expo development build with native DeviceMetrics module on a physical Android device.'}
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
