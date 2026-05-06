import type { Match, PlayerStanding, Round, TeamStanding } from './types';
import { getGamePreset } from './gamePresets';
import { DEFAULT_TARGET_SCORE, getScoringRule, getScoringRuleSummary, isLowerScoreBetter } from './scoringRules';

export type BestSingleRound = {
  playerName: string;
  score: number;
  roundNumber: number;
};

export type RoundBestCount = {
  playerName: string;
  count: number;
};

export type MatchInsights = {
  status: 'Live' | 'Completed';
  gamePresetLabel: string | null;
  ruleSummary: string;
  roundsPlayed: number;
  leaderLabel: 'Winner' | 'Current leader';
  leader: PlayerStanding | null;
  teamStandings: TeamStanding[];
  roundBestCounts: RoundBestCount[];
  bestSingleRound: BestSingleRound | null;
  bestSingleRoundLabel: 'Lowest' | 'Highest';
  outPlayers: string[];
};

export function calculatePlayerTotal(playerId: string, rounds: Round[]) {
  return rounds.reduce((total, round) => {
    const score = round.scores.find((playerScore) => playerScore.playerId === playerId)?.score ?? 0;
    return total + score;
  }, 0);
}

export function getPlayerStandings(match: Match): PlayerStanding[] {
  const rule = getScoringRule(match);
  const lowerScoreBetter = isLowerScoreBetter(rule.mode);
  const standings = match.players.map((player) => {
    const total = calculatePlayerTotal(player.id, match.rounds);
    const isOut = rule.mode === 'outLimit' && total >= (rule.targetScore ?? match.outLimit);

    return {
      player,
      total,
      isOut,
      isLeader: false,
      isWinner: false,
    };
  });

  const activeStandings = standings.filter((standing) => !standing.isOut);
  const leaderPool = rule.mode === 'outLimit' ? activeStandings : standings;
  const bestLeaderTotal =
    match.rounds.length > 0 && leaderPool.length > 0
      ? lowerScoreBetter
        ? Math.min(...leaderPool.map((standing) => standing.total))
        : Math.max(...leaderPool.map((standing) => standing.total))
      : null;

  const winnerIds = new Set<string>();

  if (rule.mode === 'outLimit' && activeStandings.length === 1) {
    winnerIds.add(activeStandings[0].player.id);
  }

  if (rule.mode === 'firstToTarget') {
    const targetScore = rule.targetScore ?? DEFAULT_TARGET_SCORE;
    const qualifiedStandings = standings.filter((standing) => standing.total >= targetScore);
    const winningTotal = qualifiedStandings.length > 0 ? Math.max(...qualifiedStandings.map((standing) => standing.total)) : null;

    qualifiedStandings.forEach((standing) => {
      if (standing.total === winningTotal) {
        winnerIds.add(standing.player.id);
      }
    });
  }

  return standings.map((standing) => ({
    ...standing,
    isLeader: bestLeaderTotal !== null && standing.total === bestLeaderTotal && (rule.mode !== 'outLimit' || !standing.isOut),
    isWinner: winnerIds.has(standing.player.id),
  }));
}

export function getActivePlayerIds(match: Match) {
  return getPlayerStandings(match)
    .filter((standing) => !standing.isOut)
    .map((standing) => standing.player.id);
}

export function hasTeamScoring(match: Match) {
  return new Set(match.players.map((player) => player.teamName).filter(Boolean)).size > 1;
}

export function getTeamStandings(match: Match): TeamStanding[] {
  const standings = getPlayerStandings(match);
  const lowerScoreBetter = isLowerScoreBetter(getScoringRule(match).mode);
  const teamTotals = new Map<string, TeamStanding>();

  standings.forEach((standing) => {
    if (!standing.player.teamName) {
      return;
    }

    const existingTeam = teamTotals.get(standing.player.teamName);

    if (existingTeam) {
      existingTeam.total += standing.total;
      existingTeam.memberCount += 1;
      return;
    }

    teamTotals.set(standing.player.teamName, {
      teamName: standing.player.teamName,
      total: standing.total,
      memberCount: 1,
      isLeader: false,
    });
  });

  const teams = Array.from(teamTotals.values());
  const leaderTotal =
    teams.length > 0
      ? lowerScoreBetter
        ? Math.min(...teams.map((team) => team.total))
        : Math.max(...teams.map((team) => team.total))
      : null;

  return teams
    .map((team) => ({
      ...team,
      isLeader: leaderTotal !== null && team.total === leaderTotal,
    }))
    .sort((first, second) => {
      if (first.isLeader !== second.isLeader) {
        return first.isLeader ? -1 : 1;
      }

      return lowerScoreBetter ? first.total - second.total : second.total - first.total;
    });
}

