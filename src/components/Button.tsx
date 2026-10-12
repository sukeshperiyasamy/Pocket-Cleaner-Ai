import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'tonal' | 'outlined' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'filled',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const theme = useTheme();

  const getContainerStyles = (): ViewStyle => {
    let bg: string = theme.primary;
    let border: string = 'transparent';
    let borderWidth: number = 0;

    switch (variant) {
      case 'filled':
        bg = theme.primary;
        break;
      case 'tonal':
        bg = theme.primaryContainer;
        break;
      case 'outlined':
        bg = 'transparent';
        border = theme.border;
        borderWidth = 1.5;
        break;
      case 'danger':
        bg = theme.errorContainer;
        break;
      case 'ghost':
        bg = 'transparent';
        break;
    }

    if (disabled) {
      bg = theme.backgroundElement;
      border = 'transparent';
    }

    const minHeight = size === 'sm' ? 38 : size === 'lg' ? 54 : 48;

    return {
      backgroundColor: bg,
      borderColor: border,
      borderWidth,
      minHeight,
      paddingHorizontal: size === 'sm' ? Spacing.three : Spacing.four,
      paddingVertical: size === 'sm' ? Spacing.two : Spacing.three,
      borderRadius: Radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      opacity: disabled ? 0.6 : 1,
    };
  };

  const getTextColor = (): string => {
    if (disabled) return theme.textMuted;
    switch (variant) {
      case 'filled':
        return '#FFFFFF';
      case 'tonal':
        return theme.onPrimaryContainer;
      case 'outlined':
        return theme.text;
      case 'danger':
        return theme.onErrorContainer;
      case 'ghost':
        return theme.primary;
      default:
        return '#FFFFFF';
    }
  };

  const textColor = getTextColor();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        getContainerStyles(),
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={textColor}
            />
          )}
          <Text
            style={[
              Typography.labelLarge,
              { color: textColor },
              size === 'sm' && Typography.labelMedium,
              textStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
