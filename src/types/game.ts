export type ActionType =
  | 'CHAT'
  | 'START_GAME'
  | 'PLAY_CARD'
  | 'ROLL_DICE'
  | 'SYNC_STATE';

export interface GameAction<T = unknown> {
  type: ActionType;
  payload: T;
  senderId: string;
}
