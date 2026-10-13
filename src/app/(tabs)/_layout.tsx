import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Typography } from '@/constants/theme';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const baseHeight = Platform.OS === 'android' ? 62 : 54;
  const bottomInset = insets.bottom;
  const bottomPadding =
    bottomInset > 0
      ? bottomInset + (Platform.OS === 'android' ? 4 : 2)
      : Platform.OS === 'android'
      ? 8
      : 10;
  const totalHeight =
    baseHeight + (bottomInset > 0 ? bottomInset : Platform.OS === 'android' ? 8 : 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        lazy: true,
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.tabBarBorder,
          height: totalHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          borderTopWidth: 1,
          elevation: 8,
        },
        tabBarLabelStyle: {
          ...Typography.labelSmall,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="assistant"
        options={{
          title: 'AI Assistant',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'sparkles' : 'sparkles-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="storage"
        options={{
          title: 'Storage',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'folder' : 'folder-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="performance"
        options={{
          title: 'Performance',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'speedometer' : 'speedometer-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
