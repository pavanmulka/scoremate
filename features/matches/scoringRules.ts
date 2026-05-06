import type { Match, ScoringMode, ScoringRule } from './types';

export const DEFAULT_OUT_LIMIT = 300;
export const DEFAULT_TARGET_SCORE = 500;

export type ScoringPreset = {
  mode: ScoringMode;
  title: string;
  description: string;
  inputLabel?: string;
  defaultTargetScore?: number;
};

export const scoringPresets: ScoringPreset[] = [
  {
    mode: 'outLimit',
    title: 'Out limit scoring',
    description: 'Lowest total leads. Players are out when they reach the limit.',
    inputLabel: 'Out limit',
    defaultTargetScore: DEFAULT_OUT_LIMIT,
  },
  {
    mode: 'highestScoreWins',
    title: 'Highest score wins',
    description: 'Highest total leads. Good for points-based games.',
  },
  {
    mode: 'lowestScoreWins',
    title: 'Lowest score wins',
    description: 'Lowest total leads. Good for penalty-style games.',
  },
  {
    mode: 'firstToTarget',
    title: 'First to target',
    description: 'Highest total leads. First player to reach the target wins.',
    inputLabel: 'Target score',
    defaultTargetScore: DEFAULT_TARGET_SCORE,
  },
];

export function getScoringPreset(mode: ScoringMode) {
  return scoringPresets.find((preset) => preset.mode === mode) ?? scoringPresets[0];
}

export function modeNeedsTarget(mode: ScoringMode) {
  return mode === 'outLimit' || mode === 'firstToTarget';
}

export function createScoringRule(mode: ScoringMode, targetScore?: number): ScoringRule {
  return {
    mode,
    ...(modeNeedsTarget(mode) ? { targetScore } : {}),
  };
}

export function getScoringRule(match: Match): ScoringRule {
  if (match.scoringRule) {
    return match.scoringRule;
  }

  return {
    mode: 'outLimit',
    targetScore: match.outLimit || DEFAULT_OUT_LIMIT,
  };
}

export function getScoringRuleTitle(rule: ScoringRule) {
  return getScoringPreset(rule.mode).title;
}

export function getScoringRuleSummary(match: Match) {
  const rule = getScoringRule(match);

  if (rule.mode === 'outLimit') {
    return `Out limit ${rule.targetScore ?? match.outLimit}`;
  }

  if (rule.mode === 'firstToTarget') {
    return `First to ${rule.targetScore ?? DEFAULT_TARGET_SCORE}`;
  }

  return getScoringRuleTitle(rule);
}

export function isLowerScoreBetter(mode: ScoringMode) {
  return mode === 'outLimit' || mode === 'lowestScoreWins';
}
