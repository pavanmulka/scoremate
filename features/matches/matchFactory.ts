import { getScoringRule } from './scoringRules';
import type { Match } from './types';

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createReplayMatch(match: Match): Match {
  const now = new Date().toISOString();
  const replayPlayers = match.players.map((player) => ({
    ...player,
    id: createId('player'),
  }));

  return {
    id: createId('match'),
    name: `${match.name} replay`,
    outLimit: match.outLimit,
    scoringRule: getScoringRule(match),
    gamePresetId: match.gamePresetId,
    gamePresetName: match.gamePresetName,
    status: 'active',
    players: replayPlayers,
    rounds: [],
    createdAt: now,
    updatedAt: now,
  };
}
