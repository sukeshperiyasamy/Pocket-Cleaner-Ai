import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'subtle';
  padding?: keyof typeof Spacing;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'four',
}) => {
  const theme = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor:
      variant === 'subtle' ? theme.surfaceSubtle : theme.card,
    borderColor: variant === 'outlined' ? theme.border : theme.borderSubtle,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[padding],
  };

  return <View style={[styles.base, cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
