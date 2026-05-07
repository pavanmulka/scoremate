import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/src/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ fullScreenGestureEnabled: true, gestureEnabled: true, headerBackTitle: t('back') }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'ScoreMate' }} />
          <Stack.Screen name="matches/create" options={{ title: t('createMatch') }} />
          <Stack.Screen name="matches/scoreboard" options={{ title: 'Scoreboard' }} />
          <Stack.Screen name="matches/edit-round" options={{ title: 'Edit Round' }} />
          <Stack.Screen name="matches/settings" options={{ title: t('settings') }} />
          <Stack.Screen name="matches/app-settings" options={{ title: t('settings') }} />
          <Stack.Screen name="matches/stats" options={{ title: t('playerStats') }} />
          <Stack.Screen name="matches/backup" options={{ title: t('backupRestore') }} />
          <Stack.Screen name="matches/themes" options={{ title: t('themes') }} />
          <Stack.Screen name="matches/language" options={{ title: t('language') }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
