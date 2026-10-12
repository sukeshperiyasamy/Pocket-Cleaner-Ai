import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ProgressBarProps {
  percentage: number; // 0 to 100
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  color,
  trackColor,
  height = 8,
  style,
}) => {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, percentage));
  const activeColor = color || theme.primary;
  const inactiveTrack = trackColor || theme.backgroundElement;

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: inactiveTrack, borderRadius: Radius.pill },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: activeColor,
            borderRadius: Radius.pill,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