export function getMatchInsights(match: Match): MatchInsights {
  const rule = getScoringRule(match);
  const lowerScoreBetter = isLowerScoreBetter(rule.mode);
  const standings = getPlayerStandings(match).sort((first, second) => (lowerScoreBetter ? first.total - second.total : second.total - first.total));
  const teamStandings = getTeamStandings(match);
  const leader = standings.find((standing) => standing.isWinner) ?? standings.find((standing) => standing.isLeader) ?? standings[0];
  const outPlayers = standings.filter((standing) => standing.isOut).map((standing) => standing.player.name);
  const roundBestCounts = new Map<string, number>();
  let bestSingleRound: BestSingleRound | null = null;

  for (const [roundIndex, round] of match.rounds.entries()) {
    const playedScores = round.scores.filter((score) => Number.isFinite(score.score));

    if (playedScores.length === 0) {
      continue;
    }

    const bestRoundScore = lowerScoreBetter ? Math.min(...playedScores.map((score) => score.score)) : Math.max(...playedScores.map((score) => score.score));

    for (const score of playedScores) {
      if (score.score === bestRoundScore) {
        roundBestCounts.set(score.playerId, (roundBestCounts.get(score.playerId) ?? 0) + 1);
      }
    }

    for (const score of playedScores) {
      const player = match.players.find((storedPlayer) => storedPlayer.id === score.playerId);

      if (!player) {
        continue;
      }

      if (!bestSingleRound || (lowerScoreBetter ? score.score < bestSingleRound.score : score.score > bestSingleRound.score)) {
        bestSingleRound = {
          playerName: player.name,
          score: score.score,
          roundNumber: roundIndex + 1,
        };
      }
    }
  }

  return {
    status: match.status === 'completed' ? 'Completed' : 'Live',
    gamePresetLabel: match.gamePresetName ?? getGamePreset(match.gamePresetId)?.shortTitle ?? null,
    ruleSummary: getScoringRuleSummary(match),
    roundsPlayed: match.rounds.length,
    leaderLabel: leader?.isWinner ? 'Winner' : 'Current leader',
    leader: leader ?? null,
    teamStandings,
    roundBestCounts: standings.map((standing) => ({
      playerName: standing.player.name,
      count: roundBestCounts.get(standing.player.id) ?? 0,
    })),
    bestSingleRound,
    bestSingleRoundLabel: lowerScoreBetter ? 'Lowest' : 'Highest',
    outPlayers,
  };
}

export function getMatchSummaryText(match: Match) {
  const insights = getMatchInsights(match);
  const roundBestLine =
    insights.roundsPlayed === 0
      ? 'Round bests: No rounds yet'
      : `Round bests: ${insights.roundBestCounts.map((roundBest) => `${roundBest.playerName} ${roundBest.count}`).join(', ')}`;
  const outLine = getScoringRule(match).mode === 'outLimit' ? (insights.outPlayers.length > 0 ? `Out: ${insights.outPlayers.join(', ')}` : 'Out: None') : null;
  const teamLine =
    insights.teamStandings.length > 1 ? `Team totals: ${insights.teamStandings.map((team) => `${team.teamName} ${team.total}`).join(', ')}` : null;

  return [
    `Status: ${insights.status}`,
    insights.gamePresetLabel ? `Game: ${insights.gamePresetLabel}` : null,
    `Rule: ${insights.ruleSummary}`,
    `Rounds played: ${insights.roundsPlayed}`,
    insights.leader ? `${insights.leaderLabel}: ${insights.leader.player.name} (${insights.leader.total})` : 'Current leader: Not available',
    teamLine,
    roundBestLine,
    insights.bestSingleRound
      ? `${insights.bestSingleRoundLabel} single round: ${insights.bestSingleRound.playerName} scored ${insights.bestSingleRound.score} in round ${insights.bestSingleRound.roundNumber}`
      : 'Best single round: No rounds yet',
    outLine,
  ]
    .filter(Boolean)
    .join('\n');
}
