export type Player = {
  id: string;
  name: string;
  teamName?: string;
};

export type SavedPlayer = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  matchCount: number;
};

export type PlayerScore = {
  playerId: string;
  score: number;
};

export type Round = {
  id: string;
  createdAt: string;
  scores: PlayerScore[];
};

export type ScoringMode = 'outLimit' | 'highestScoreWins' | 'lowestScoreWins' | 'firstToTarget';

export type ScoringRule = {
  mode: ScoringMode;
  targetScore?: number;
};

export type MatchStatus = 'active' | 'completed';

export type Match = {
  id: string;
  name: string;
  outLimit: number;
  scoringRule?: ScoringRule;
  gamePresetId?: string;
  gamePresetName?: string;
  status?: MatchStatus;
  completedAt?: string;
  players: Player[];
  rounds: Round[];
  createdAt: string;
  updatedAt: string;
};

export type PlayerStanding = {
  player: Player;
  total: number;
  isOut: boolean;
  isLeader: boolean;
  isWinner: boolean;
};

export type TeamStanding = {
  teamName: string;
  total: number;
  memberCount: number;
  isLeader: boolean;
};

export type DraftMatch = {
  name: string;
  scoringRule: ScoringRule;
  outLimit?: number;
};
