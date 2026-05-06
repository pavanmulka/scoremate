import { getPlayerStandings } from './scoreCalculator';
import type { Match, SavedPlayer } from './types';

export type PlayerStats = {
  name: string;
  matchesPlayed: number;
  wins: number;
  roundsPlayed: number;
  totalScore: number;
  averageScore: number;
  bestLowRound: number | null;
  bestHighRound: number | null;
  savedUsageCount: number;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function createEmptyStats(name: string, savedUsageCount = 0): PlayerStats {
  return {
    name,
    matchesPlayed: 0,
    wins: 0,
    roundsPlayed: 0,
    totalScore: 0,
    averageScore: 0,
    bestLowRound: null,
    bestHighRound: null,
    savedUsageCount,
  };
}

function getOrCreateStats(statsByName: Map<string, PlayerStats>, name: string) {
  const normalizedName = normalizeName(name);
  const existingStats = statsByName.get(normalizedName);

  if (existingStats) {
    return existingStats;
  }

  const stats = createEmptyStats(name);
  statsByName.set(normalizedName, stats);
  return stats;
}

export function buildPlayerStats(matches: Match[], savedPlayers: SavedPlayer[]) {
  const statsByName = new Map<string, PlayerStats>();

  savedPlayers.forEach((savedPlayer) => {
    statsByName.set(normalizeName(savedPlayer.name), createEmptyStats(savedPlayer.name, savedPlayer.matchCount));
  });

  matches.forEach((match) => {
    const standings = getPlayerStandings(match);
    const explicitWinners = standings.filter((standing) => standing.isWinner);
    const completedLeaders = match.status === 'completed' ? standings.filter((standing) => standing.isLeader) : [];
    const winningPlayerIds = new Set((explicitWinners.length > 0 ? explicitWinners : completedLeaders).map((standing) => standing.player.id));

    match.players.forEach((player) => {
      const stats = getOrCreateStats(statsByName, player.name);
      const playerScores = match.rounds
        .map((round) => round.scores.find((score) => score.playerId === player.id)?.score)
        .filter((score): score is number => typeof score === 'number');

      stats.name = player.name;
      stats.matchesPlayed += 1;
      stats.roundsPlayed += playerScores.length;
      stats.totalScore += playerScores.reduce((total, score) => total + score, 0);

      if (winningPlayerIds.has(player.id)) {
        stats.wins += 1;
      }

      playerScores.forEach((score) => {
        stats.bestLowRound = stats.bestLowRound === null ? score : Math.min(stats.bestLowRound, score);
        stats.bestHighRound = stats.bestHighRound === null ? score : Math.max(stats.bestHighRound, score);
      });
    });
  });

  return Array.from(statsByName.values())
    .map((stats) => ({
      ...stats,
      averageScore: stats.roundsPlayed > 0 ? stats.totalScore / stats.roundsPlayed : 0,
    }))
    .sort((first, second) => {
      if (second.wins !== first.wins) {
        return second.wins - first.wins;
      }

      if (second.matchesPlayed !== first.matchesPlayed) {
        return second.matchesPlayed - first.matchesPlayed;
      }

      return first.name.localeCompare(second.name);
    });
}
