import AsyncStorage from '@react-native-async-storage/async-storage';

export const FREE_MATCH_LIMIT = 5;

export type Entitlements = {
  isPro: boolean;
};

const ENTITLEMENTS_STORAGE_KEY = 'scoremate:entitlements';

const defaultEntitlements: Entitlements = {
  isPro: false,
};

export async function getEntitlements() {
  const rawEntitlements = await AsyncStorage.getItem(ENTITLEMENTS_STORAGE_KEY);

  if (!rawEntitlements) {
    return defaultEntitlements;
  }

  try {
    return {
      ...defaultEntitlements,
      ...(JSON.parse(rawEntitlements) as Partial<Entitlements>),
    };
  } catch {
    return defaultEntitlements;
  }
}

export async function setProForTesting(isPro: boolean) {
  const entitlements: Entitlements = { isPro };
  await AsyncStorage.setItem(ENTITLEMENTS_STORAGE_KEY, JSON.stringify(entitlements));
  return entitlements;
}

export async function clearEntitlementsForTesting() {
  await AsyncStorage.removeItem(ENTITLEMENTS_STORAGE_KEY);
}

export function canCreateMatch(matchCount: number, entitlements: Entitlements) {
  return entitlements.isPro || matchCount < FREE_MATCH_LIMIT;
}
