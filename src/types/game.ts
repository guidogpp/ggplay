// ——————————————————————————————————————
//  Wire message types (DataChannel)
// ——————————————————————————————————————
export type ActionType =
  | 'CHAT'
  | 'GAME_INTENT'
  | 'SYNC_STATE';

export interface GameAction<T = unknown> {
  type: ActionType;
  payload: T;
  senderId: string;
}

// ——————————————————————————————————————
//  Generala – Score categories
// ——————————————————————————————————————
export type ScoreCategory =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'escalera'
  | 'full'
  | 'poker'
  | 'generala'
  | 'generala_doble';

export type PlayerScores = Partial<Record<ScoreCategory, number>>;

// ——————————————————————————————————————
//  Generala – Game state
// ——————————————————————————————————————
export interface GeneralaState {
  dices: number[];
  kept: boolean[];
  rollsLeft: number;
  scores: Record<string, PlayerScores>;
  currentTurn: string;
  phase: 'ROLLING' | 'SCORING' | 'FINISHED';
  players: string[];
  playerNames: Record<string, string>;
}

// ——————————————————————————————————————
//  Generala – Game intents (client → host)
// ——————————————————————————————————————
export type GameIntent =
  | { type: 'ROLL_DICE' }
  | { type: 'TOGGLE_DICE'; index: number }
  | { type: 'SCORE_CATEGORY'; category: ScoreCategory }
  | { type: 'ANNOUNCE_PLAYER'; name: string };
