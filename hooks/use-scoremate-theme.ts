import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { defaultScoreMateTheme, getSelectedTheme, type ScoreMateTheme } from '@/features/matches/themeStorage';

export function useScoreMateTheme() {
  const [theme, setTheme] = useState<ScoreMateTheme>(defaultScoreMateTheme);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getSelectedTheme().then((storedTheme) => {
        if (isActive) {
          setTheme(storedTheme);
        }
      });

      return () => {
        isActive = false;
      };
    }, []),
  );

  return theme;
}
