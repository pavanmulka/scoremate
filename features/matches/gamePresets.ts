import { DEFAULT_OUT_LIMIT, DEFAULT_TARGET_SCORE } from './scoringRules';
import type { Match, ScoringMode } from './types';

export type GamePresetCategory = 'Cards' | 'Board' | 'Dice' | 'Yard' | 'Sports' | 'Party';

export type GameRules = {
  objective: string;
  scoring: string[];
  winning: string;
  notes?: string[];
};

export type GamePreset = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  suggestedName: string;
  category: GamePresetCategory;
  scoringMode: ScoringMode;
  targetScore?: number;
  defaultTeamMode?: boolean;
  rules: GameRules;
};

export const customGamePresetId = 'custom';
export const gamePresetCategories = ['All', 'Recent', 'Cards', 'Board', 'Dice', 'Yard', 'Sports', 'Party'] as const;

export type GamePresetCategoryFilter = (typeof gamePresetCategories)[number];

export const gamePresets: GamePreset[] = [
  {
    id: 'least-count-cards',
    title: 'Least Count Cards',
    shortTitle: 'Least Count',
    description: 'Low-score card match. Out at 300.',
    suggestedName: 'Least Count Match',
    category: 'Cards',
    scoringMode: 'outLimit',
    targetScore: DEFAULT_OUT_LIMIT,
    rules: {
      objective: 'Keep your running total low across rounds.',
      scoring: ['Enter each player penalty points after a round.', 'A score of 0 is allowed.', 'Players are out when their total reaches the out limit.'],
      winning: 'Last active player wins.',
      notes: ['Default out limit is 300.', 'Out players are disabled in future round entry.'],
    },
  },
  {
    id: 'points-rummy-80',
    title: 'Indian Rummy Points',
    shortTitle: 'Points Rummy',
    description: 'Penalty scoring with a common 80-point cap.',
    suggestedName: 'Rummy Match',
    category: 'Cards',
    scoringMode: 'outLimit',
    targetScore: 80,
    rules: {
      objective: 'Keep penalty points low while forming valid sets and sequences.',
      scoring: ['Enter each player penalty points after each deal.', 'Winner of a deal usually scores 0.', 'This preset treats 80 as the match out limit.'],
      winning: 'Last active player wins in this tournament-style setup.',
      notes: ['Use custom scoring if your group plays cash points or a different cap.'],
    },
  },
  {
    id: 'call-break-manual',
    title: 'Call Break',
    shortTitle: 'Call Break',
    description: 'Manual trick score entry. Highest total leads.',
    suggestedName: 'Call Break Match',
    category: 'Cards',
    scoringMode: 'highestScoreWins',
    rules: {
      objective: 'Bid/call tricks, then try to make at least that many tricks.',
      scoring: ['Enter the calculated score for each player after a deal.', 'Positive scores help, missed calls usually lose points.', 'Highest running total leads.'],
      winning: 'Highest total after your agreed number of deals wins.',
      notes: ['A smart bid/tricks calculator can be added later.'],
    },
  },
  {
    id: 'uno-500',
    title: 'UNO 500',
    shortTitle: 'UNO',
    description: 'First player or team to 500 wins.',
    suggestedName: 'UNO Night',
    category: 'Cards',
    scoringMode: 'firstToTarget',
    targetScore: 500,
    rules: {
      objective: 'Win hands and collect points from cards left in opponents hands.',
      scoring: ['Round winner gets points for cards left with other players.', 'Number cards score face value.', 'Action and wild cards usually score higher values.'],
      winning: 'First player or team to 500 wins.',
      notes: ['Use team mode if you play partners.'],
    },
  },
  {
    id: 'rummy-500',
    title: 'Rummy 500',
    shortTitle: 'Rummy 500',
    description: 'Race to 500 net points.',
    suggestedName: 'Rummy 500 Match',
    category: 'Cards',
    scoringMode: 'firstToTarget',
    targetScore: 500,
    rules: {
      objective: 'Score points by melding cards and laying off on melds.',
      scoring: ['Enter each player net points after a hand.', 'Card values can be positive or negative by house rules; use 0 if a player gets none.'],
      winning: 'First player to 500 wins.',
      notes: ['Current score entry supports non-negative scores only. Negative hand adjustments need a future helper.'],
    },
  },
  {
    id: 'hearts-low-score',
    title: 'Hearts',
    shortTitle: 'Hearts',
    description: 'Penalty card game. Lower total leads.',
    suggestedName: 'Hearts Match',
    category: 'Cards',
    scoringMode: 'lowestScoreWins',
    rules: {
      objective: 'Avoid taking penalty cards.',
      scoring: ['Hearts are penalty points.', 'The queen of spades is usually a large penalty.', 'Enter each player penalty total after every hand.'],
      winning: 'Lowest score wins when the game ends by your house rule, commonly around 100.',
    },
  },
  {
    id: 'spades-high-score',
    title: 'Spades',
    shortTitle: 'Spades',
    description: 'Partnership trick-taking. Higher total leads.',
    suggestedName: 'Spades Match',
    category: 'Cards',
    scoringMode: 'highestScoreWins',
    defaultTeamMode: true,
    rules: {
      objective: 'Bid tricks with your partner and try to make your bid.',
      scoring: ['Enter each team or player score after a hand.', 'Successful bids add points; missed bids usually subtract by house rules.', 'Extra tricks may count as bags.'],
      winning: 'Highest total wins at the agreed target, often 500.',
      notes: ['Use team mode for partner play.', 'A bid/bag calculator can be added later.'],
    },
  },
  {
    id: 'gin-rummy-100',
    title: 'Gin Rummy to 100',
    shortTitle: 'Gin Rummy',
    description: 'Race to 100 points.',
    suggestedName: 'Gin Rummy Match',
    category: 'Cards',
    scoringMode: 'firstToTarget',
    targetScore: 100,
    rules: {
      objective: 'Make melds and reduce deadwood before knocking or going gin.',
      scoring: ['Enter each player points after a hand.', 'Knock, gin, and undercut bonuses depend on house rules.'],
      winning: 'First player to 100 wins.',
    },
  },
  {
    id: 'euchre-10',
    title: 'Euchre to 10',
    shortTitle: 'Euchre',
    description: 'Team trick-taking. Race to 10.',
    suggestedName: 'Euchre Match',
    category: 'Cards',
    scoringMode: 'firstToTarget',
    targetScore: 10,
    defaultTeamMode: true,
    rules: {
      objective: 'Win tricks with your partner after trump is chosen.',
      scoring: ['Enter team points after each hand.', 'Most hands score 1 or 2 points; lone hands can score more.'],
      winning: 'First team to 10 wins.',
      notes: ['Use team mode for partners.'],
    },
  },
  {
    id: 'cribbage-121',
    title: 'Cribbage to 121',
    shortTitle: 'Cribbage',
    description: 'Race to 121 points.',
    suggestedName: 'Cribbage Match',
    category: 'Cards',
    scoringMode: 'firstToTarget',
    targetScore: 121,
    rules: {
      objective: 'Score through pegging, hand points, and crib points.',
      scoring: ['Enter points earned each turn or hand.', 'Totals race upward toward the target.'],
      winning: 'First player to 121 wins.',
    },
  },
  {
    id: 'badminton-21',
    title: 'Badminton to 21',
    shortTitle: 'Badminton',
    description: 'Rally scoring to 21, win by 2.',
    suggestedName: 'Badminton Match',
    category: 'Sports',
    scoringMode: 'firstToTarget',
    targetScore: 21,
    defaultTeamMode: true,
    rules: {
      objective: 'Win rallies and reach the game target before the other side.',
      scoring: ['Enter points won by each player or side.', 'Official-style games use rally scoring.', 'Games are commonly played to 21 and must be won by 2.'],
      winning: 'First side to 21 with a 2-point lead wins the game.',
      notes: ['Official badminton has a ceiling at 30; use manual match ending if your game reaches that edge case.', 'Use team mode for doubles.'],
    },
  },
  {
    id: 'basketball-pickup-21',
    title: 'Basketball Pickup to 21',
    shortTitle: 'Pickup 21',
    description: 'Manual pickup basketball points.',
    suggestedName: 'Pickup Basketball',
    category: 'Sports',
    scoringMode: 'firstToTarget',
    targetScore: 21,
    defaultTeamMode: true,
    rules: {
      objective: 'Track a casual pickup game to your agreed target.',
      scoring: ['Enter points after possessions or in small batches.', 'Use 1s and 2s, or 2s and 3s, based on your court rules.'],
      winning: 'First player or team to the target wins by your house rule.',
      notes: ['Change the target if your group plays to 11, 15, or 25.'],
    },
  },
  {
    id: 'canasta-5000',
    title: 'Canasta to 5,000',
    shortTitle: 'Canasta',
    description: 'Team card scoring race to 5,000.',
    suggestedName: 'Canasta Match',
    category: 'Cards',
    scoringMode: 'firstToTarget',
    targetScore: 5000,
    defaultTeamMode: true,
    rules: {
      objective: 'Build melds and canastas, then score each hand.',
      scoring: ['Enter each player or team net hand score.', 'Canasta scoring includes melds, bonuses, cards left in hand, and going-out bonuses.', 'Use team mode for partnership play.'],
      winning: 'First player or team to 5,000 wins.',
      notes: ['Current score entry supports non-negative totals; enter the final net gain your group agrees on.'],
    },
  },
  {
    id: 'carrom-25',
    title: 'Carrom to 25',
    shortTitle: 'Carrom',
    description: 'Casual carrom scoring to 25.',
    suggestedName: 'Carrom Match',
    category: 'Board',
    scoringMode: 'firstToTarget',
    targetScore: 25,
    rules: {
      objective: 'Pocket your carrom men and manage the queen bonus.',
      scoring: ['Enter each player or team board points after a board.', 'Casual games often score based on opponent pieces left and queen bonus.'],
      winning: 'First player or team to 25 wins.',
      notes: ['Use team mode for doubles.', 'A carrom board calculator can be added later.'],
    },
  },
  {
    id: 'catan-10',
    title: 'Catan to 10',
    shortTitle: 'Catan',
    description: 'Victory point race to 10.',
    suggestedName: 'Catan Match',
    category: 'Board',
    scoringMode: 'firstToTarget',
    targetScore: 10,
    rules: {
      objective: 'Track victory points from settlements, cities, development cards, and awards.',
      scoring: ['Enter new victory points as players gain them.', 'Most players begin with 2 victory points from starting settlements.'],
      winning: 'First player to 10 victory points on their turn wins.',
      notes: ['For fastest setup, add the starting 2 points in round 1 for each player.'],
    },
  },
  {
    id: 'dominoes-all-fives-100',
    title: 'Dominoes All Fives',
    shortTitle: 'Dominoes',
    description: 'Race to 100 points.',
    suggestedName: 'Dominoes Match',
    category: 'Board',
    scoringMode: 'firstToTarget',
    targetScore: 100,
    rules: {
      objective: 'Score when open ends add up to multiples of five.',
      scoring: ['Enter points scored each turn or hand.', 'End-of-hand points depend on your group rules.'],
      winning: 'First player or team to 100 wins.',
    },
  },
  {
    id: 'pool-race-8',
    title: 'Pool Race to 8',
    shortTitle: 'Pool Race',
    description: 'Track racks won in 8-ball or 9-ball.',
    suggestedName: 'Pool Match',
    category: 'Party',
    scoringMode: 'firstToTarget',
    targetScore: 8,
    rules: {
      objective: 'Count racks won across a race.',
      scoring: ['Enter 1 for the player or team that wins each rack.', 'Enter 0 for everyone else in that rack.'],
      winning: 'First player or team to the race number wins.',
      notes: ['Change the target to race to 3, 5, 7, 9, or any local format.'],
    },
  },
  {
    id: 'pickleball-11',
    title: 'Pickleball to 11',
    shortTitle: 'Pickleball',
    description: 'Side-out scoring to 11, win by 2.',
    suggestedName: 'Pickleball Match',
    category: 'Sports',
    scoringMode: 'firstToTarget',
    targetScore: 11,
    defaultTeamMode: true,
    rules: {
      objective: 'Track points for singles or doubles pickleball.',
      scoring: ['Traditional scoring gives points only to the serving side.', 'Enter points after rallies or after each side-out.', 'Games are commonly played to 11 and won by 2.'],
      winning: 'First side to 11 with a 2-point lead wins.',
      notes: ['Use team mode for doubles.', 'Rally scoring exists in some formats; this preset is a simple score tracker.'],
    },
  },
  {
    id: 'pinochle-1500',
    title: 'Pinochle to 1,500',
    shortTitle: 'Pinochle',
    description: 'Team meld and trick scoring.',
    suggestedName: 'Pinochle Match',
    category: 'Cards',
    scoringMode: 'firstToTarget',
    targetScore: 1500,
    defaultTeamMode: true,
    rules: {
      objective: 'Score from melds and tricks across hands.',
      scoring: ['Enter each team total after a hand.', 'Scores can include bids, meld points, trick points, and penalties by house rules.'],
      winning: 'First team to your agreed target wins; 1,500 is a common simple target.',
      notes: ['Some groups use 150, 1,000, 1,200, 1,500, 3,000, or 5,000 depending on deck and scoring style.'],
    },
  },
  {
    id: 'cornhole-21',
    title: 'Cornhole to 21',
    shortTitle: 'Cornhole',
    description: 'Race to 21 points.',
    suggestedName: 'Cornhole Match',
    category: 'Yard',
    scoringMode: 'firstToTarget',
    targetScore: 21,
    defaultTeamMode: true,
    rules: {
      objective: 'Toss bags onto the board or into the hole.',
      scoring: ['Bag on board is commonly 1 point.', 'Bag in hole is commonly 3 points.', 'Most groups use cancellation scoring, so enter the net score for the round.'],
      winning: 'First player or team to 21 wins by your house rule.',
      notes: ['Use team mode for doubles.', 'A bag-by-bag calculator can be added later.'],
    },
  },
  {
    id: 'scrabble-high-score',
    title: 'Scrabble',
    shortTitle: 'Scrabble',
    description: 'Highest final word score wins.',
    suggestedName: 'Scrabble Match',
    category: 'Board',
    scoringMode: 'highestScoreWins',
    rules: {
      objective: 'Build words and score more points than the other players.',
      scoring: ['Enter each player turn score as words are played.', 'Include letter, word, and bingo bonuses in the score you enter.', 'At game end, apply remaining-tile adjustments before final entry if needed.'],
      winning: 'Highest final score wins.',
      notes: ['This preset tracks totals only; it does not validate words.'],
    },
  },
  {
    id: 'table-tennis-11',
    title: 'Table Tennis to 11',
    shortTitle: 'Table Tennis',
    description: 'Games to 11, win by 2.',
    suggestedName: 'Table Tennis Match',
    category: 'Sports',
    scoringMode: 'firstToTarget',
    targetScore: 11,
    defaultTeamMode: true,
    rules: {
      objective: 'Win points on rallies and reach the game target.',
      scoring: ['Enter points won by each player or side.', 'Games are commonly played to 11.', 'At 10-10, play continues until one side leads by 2.'],
      winning: 'First side to 11 with a 2-point lead wins.',
      notes: ['Use team mode for doubles.'],
    },
  },
  {
    id: 'teen-patti-night',
    title: 'Teen Patti Night',
    shortTitle: 'Teen Patti',
    description: 'Manual chip or point tracking.',
    suggestedName: 'Teen Patti Night',
    category: 'Cards',
    scoringMode: 'highestScoreWins',
    rules: {
      objective: 'Track chip gains or agreed points after each hand.',
      scoring: ['Enter points or chip profit for each player after a hand.', 'Use 0 for players with no gain in that hand.'],
      winning: 'Highest total wins when your group ends the session.',
      notes: ['Current score entry is non-negative, so track gains or use a separate settlement note for losses.'],
    },
  },
  {
    id: 'twenty-nine-card-game',
    title: 'Twenty-Nine Card Game',
    shortTitle: '29 Cards',
    description: 'Team trick-taking score tracker.',
    suggestedName: '29 Card Game',
    category: 'Cards',
    scoringMode: 'firstToTarget',
    targetScore: 6,
    defaultTeamMode: true,
    rules: {
      objective: 'Bid, choose trump, and win scoring cards with your partner.',
      scoring: ['Enter each team match points after a hand.', 'Groups commonly score plus or minus points based on whether the bid succeeds.', 'Use the target your table agrees on.'],
      winning: 'First team to the agreed match target wins.',
      notes: ['A bid/trump helper can be added later; this preset is manual scoring.'],
    },
  },
  {
    id: 'volleyball-25',
    title: 'Volleyball to 25',
    shortTitle: 'Volleyball',
    description: 'Rally scoring to 25, win by 2.',
    suggestedName: 'Volleyball Match',
    category: 'Sports',
    scoringMode: 'firstToTarget',
    targetScore: 25,
    defaultTeamMode: true,
    rules: {
      objective: 'Track rally points by side.',
      scoring: ['Enter points as each team wins rallies.', 'Sets are commonly played to 25 with a 2-point margin.', 'Final deciding sets are often played to 15.'],
      winning: 'First team to the set target with a 2-point lead wins.',
      notes: ['Change the target to 15 for deciding sets.'],
    },
  },
  {
    id: 'horseshoes-21',
    title: 'Horseshoes to 21',
    shortTitle: 'Horseshoes',
    description: 'Race to 21 points.',
    suggestedName: 'Horseshoes Match',
    category: 'Yard',
    scoringMode: 'firstToTarget',
    targetScore: 21,
    rules: {
      objective: 'Throw horseshoes close to or around the stake.',
      scoring: ['Enter net points after each inning.', 'Ringers and closest shoes score by house rules.'],
      winning: 'First player or team to 21 wins.',
    },
  },
  {
    id: 'ladder-toss-21',
    title: 'Ladder Toss to 21',
    shortTitle: 'Ladder Toss',
    description: 'Race to 21 points.',
    suggestedName: 'Ladder Toss Match',
    category: 'Yard',
    scoringMode: 'firstToTarget',
    targetScore: 21,
    defaultTeamMode: true,
    rules: {
      objective: 'Throw bolas onto ladder rungs.',
      scoring: ['Enter points scored each round.', 'Different rungs have different values by house rules.'],
      winning: 'First player or team to exactly or at least 21 by your house rule wins.',
    },
  },
  {
    id: 'yahtzee-high-score',
    title: 'Yahtzee',
    shortTitle: 'Yahtzee',
    description: 'Highest final total wins.',
    suggestedName: 'Yahtzee Match',
    category: 'Dice',
    scoringMode: 'highestScoreWins',
    rules: {
      objective: 'Roll dice combinations and score categories.',
      scoring: ['Enter each player points after a turn or after the full scorecard.', 'Highest total leads.'],
      winning: 'Highest final total wins after all categories are scored.',
      notes: ['A full category score sheet can be added later.'],
    },
  },
  {
    id: 'oh-hell',
    title: 'Oh Hell',
    shortTitle: 'Oh Hell',
    description: 'Manual bid-and-trick scoring.',
    suggestedName: 'Oh Hell Match',
    category: 'Cards',
    scoringMode: 'highestScoreWins',
    rules: {
      objective: 'Bid the exact number of tricks you will take.',
      scoring: ['Enter each player hand score after bids and tricks are resolved.', 'Exact bids usually earn a bonus plus tricks; missed bids score by house rules.'],
      winning: 'Highest total after the agreed number of hands wins.',
      notes: ['A future helper can calculate scores from bid and tricks taken.'],
    },
  },
  {
    id: 'molkky-50',
    title: 'Molkky to 50',
    shortTitle: 'Molkky',
    description: 'Outdoor skittle game to exactly 50.',
    suggestedName: 'Molkky Match',
    category: 'Yard',
    scoringMode: 'firstToTarget',
    targetScore: 50,
    rules: {
      objective: 'Throw the pin and reach exactly 50 points.',
      scoring: ['One skittle knocked down scores the number on that skittle.', 'Multiple skittles knocked down scores the count of skittles.', 'If a player goes over 50, many rules reset that player to 25.'],
      winning: 'First player to exactly 50 wins.',
      notes: ['ScoreMate currently tracks added points only; if someone busts over 50, edit/delete the round and enter the adjusted points manually for now.'],
    },
  },
  {
    id: 'farkle-10000',
    title: 'Farkle to 10,000',
    shortTitle: 'Farkle',
    description: 'Race to 10,000 points.',
    suggestedName: 'Farkle Match',
    category: 'Dice',
    scoringMode: 'firstToTarget',
    targetScore: 10000,
    rules: {
      objective: 'Roll scoring dice combinations without losing your turn points.',
      scoring: ['Enter banked points after each turn.', 'A farkle scores 0 for that turn.'],
      winning: 'First player to 10,000 wins after your final-round rule.',
    },
  },
  {
    id: 'target-500',
    title: 'Generic Race to 500',
    shortTitle: 'Race 500',
    description: 'Reusable target-score preset.',
    suggestedName: 'Target Match',
    category: 'Party',
    scoringMode: 'firstToTarget',
    targetScore: DEFAULT_TARGET_SCORE,
    rules: {
      objective: 'Use this for any game where points race upward.',
      scoring: ['Enter points earned each round.', 'Team mode is optional.'],
      winning: 'First player or team to the target wins.',
    },
  },
];

export function getGamePreset(presetId?: string | null) {
  return gamePresets.find((preset) => preset.id === presetId) ?? null;
}

export function sortGamePresets(presets: GamePreset[]) {
  return [...presets].sort((first, second) => {
    if (first.id === 'least-count-cards') {
      return -1;
    }

    if (second.id === 'least-count-cards') {
      return 1;
    }

    return first.title.localeCompare(second.title);
  });
}

export function getGamePresetsByCategory(category: GamePresetCategoryFilter) {
  const presets = category === 'Recent' ? [] : category === 'All' ? gamePresets : gamePresets.filter((preset) => preset.category === category);

  return sortGamePresets(presets);
}

export function getRecentGamePresets(matches: Match[]) {
  const seenPresetIds = new Set<string>();
  const recentPresets = [...matches]
    .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
    .reduce<GamePreset[]>((presets, match) => {
      if (!match.gamePresetId || seenPresetIds.has(match.gamePresetId)) {
        return presets;
      }

      const preset = getGamePreset(match.gamePresetId);

      if (!preset) {
        return presets;
      }

      seenPresetIds.add(match.gamePresetId);
      presets.push(preset);

      return presets;
    }, []);

  return recentPresets;
}
