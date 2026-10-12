import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'empty' | 'permission' | 'error';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'folder-open-outline',
  actionLabel,
  onAction,
  type = 'empty',
}) => {
  const theme = useTheme();

  const getIconColor = () => {
    switch (type) {
      case 'permission':
        return theme.warning;
      case 'error':
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceSubtle,
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor:
              type === 'permission'
                ? theme.warningContainer
                : theme.backgroundElement,
          },
        ]}
      >
        <Ionicons name={icon} size={32} color={getIconColor()} />
      </View>

      <Text style={[Typography.h3, { color: theme.text, textAlign: 'center' }]}>
        {title}
      </Text>

      <Text
        style={[
          Typography.bodySmall,
          {
            color: theme.textSecondary,
            textAlign: 'center',
            marginTop: Spacing.two,
            marginBottom: actionLabel ? Spacing.four : 0,
          },
        ]}
      >
        {description}
      </Text>

      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="tonal"
          size="sm"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.five,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: Spacing.three,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
});
