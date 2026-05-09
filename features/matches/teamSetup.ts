import type { Player } from './types';

export function assignPlayersToTeams(players: Player[], teamLabels: string[]) {
  if (teamLabels.length === 0) {
    return players.map((player) => ({ id: player.id, name: player.name }));
  }

  return players.map((player, index) => ({
    ...player,
    teamName: teamLabels[index % teamLabels.length],
  }));
}

export function getNextTeamSlot(teamLabels: string[], players: Player[], playersPerTeam: number) {
  const normalizedPlayersPerTeam = Math.max(1, playersPerTeam);
  let nextSlot: { teamName: string; playerNumber: number; count: number } | null = null;

  for (const teamName of teamLabels) {
    const count = players.filter((player) => player.teamName === teamName).length;

    if (count >= normalizedPlayersPerTeam) {
      continue;
    }

    if (!nextSlot || count < nextSlot.count) {
      nextSlot = {
        teamName,
        playerNumber: count + 1,
        count,
      };
    }
  }

  return nextSlot ? { teamName: nextSlot.teamName, playerNumber: nextSlot.playerNumber } : null;
}

export function getActiveTeamCount(players: Player[]) {
  return new Set(players.map((player) => player.teamName).filter(Boolean)).size;
}
