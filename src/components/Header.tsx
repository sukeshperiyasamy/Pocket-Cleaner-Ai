import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Typography } from '@/constants/theme';
import { Badge } from './Badge';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'ai' | 'neutral';
  rightElement?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  badgeText,
  badgeVariant = 'ai',
  rightElement,
  style,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textColumn}>
        <View style={styles.titleRow}>
          <Text style={[Typography.h2, { color: theme.text }]}>{title}</Text>
          {badgeText && (
            <Badge label={badgeText} variant={badgeVariant} size="sm" />
          )}
        </View>
        {subtitle && (
          <Text
            style={[
              Typography.bodySmall,
              { color: theme.textSecondary, marginTop: Spacing.half },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement && <View style={styles.rightWrapper}>{rightElement}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    marginBottom: Spacing.two,
  },
  textColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  rightWrapper: {
    marginLeft: Spacing.two,
  },
});
