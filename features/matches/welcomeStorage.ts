import AsyncStorage from '@react-native-async-storage/async-storage';

export const WELCOME_STORAGE_KEY = 'scoremate_has_seen_welcome';

export async function getHasSeenWelcome() {
  return (await AsyncStorage.getItem(WELCOME_STORAGE_KEY)) === 'true';
}

export async function markWelcomeSeen() {
  await AsyncStorage.setItem(WELCOME_STORAGE_KEY, 'true');
}

export async function clearWelcomeForTesting() {
  await AsyncStorage.removeItem(WELCOME_STORAGE_KEY);
}
