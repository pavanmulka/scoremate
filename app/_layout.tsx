import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="games/least-count/index" options={{ title: 'Least Count' }} />
        <Stack.Screen name="games/least-count/create-match" options={{ title: 'Create Match' }} />
        <Stack.Screen name="games/least-count/add-players" options={{ title: 'Add Players' }} />
        <Stack.Screen name="games/least-count/scoreboard" options={{ title: 'Scoreboard' }} />
        <Stack.Screen name="games/least-count/add-round" options={{ title: 'Add Round' }} />
        <Stack.Screen name="games/least-count/edit-round" options={{ title: 'Edit Round' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
