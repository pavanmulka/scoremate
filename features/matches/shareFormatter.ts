import { getScoringRule, getScoringRuleSummary, isLowerScoreBetter } from './scoringRules';
import { getPlayerStandings, getTeamStandings } from './scoreCalculator';
import { getGamePreset } from './gamePresets';
import type { Match, PlayerStanding } from './types';

function getStandingStatus(standing: PlayerStanding) {
  if (standing.isWinner) {
    return 'Winner';
  }

  if (standing.isOut) {
    return 'Out';
  }

  if (standing.isLeader) {
    return 'Leader';
  }

  return 'Active';
}

function formatRound(match: Match, roundIndex: number) {
  const round = match.rounds[roundIndex];
  const scores = match.players
    .map((player) => {
      const playerScore = round.scores.find((score) => score.playerId === player.id)?.score ?? 0;
      return `${player.name} ${playerScore}`;
    })
    .join(', ');

  return `Round ${roundIndex + 1}: ${scores}`;
}

export function formatMatchShareText(match: Match) {
  const rule = getScoringRule(match);
  const lowerScoreBetter = isLowerScoreBetter(rule.mode);
  const standings = getPlayerStandings(match).sort((first, second) => {
    if (first.isWinner !== second.isWinner) {
      return first.isWinner ? -1 : 1;
    }

    if (first.isLeader !== second.isLeader) {
      return first.isLeader ? -1 : 1;
    }

    return lowerScoreBetter ? first.total - second.total : second.total - first.total;
  });
  const winner = standings.find((standing) => standing.isWinner);
  const leader = winner ?? standings.find((standing) => standing.isLeader) ?? standings[0];
  const resultLabel = winner ? 'Winner' : 'Leader';
  const status = match.status === 'completed' ? 'Completed' : 'Live';
  const gamePresetLabel = match.gamePresetName ?? getGamePreset(match.gamePresetId)?.shortTitle;
  const teamStandings = getTeamStandings(match);

  return [
    'ScoreMate Scoreboard',
    '',
    `Match: ${match.name}`,
    gamePresetLabel ? `Game: ${gamePresetLabel}` : null,
    `Status: ${status}`,
    `Rule: ${getScoringRuleSummary(match)}`,
    `Rounds: ${match.rounds.length}`,
    leader ? `${resultLabel}: ${leader.player.name} (${leader.total})` : null,
    ...(teamStandings.length > 1
      ? ['', 'Team Totals', ...teamStandings.map((team, index) => `${index + 1}. ${team.teamName}: ${team.total} (${team.memberCount} players)`)]
      : []),
    '',
    'Totals',
    ...standings.map((standing, index) => `${index + 1}. ${standing.player.name}: ${standing.total} (${getStandingStatus(standing)})`),
    '',
    'Round History',
    ...(match.rounds.length > 0 ? match.rounds.map((_, index) => formatRound(match, index)) : ['No rounds yet']),
  ]
    .filter((line) => line !== null)
    .join('\n');
}
