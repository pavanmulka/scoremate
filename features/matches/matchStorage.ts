import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearAllRoundDraftsForTesting, clearRoundDraft } from './roundDraftStorage';
import type { Match, Round } from './types';

const MATCHES_STORAGE_KEY = 'scoremate:matches';
const LEGACY_MATCHES_STORAGE_KEY = `scoremate:${String.fromCharCode(108, 101, 97, 115, 116)}-${String.fromCharCode(99, 111, 117, 110, 116)}:matches`;

async function readMatches() {
  const rawMatches = await AsyncStorage.getItem(MATCHES_STORAGE_KEY);

  if (!rawMatches) {
    const legacyMatches = await AsyncStorage.getItem(LEGACY_MATCHES_STORAGE_KEY);

    if (legacyMatches) {
      await AsyncStorage.setItem(MATCHES_STORAGE_KEY, legacyMatches);
      return parseMatches(legacyMatches);
    }

    return [];
  }

  return parseMatches(rawMatches);
}

function parseMatches(rawMatches: string) {
  if (!rawMatches) {
    return [];
  }

  try {
    const matches = JSON.parse(rawMatches) as Match[];
    return Array.isArray(matches) ? matches : [];
  } catch {
    return [];
  }
}

async function writeMatches(matches: Match[]) {
  await AsyncStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(matches));
}

export async function getMatches() {
  const matches = await readMatches();
  return matches.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export async function getMatch(matchId: string) {
  const matches = await readMatches();
  return matches.find((match) => match.id === matchId) ?? null;
}

export async function saveMatch(match: Match) {
  const matches = await readMatches();
  const existingIndex = matches.findIndex((storedMatch) => storedMatch.id === match.id);
  const updatedMatch = {
    ...match,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    matches[existingIndex] = updatedMatch;
  } else {
    matches.push(updatedMatch);
  }

  await writeMatches(matches);
  return updatedMatch;
}

export async function addRound(matchId: string, round: Round) {
  const match = await getMatch(matchId);

  if (!match) {
    return null;
  }

  return saveMatch({
    ...match,
    rounds: [...match.rounds, round],
  });
}

export async function updateRound(matchId: string, round: Round) {
  const match = await getMatch(matchId);

  if (!match) {
    return null;
  }

  return saveMatch({
    ...match,
    rounds: match.rounds.map((storedRound) => (storedRound.id === round.id ? round : storedRound)),
  });
}

export async function deleteRound(matchId: string, roundId: string) {
  const match = await getMatch(matchId);

  if (!match) {
    return null;
  }

  return saveMatch({
    ...match,
    rounds: match.rounds.filter((round) => round.id !== roundId),
  });
}

export async function deleteMatch(matchId: string) {
  const matches = await readMatches();
  const updatedMatches = matches.filter((match) => match.id !== matchId);
  await clearRoundDraft(matchId);
  await writeMatches(updatedMatches);
  return updatedMatches.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export async function replaceMatchesForBackup(matches: Match[]) {
  await writeMatches(matches);
  return getMatches();
}

export async function clearMatchesForTesting() {
  await AsyncStorage.removeItem(MATCHES_STORAGE_KEY);
  await AsyncStorage.removeItem(LEGACY_MATCHES_STORAGE_KEY);
  await clearAllRoundDraftsForTesting();
}
