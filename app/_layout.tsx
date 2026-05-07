import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ fullScreenGestureEnabled: true, gestureEnabled: true, headerBackTitle: 'Back' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'ScoreMate' }} />
          <Stack.Screen name="matches/create" options={{ title: 'Create Match' }} />
          <Stack.Screen name="matches/scoreboard" options={{ title: 'Scoreboard' }} />
          <Stack.Screen name="matches/edit-round" options={{ title: 'Edit Round' }} />
          <Stack.Screen name="matches/settings" options={{ title: 'Match Settings' }} />
          <Stack.Screen name="matches/app-settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="matches/stats" options={{ title: 'Player Stats' }} />
          <Stack.Screen name="matches/backup" options={{ title: 'Backup & Restore' }} />
          <Stack.Screen name="matches/themes" options={{ title: 'Themes' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
