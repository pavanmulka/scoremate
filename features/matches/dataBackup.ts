import { getMatches, replaceMatchesForBackup } from './matchStorage';
import { getSavedPlayers, replaceSavedPlayersForBackup } from './playerStorage';
import { getSelectedTheme, setSelectedTheme, type ScoreMateThemeId } from './themeStorage';
import type { Match, SavedPlayer } from './types';

export type ScoreMateBackup = {
  app: 'ScoreMate';
  version: 1;
  exportedAt: string;
  themeId?: ScoreMateThemeId;
  matches: Match[];
  savedPlayers: SavedPlayer[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringField(value: Record<string, unknown>, field: string) {
  return typeof value[field] === 'string';
}

function isMatch(value: unknown): value is Match {
  if (!isRecord(value)) {
    return false;
  }

  return hasStringField(value, 'id') && hasStringField(value, 'name') && Array.isArray(value.players) && Array.isArray(value.rounds);
}

function isSavedPlayer(value: unknown): value is SavedPlayer {
  if (!isRecord(value)) {
    return false;
  }

  return hasStringField(value, 'id') && hasStringField(value, 'name');
}

export async function createScoreMateBackup(): Promise<ScoreMateBackup> {
  const [matches, savedPlayers, theme] = await Promise.all([getMatches(), getSavedPlayers(), getSelectedTheme()]);

  return {
    app: 'ScoreMate',
    version: 1,
    exportedAt: new Date().toISOString(),
    themeId: theme.id,
    matches,
    savedPlayers,
  };
}

export function stringifyBackup(backup: ScoreMateBackup) {
  return JSON.stringify(backup, null, 2);
}

export function parseScoreMateBackup(rawBackup: string): ScoreMateBackup {
  const parsedBackup = JSON.parse(rawBackup) as unknown;

  if (!isRecord(parsedBackup)) {
    throw new Error('Backup must be a JSON object.');
  }

  if (parsedBackup.app !== 'ScoreMate' || parsedBackup.version !== 1) {
    throw new Error('This is not a supported ScoreMate backup.');
  }

  if (!Array.isArray(parsedBackup.matches) || !Array.isArray(parsedBackup.savedPlayers)) {
    throw new Error('Backup is missing matches or saved players.');
  }

  if (!parsedBackup.matches.every(isMatch) || !parsedBackup.savedPlayers.every(isSavedPlayer)) {
    throw new Error('Backup data is not valid.');
  }

  return {
    app: 'ScoreMate',
    version: 1,
    exportedAt: typeof parsedBackup.exportedAt === 'string' ? parsedBackup.exportedAt : new Date().toISOString(),
    themeId: typeof parsedBackup.themeId === 'string' ? (parsedBackup.themeId as ScoreMateThemeId) : undefined,
    matches: parsedBackup.matches,
    savedPlayers: parsedBackup.savedPlayers,
  };
}

export async function restoreScoreMateBackup(backup: ScoreMateBackup) {
  await Promise.all([replaceMatchesForBackup(backup.matches), replaceSavedPlayersForBackup(backup.savedPlayers)]);

  if (backup.themeId) {
    await setSelectedTheme(backup.themeId);
  }
}
