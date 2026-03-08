import { create } from 'zustand';
import { useNetworkStore } from './networkStore';
import type { GameAction } from '../types/game';

/** Un mensaje de chat con autor. */
export interface ChatMessage {
  text: string;
  senderId: string;
}

/** Estado público del juego que el Host sincroniza al Cliente. */
interface PublicGameState {
  messages: ChatMessage[];
}

interface GameStoreState {
  gameState: PublicGameState;
  messages: ChatMessage[];
  dispatchAction: (action: GameAction) => void;
}

const initialGameState: PublicGameState = {
  messages: [],
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: { ...initialGameState },
  messages: [],

  dispatchAction: (action: GameAction) => {
    const network = useNetworkStore.getState();

    switch (action.type) {
      // ——————————————————————————
      //  CHAT — ambos roles lo procesan localmente
      // ——————————————————————————
      case 'CHAT': {
        const msg: ChatMessage = {
          text: String(action.payload),
          senderId: action.senderId,
        };
        const updatedMessages = [...get().messages, msg];

        set({ messages: updatedMessages });

        // Si soy Host, sincronizo el estado al Cliente.
        if (network.isHost) {
          const newPublicState: PublicGameState = {
            ...get().gameState,
            messages: updatedMessages,
          };
          set({ gameState: newPublicState });

          network.sendMessage({
            type: 'SYNC_STATE',
            payload: newPublicState,
          });
        }
        break;
      }

      // ——————————————————————————
      //  SYNC_STATE — solo el Cliente lo procesa
      // ——————————————————————————
      case 'SYNC_STATE': {
        if (!network.isHost) {
          const synced = action.payload as PublicGameState;
          set({
            gameState: synced,
            messages: synced.messages,
          });
        }
        break;
      }

      default:
        console.warn('[gameStore] Acción no manejada:', action.type);
        break;
    }
  },
}));
