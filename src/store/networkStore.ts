import { create } from 'zustand';
import type { GameAction } from '../types/game';

export type NetworkStatus = 'idle' | 'signaling' | 'connected' | 'error' | 'disconnected';

interface NetworkState {
  status: NetworkStatus;
  isHost: boolean;
  roomId: string | null;
  playerId: string;
  playerName: string;
  dataChannel: RTCDataChannel | null;
  peerIds: string[];
  setStatus: (status: NetworkStatus) => void;
  setRoom: (roomId: string | null) => void;
  setIsHost: (isHost: boolean) => void;
  setPlayerName: (name: string) => void;
  setDataChannel: (dc: RTCDataChannel | null) => void;
  addPeer: (peerId: string) => void;
  sendMessage: (action: Omit<GameAction, 'senderId'>) => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  status: 'idle',
  isHost: false,
  roomId: null,
  playerId: crypto.randomUUID(),
  playerName: '',
  dataChannel: null,
  peerIds: [],
  setStatus: (status) => set({ status }),
  setRoom: (roomId) => set({ roomId }),
  setIsHost: (isHost) => set({ isHost }),
  setPlayerName: (name) => set({ playerName: name }),
  setDataChannel: (dc) => set({ dataChannel: dc }),
  addPeer: (peerId) => {
    const { peerIds } = get();
    if (!peerIds.includes(peerId)) {
      set({ peerIds: [...peerIds, peerId] });
    }
  },
  sendMessage: (action) => {
    const { dataChannel, playerId } = get();
    if (dataChannel && dataChannel.readyState === 'open') {
      const full: GameAction = { ...action, senderId: playerId };
      dataChannel.send(JSON.stringify(full));
    }
  },
}));
