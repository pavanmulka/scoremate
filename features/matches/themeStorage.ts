import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScoreMateThemeId =
  | 'classic'
  | 'ocean'
  | 'sunset'
  | 'forest'
  | 'graphite'
  | 'midnight'
  | 'neon'
  | 'royal'
  | 'candy'
  | 'india'
  | 'usa'
  | 'brazil'
  | 'canada'
  | 'japan'
  | 'mexico';

export type ScoreMateTheme = {
  id: ScoreMateThemeId;
  name: string;
  description: string;
  colors: {
    screen: string;
    hero: string;
    heroMuted: string;
    primary: string;
    primaryShadow: string;
    secondary: string;
    secondaryText: string;
    accent: string;
    softAccent: string;
    cardTint: string;
    border: string;
    logoBars: [string, string, string];
  };
};

const THEME_STORAGE_KEY = 'scoremate:theme';

export const scoreMateThemes: ScoreMateTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'ScoreMate default with navy, orange, and teal.',
    colors: {
      screen: '#EEF2F6',
      hero: '#172033',
      heroMuted: '#29354A',
      primary: '#F97316',
      primaryShadow: '#C2410C',
      secondary: '#DBEAFE',
      secondaryText: '#1D4ED8',
      accent: '#14B8A6',
      softAccent: '#D9F9F3',
      cardTint: '#FFF7ED',
      border: '#FDBA74',
      logoBars: ['#F4D35E', '#73D2DE', '#F95738'],
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue and teal for a calm score table.',
    colors: {
      screen: '#ECF7FA',
      hero: '#0F2F3A',
      heroMuted: '#17495A',
      primary: '#0891B2',
      primaryShadow: '#0E7490',
      secondary: '#CCFBF1',
      secondaryText: '#0F766E',
      accent: '#22D3EE',
      softAccent: '#CFFAFE',
      cardTint: '#F0FDFA',
      border: '#67E8F9',
      logoBars: ['#38BDF8', '#2DD4BF', '#A7F3D0'],
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm coral and amber for casual game nights.',
    colors: {
      screen: '#FFF4ED',
      hero: '#3A1E16',
      heroMuted: '#5B3024',
      primary: '#EA580C',
      primaryShadow: '#9A3412',
      secondary: '#FDE68A',
      secondaryText: '#92400E',
      accent: '#F43F5E',
      softAccent: '#FFE4E6',
      cardTint: '#FFFBEB',
      border: '#FDBA74',
      logoBars: ['#F59E0B', '#FB7185', '#F97316'],
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Green and lime accents with a focused table feel.',
    colors: {
      screen: '#F0F7F1',
      hero: '#132A1D',
      heroMuted: '#214632',
      primary: '#16A34A',
      primaryShadow: '#15803D',
      secondary: '#DCFCE7',
      secondaryText: '#166534',
      accent: '#84CC16',
      softAccent: '#ECFCCB',
      cardTint: '#F7FEE7',
      border: '#86EFAC',
      logoBars: ['#84CC16', '#22C55E', '#14B8A6'],
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Quiet neutral theme with sharp blue accents.',
    colors: {
      screen: '#F3F4F6',
      hero: '#18181B',
      heroMuted: '#27272A',
      primary: '#2563EB',
      primaryShadow: '#1D4ED8',
      secondary: '#E0E7FF',
      secondaryText: '#3730A3',
      accent: '#64748B',
      softAccent: '#E5E7EB',
      cardTint: '#F8FAFC',
      border: '#CBD5E1',
      logoBars: ['#60A5FA', '#94A3B8', '#A78BFA'],
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark table theme with electric blue and cyan.',
    colors: {
      screen: '#EAF0F8',
      hero: '#07111F',
      heroMuted: '#13233A',
      primary: '#2563EB',
      primaryShadow: '#1E40AF',
      secondary: '#E0F2FE',
      secondaryText: '#075985',
      accent: '#22D3EE',
      softAccent: '#DBEAFE',
      cardTint: '#EFF6FF',
      border: '#7DD3FC',
      logoBars: ['#22D3EE', '#60A5FA', '#818CF8'],
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Bright arcade-style green, pink, and blue.',
    colors: {
      screen: '#F6FFF7',
      hero: '#111827',
      heroMuted: '#1F2937',
      primary: '#10B981',
      primaryShadow: '#047857',
      secondary: '#FCE7F3',
      secondaryText: '#BE185D',
      accent: '#38BDF8',
      softAccent: '#ECFEFF',
      cardTint: '#F0FDF4',
      border: '#86EFAC',
      logoBars: ['#10B981', '#38BDF8', '#F472B6'],
    },
  },
  {
    id: 'royal',
    name: 'Royal',
    description: 'Deep indigo with gold accents for premium feel.',
    colors: {
      screen: '#F6F4FF',
      hero: '#24124D',
      heroMuted: '#37206B',
      primary: '#7C3AED',
      primaryShadow: '#5B21B6',
      secondary: '#FEF3C7',
      secondaryText: '#92400E',
      accent: '#F59E0B',
      softAccent: '#F3E8FF',
      cardTint: '#FFFBEB',
      border: '#C4B5FD',
      logoBars: ['#F59E0B', '#A78BFA', '#7C3AED'],
    },
  },
  {
    id: 'candy',
    name: 'Candy',
    description: 'Soft pink, mint, and sky tones for a light feel.',
    colors: {
      screen: '#FFF7FB',
      hero: '#3B2435',
      heroMuted: '#5B344D',
      primary: '#EC4899',
      primaryShadow: '#BE185D',
      secondary: '#CCFBF1',
      secondaryText: '#0F766E',
      accent: '#38BDF8',
      softAccent: '#FCE7F3',
      cardTint: '#F0FDFA',
      border: '#F9A8D4',
      logoBars: ['#EC4899', '#5EEAD4', '#38BDF8'],
    },
  },
  {
    id: 'india',
    name: 'India Flag',
    description: 'Saffron, white, green, and navy inspired by India.',
    colors: {
      screen: '#F8FAF5',
      hero: '#17321F',
      heroMuted: '#244C30',
      primary: '#FF9933',
      primaryShadow: '#C2410C',
      secondary: '#E8F5E9',
      secondaryText: '#138808',
      accent: '#000080',
      softAccent: '#EEF6FF',
      cardTint: '#FFF7ED',
      border: '#22C55E',
      logoBars: ['#FF9933', '#FFFFFF', '#138808'],
    },
  },
  {
    id: 'usa',
    name: 'USA Flag',
    description: 'Navy, red, and clean white inspired by the United States.',
    colors: {
      screen: '#F5F7FB',
      hero: '#1E3A8A',
      heroMuted: '#1D4ED8',
      primary: '#DC2626',
      primaryShadow: '#991B1B',
      secondary: '#DBEAFE',
      secondaryText: '#1E40AF',
      accent: '#FFFFFF',
      softAccent: '#FEE2E2',
      cardTint: '#EFF6FF',
      border: '#93C5FD',
      logoBars: ['#DC2626', '#FFFFFF', '#2563EB'],
    },
  },
  {
    id: 'brazil',
    name: 'Brazil Flag',
    description: 'Green, yellow, and blue inspired by Brazil.',
    colors: {
      screen: '#F3FAF0',
      hero: '#064E3B',
      heroMuted: '#047857',
      primary: '#16A34A',
      primaryShadow: '#166534',
      secondary: '#FEF9C3',
      secondaryText: '#854D0E',
      accent: '#FACC15',
      softAccent: '#DBEAFE',
      cardTint: '#F7FEE7',
      border: '#86EFAC',
      logoBars: ['#16A34A', '#FACC15', '#2563EB'],
    },
  },
  {
    id: 'canada',
    name: 'Canada Flag',
    description: 'Red and clean white inspired by Canada.',
    colors: {
      screen: '#F8FAFC',
      hero: '#7F1D1D',
      heroMuted: '#991B1B',
      primary: '#DC2626',
      primaryShadow: '#991B1B',
      secondary: '#FEE2E2',
      secondaryText: '#B91C1C',
      accent: '#FFFFFF',
      softAccent: '#F8FAFC',
      cardTint: '#FFF1F2',
      border: '#FCA5A5',
      logoBars: ['#DC2626', '#FFFFFF', '#DC2626'],
    },
  },
  {
    id: 'japan',
    name: 'Japan Flag',
    description: 'Minimal white and red inspired by Japan.',
    colors: {
      screen: '#F8FAFC',
      hero: '#3A0A0A',
      heroMuted: '#7F1D1D',
      primary: '#BC002D',
      primaryShadow: '#7F1D1D',
      secondary: '#FEE2E2',
      secondaryText: '#991B1B',
      accent: '#FFFFFF',
      softAccent: '#FFF1F2',
      cardTint: '#FFFFFF',
      border: '#FCA5A5',
      logoBars: ['#FFFFFF', '#BC002D', '#FFFFFF'],
    },
  },
  {
    id: 'mexico',
    name: 'Mexico Flag',
    description: 'Green, white, and red inspired by Mexico.',
    colors: {
      screen: '#F6FAF7',
      hero: '#123524',
      heroMuted: '#1F5337',
      primary: '#006847',
      primaryShadow: '#14532D',
      secondary: '#FEE2E2',
      secondaryText: '#CE1126',
      accent: '#CE1126',
      softAccent: '#DCFCE7',
      cardTint: '#FFF7ED',
      border: '#86EFAC',
      logoBars: ['#006847', '#FFFFFF', '#CE1126'],
    },
  },
];

export const defaultScoreMateTheme = scoreMateThemes[0];

export function getScoreMateTheme(themeId?: string | null) {
  return scoreMateThemes.find((theme) => theme.id === themeId) ?? defaultScoreMateTheme;
}

export async function getSelectedTheme() {
  const themeId = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  return getScoreMateTheme(themeId);
}

export async function setSelectedTheme(themeId: ScoreMateThemeId) {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
  return getScoreMateTheme(themeId);
}

export async function clearSelectedThemeForTesting() {
  await AsyncStorage.removeItem(THEME_STORAGE_KEY);
}
