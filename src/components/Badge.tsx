import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'ai' | 'neutral';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  style,
}) => {
  const theme = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: theme.primaryContainer, text: theme.onPrimaryContainer };
      case 'success':
        return { bg: theme.successContainer, text: theme.onSuccessContainer };
      case 'warning':
        return { bg: theme.warningContainer, text: theme.onWarningContainer };
      case 'error':
        return { bg: theme.errorContainer, text: theme.onErrorContainer };
      case 'info':
        return { bg: theme.infoContainer, text: theme.onInfoContainer };
      case 'ai':
        return { bg: theme.aiContainer, text: theme.onAiContainer };
      case 'neutral':
      default:
        return { bg: theme.backgroundElement, text: theme.textSecondary };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: size === 'sm' ? Spacing.two : Spacing.three,
          paddingVertical: size === 'sm' ? 2 : Spacing.one,
        },
        style,
      ]}
    >
      <Text
        style={[
          size === 'sm' ? Typography.labelSmall : Typography.labelMedium,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
