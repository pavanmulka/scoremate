export type Player = {
  id: string;
  name: string;
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

export type Match = {
  id: string;
  name: string;
  outLimit: number;
  players: Player[];
  rounds: Round[];
  createdAt: string;
  updatedAt: string;
};

export type PlayerStanding = {
  player: Player;
  total: number;
  isOut: boolean;
  isWinner: boolean;
};

export type DraftMatch = {
  name: string;
  outLimit: number;
};
