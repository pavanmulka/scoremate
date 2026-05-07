import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { languageNames, translations } from './translations';
import { supportedLanguageCodes, type LanguagePreference, type SupportedLanguageCode, type TranslationKey } from './types';

export const LANGUAGE_STORAGE_KEY = 'scoremate_language';

const listeners = new Set<() => void>();

function notifyLanguageListeners() {
  listeners.forEach((listener) => listener());
}

function normalizeLanguageCode(languageCode: string | undefined): SupportedLanguageCode {
  const baseLanguage = languageCode?.split('-')[0]?.toLowerCase();

  if (supportedLanguageCodes.some((supportedCode) => supportedCode === baseLanguage)) {
    return baseLanguage as SupportedLanguageCode;
  }

  return 'en';
}

export function getSystemLanguageCode(): SupportedLanguageCode {
  try {
    return normalizeLanguageCode(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'en';
  }
}

export async function getLanguagePreference(): Promise<LanguagePreference> {
  const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (storedLanguage === 'system' || supportedLanguageCodes.some((languageCode) => languageCode === storedLanguage)) {
    return storedLanguage as LanguagePreference;
  }

  return 'system';
}

export async function setLanguagePreference(languagePreference: LanguagePreference) {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languagePreference);
  notifyLanguageListeners();
}

export async function clearLanguagePreferenceForTesting() {
  await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY);
  notifyLanguageListeners();
}

export function getResolvedLanguageCode(languagePreference: LanguagePreference): SupportedLanguageCode {
  return languagePreference === 'system' ? getSystemLanguageCode() : languagePreference;
}

export function getLanguagePreferenceLabel(languagePreference: LanguagePreference) {
  return languagePreference === 'system' ? 'System default' : languageNames[languagePreference];
}

export function getResolvedLanguageLabel(languagePreference: LanguagePreference) {
  const resolvedLanguage = getResolvedLanguageCode(languagePreference);
  return languageNames[resolvedLanguage];
}

export function useI18n() {
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>('system');

  const loadLanguagePreference = useCallback(() => {
    let isActive = true;

    getLanguagePreference().then((storedLanguagePreference) => {
      if (isActive) {
        setLanguagePreferenceState(storedLanguagePreference);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const cleanupLoad = loadLanguagePreference();

    listeners.add(loadLanguagePreference);

    return () => {
      cleanupLoad();
      listeners.delete(loadLanguagePreference);
    };
  }, [loadLanguagePreference]);

  const languageCode = getResolvedLanguageCode(languagePreference);

  const t = useCallback(
    (key: TranslationKey) => translations[languageCode][key] ?? translations.en[key],
    [languageCode],
  );

  return useMemo(
    () => ({
      languageCode,
      languagePreference,
      languagePreferenceLabel: getLanguagePreferenceLabel(languagePreference),
      resolvedLanguageLabel: getResolvedLanguageLabel(languagePreference),
      t,
    }),
    [languageCode, languagePreference, t],
  );
}

export { languageNames, supportedLanguageCodes };
export type { LanguagePreference, SupportedLanguageCode, TranslationKey };
