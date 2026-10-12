import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PromptSuggestion } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface PromptChipsProps {
  suggestions: PromptSuggestion[];
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

export const PromptChips: React.FC<PromptChipsProps> = ({
  suggestions,
  onSelectPrompt,
  disabled = false,
}) => {
  const theme = useTheme();

  const getCategoryIcon = (
    cat: PromptSuggestion['category']
  ): keyof typeof Ionicons.glyphMap => {
    switch (cat) {
      case 'storage':
        return 'pie-chart-outline';
      case 'cleanup':
        return 'trash-bin-outline';
      case 'performance':
        return 'speedometer-outline';
      default:
        return 'chatbubble-ellipses-outline';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[Typography.labelSmall, { color: theme.textSecondary, marginBottom: Spacing.two }]}>
        SUGGESTED QUESTIONS
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelectPrompt(item.prompt)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
              pressed && {
                backgroundColor: theme.primaryContainer,
                borderColor: theme.primary,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <Ionicons
              name={getCategoryIcon(item.category)}
              size={14}
              color={theme.primary}
            />
            <Text style={[Typography.labelMedium, { color: theme.text }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.two,
  },
  scrollContent: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
