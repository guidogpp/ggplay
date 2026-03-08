export type GameType = 'truco' | 'generala';

export interface Room {
  id: string;
  host_id: string;
  game_type: GameType;
  status: string;
  created_at: string;
}

export type SignalType = 'offer' | 'answer' | 'ice-candidate';

export interface SignalPayload {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface Signal {
  id: string;
  room_id: string;
  sender_id: string;
  receiver_id: string;
  type: SignalType;
  payload: SignalPayload;
  created_at: string;
}
