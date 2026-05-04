import type { Match, PlayerStanding, Round } from './types';

export function calculatePlayerTotal(playerId: string, rounds: Round[]) {
  return rounds.reduce((total, round) => {
    const score = round.scores.find((playerScore) => playerScore.playerId === playerId)?.score ?? 0;
    return total + score;
  }, 0);
}

export function getPlayerStandings(match: Match): PlayerStanding[] {
  const standings = match.players.map((player) => {
    const total = calculatePlayerTotal(player.id, match.rounds);

    return {
      player,
      total,
      isOut: total >= match.outLimit,
      isWinner: false,
    };
  });

  const activeStandings = standings.filter((standing) => !standing.isOut);
  const winnerId = activeStandings.length === 1 ? activeStandings[0].player.id : null;

  return standings.map((standing) => ({
    ...standing,
    isWinner: standing.player.id === winnerId,
  }));
}

export function getActivePlayerIds(match: Match) {
  return getPlayerStandings(match)
    .filter((standing) => !standing.isOut)
    .map((standing) => standing.player.id);
}
