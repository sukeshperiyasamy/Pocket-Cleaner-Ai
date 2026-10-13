import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

// Prevent native splash screen from auto-hiding before initialization
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'light' ? DefaultTheme : DarkTheme;

  useEffect(() => {
    // Hide splash screen after layout mounts
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="deep-cleanup" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
