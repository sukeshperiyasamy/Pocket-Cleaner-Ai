import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ChatMessage } from '@/types';
import { Badge } from '@/components/Badge';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const theme = useTheme();
  const isUser = message.sender === 'user';

  const handleAction = () => {
    if (message.suggestedAction?.route) {
      router.push(message.suggestedAction.route as any);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {!isUser && (
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.aiContainer },
          ]}
        >
          <Ionicons name="sparkles" size={14} color={theme.aiAccent} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme.primary, borderBottomRightRadius: 4 }
            : {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                borderBottomLeftRadius: 4,
              },
        ]}
      >
        {!isUser && (
          <View style={styles.assistantHeader}>
            <Text style={[Typography.labelSmall, { color: theme.aiAccent }]}>
              Offline Assistant
            </Text>
            {message.isMock && (
              <Badge label="Mock Engine" variant="warning" size="sm" />
            )}
          </View>
        )}

        <Text
          style={[
            Typography.bodyMedium,
            { color: isUser ? '#FFFFFF' : theme.text },
          ]}
          selectable
        >
          {message.text}
        </Text>

        {message.suggestedAction && (
          <Pressable
            onPress={handleAction}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.backgroundElement },
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={message.suggestedAction.label}
          >
            <Ionicons name="open-outline" size={14} color={theme.primary} />
            <Text style={[Typography.labelMedium, { color: theme.primary }]}>
              {message.suggestedAction.label}
            </Text>
          </Pressable>
        )}

        <View style={styles.footerRow}>
          <Text
            style={[
              Typography.labelSmall,
              { color: isUser ? 'rgba(255,255,255,0.7)' : theme.textMuted },
            ]}
          >
            {message.timestamp}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.two,
    flexDirection: 'row',
    maxWidth: '88%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
    gap: Spacing.two,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubble: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    marginTop: Spacing.three,
    alignSelf: 'flex-start',
  },
  footerRow: {
    marginTop: Spacing.one,
    alignSelf: 'flex-end',
  },
});
