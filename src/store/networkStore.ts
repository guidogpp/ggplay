import { create } from 'zustand';
import type { GameAction } from '../types/game';

export type NetworkStatus = 'idle' | 'signaling' | 'connected' | 'error' | 'disconnected';

interface NetworkState {
  status: NetworkStatus;
  isHost: boolean;
  roomId: string | null;
  playerId: string;
  dataChannel: RTCDataChannel | null;
  setStatus: (status: NetworkStatus) => void;
  setRoom: (roomId: string | null) => void;
  setIsHost: (isHost: boolean) => void;
  setDataChannel: (dc: RTCDataChannel | null) => void;
  sendMessage: (action: Omit<GameAction, 'senderId'>) => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  status: 'idle',
  isHost: false,
  roomId: null,
  playerId: crypto.randomUUID(),
  dataChannel: null,
  setStatus: (status) => set({ status }),
  setRoom: (roomId) => set({ roomId }),
  setIsHost: (isHost) => set({ isHost }),
  setDataChannel: (dc) => set({ dataChannel: dc }),
  sendMessage: (action) => {
    const { dataChannel, playerId } = get();
    if (dataChannel && dataChannel.readyState === 'open') {
      const full: GameAction = { ...action, senderId: playerId };
      dataChannel.send(JSON.stringify(full));
    }
  },
}));
