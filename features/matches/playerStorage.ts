import AsyncStorage from '@react-native-async-storage/async-storage';

import { createId } from './matchFactory';
import type { SavedPlayer } from './types';

const SAVED_PLAYERS_STORAGE_KEY = 'scoremate:saved-players';

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function sortSavedPlayers(players: SavedPlayer[]) {
  return [...players].sort((first, second) => {
    if (second.matchCount !== first.matchCount) {
      return second.matchCount - first.matchCount;
    }

    return second.updatedAt.localeCompare(first.updatedAt);
  });
}

async function readSavedPlayers() {
  const rawPlayers = await AsyncStorage.getItem(SAVED_PLAYERS_STORAGE_KEY);

  if (!rawPlayers) {
    return [];
  }

  try {
    const players = JSON.parse(rawPlayers) as SavedPlayer[];
    return Array.isArray(players) ? players : [];
  } catch {
    return [];
  }
}

async function writeSavedPlayers(players: SavedPlayer[]) {
  await AsyncStorage.setItem(SAVED_PLAYERS_STORAGE_KEY, JSON.stringify(players));
}

export async function getSavedPlayers() {
  const players = await readSavedPlayers();
  return sortSavedPlayers(players);
}

export async function savePlayerNames(playerNames: string[]) {
  const now = new Date().toISOString();
  const savedPlayers = await readSavedPlayers();
  const savedPlayersByName = new Map(savedPlayers.map((player) => [player.name.toLowerCase(), player]));

  playerNames.forEach((playerName) => {
    const normalizedName = normalizeName(playerName);

    if (!normalizedName) {
      return;
    }

    const existingPlayer = savedPlayersByName.get(normalizedName.toLowerCase());

    if (existingPlayer) {
      existingPlayer.name = normalizedName;
      existingPlayer.matchCount += 1;
      existingPlayer.updatedAt = now;
      return;
    }

    savedPlayersByName.set(normalizedName.toLowerCase(), {
      id: createId('saved-player'),
      name: normalizedName,
      createdAt: now,
      updatedAt: now,
      matchCount: 1,
    });
  });

  const updatedPlayers = sortSavedPlayers(Array.from(savedPlayersByName.values()));
  await writeSavedPlayers(updatedPlayers);
  return updatedPlayers;
}

export async function deleteSavedPlayer(savedPlayerId: string) {
  const savedPlayers = await readSavedPlayers();
  const updatedPlayers = savedPlayers.filter((player) => player.id !== savedPlayerId);
  await writeSavedPlayers(updatedPlayers);
  return sortSavedPlayers(updatedPlayers);
}

export async function clearSavedPlayers() {
  await AsyncStorage.removeItem(SAVED_PLAYERS_STORAGE_KEY);
  return [];
}

export async function replaceSavedPlayersForBackup(players: SavedPlayer[]) {
  const updatedPlayers = sortSavedPlayers(players);
  await writeSavedPlayers(updatedPlayers);
  return updatedPlayers;
}

export async function clearSavedPlayersForTesting() {
  return clearSavedPlayers();
}
