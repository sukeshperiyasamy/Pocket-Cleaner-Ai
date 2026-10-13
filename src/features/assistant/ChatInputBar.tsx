import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  loading?: boolean;
  onCancel?: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSend,
  loading = false,
  onCancel,
}) => {
  const [text, setText] = useState('');
  const theme = useTheme();

  const handleSend = () => {
    if (loading && onCancel) {
      onCancel();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setText('');
  };

  const isSendDisabled = !loading && text.trim().length === 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
      ]}
    >
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.surfaceSubtle,
            borderColor: theme.borderSubtle,
          },
        ]}
        value={text}
        onChangeText={setText}
        placeholder={loading ? 'Generating response...' : 'Ask about storage, large files, or RAM...'}
        placeholderTextColor={theme.textMuted}
        multiline
        maxLength={500}
        editable={!loading}
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />

      <Pressable
        onPress={handleSend}
        disabled={isSendDisabled}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: loading
              ? theme.error
              : isSendDisabled
              ? theme.backgroundElement
              : theme.primary,
          },
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Stop generation' : 'Send message'}
        accessibilityState={{ disabled: isSendDisabled }}
      >
        {loading ? (
          <Ionicons name="stop" size={16} color="#FFFFFF" />
        ) : (
          <Ionicons
            name="arrow-up"
            size={20}
            color={isSendDisabled ? theme.textMuted : '#FFFFFF'}
          />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    paddingVertical: Platform.OS === 'ios' ? Spacing.two : Spacing.two,
    borderWidth: 1,
    ...Typography.bodyMedium,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
