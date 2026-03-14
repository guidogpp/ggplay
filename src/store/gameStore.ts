import { create } from 'zustand';
import { useNetworkStore } from './networkStore';
import { GeneralaEngine } from '../logic/GeneralaEngine';
import type { GameAction, GameIntent, GeneralaState } from '../types/game';

/** Un mensaje de chat con autor. */
export interface ChatMessage {
  text: string;
  senderId: string;
}

/** Estado público del juego que el Host sincroniza al Cliente. */
export interface PublicGameState {
  messages: ChatMessage[];
  generala: GeneralaState | null;
}

interface GameStoreState {
  gameState: PublicGameState;
  messages: ChatMessage[];
  pendingPlayerNames: Record<string, string>;
  dispatchAction: (action: GameAction) => void;
  sendIntent: (intent: GameIntent) => void;
  processHostIntent: (intent: GameIntent, senderId: string) => void;
  startGame: (players: string[]) => void;
}

const initialGameState: PublicGameState = {
  messages: [],
  generala: null,
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: { ...initialGameState },
  messages: [],
  pendingPlayerNames: {},

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

      // ——————————————————————————
      //  GAME_INTENT — solo el Host lo procesa
      // ——————————————————————————
      case 'GAME_INTENT': {
        if (network.isHost) {
          const intent = action.payload as GameIntent;
          get().processHostIntent(intent, action.senderId);
        }
        break;
      }

      default:
        console.warn('[gameStore] Acción no manejada:', action.type);
        break;
    }
  },

  // ——————————————————————————————————————
  //  sendIntent — punto de entrada para intenciones de juego
  //  Host: procesa localmente. Cliente: envía por DataChannel.
  // ——————————————————————————————————————
  sendIntent: (intent: GameIntent) => {
    const network = useNetworkStore.getState();
    if (network.isHost) {
      get().processHostIntent(intent, network.playerId);
    } else {
      network.sendMessage({ type: 'GAME_INTENT', payload: intent });
    }
  },

  // ——————————————————————————————————————
  //  processHostIntent — SOLO EJECUTAR EN HOST
  //  Valida turno, aplica lógica via GeneralaEngine,
  //  actualiza estado local y difunde SYNC_STATE.
  // ——————————————————————————————————————
  processHostIntent: (intent: GameIntent, senderId: string) => {
    // ANNOUNCE_PLAYER se procesa independientemente del estado de la partida.
    if (intent.type === 'ANNOUNCE_PLAYER') {
      const { gameState } = get();
      const generala = gameState.generala;
      if (generala) {
        const newGenerala: GeneralaState = {
          ...generala,
          playerNames: { ...generala.playerNames, [senderId]: intent.name },
        };
        const newPublicState: PublicGameState = { ...gameState, generala: newGenerala };
        set({ gameState: newPublicState });
        const network = useNetworkStore.getState();
        network.sendMessage({ type: 'SYNC_STATE', payload: newPublicState });
      } else {
        set({ pendingPlayerNames: { ...get().pendingPlayerNames, [senderId]: intent.name } });
      }
      return;
    }

    const { gameState } = get();
    const generala = gameState.generala;
    if (!generala) return;
    if (generala.currentTurn !== senderId) return;
    if (generala.phase === 'FINISHED') return;

    let next: GeneralaState;

    switch (intent.type) {
      case 'ROLL_DICE': {
        if (generala.phase !== 'ROLLING' || generala.rollsLeft <= 0) return;
        next = GeneralaEngine.rollDices(generala);
        break;
      }
      case 'TOGGLE_DICE': {
        if (generala.phase !== 'ROLLING') return;
        if (generala.rollsLeft === GeneralaEngine.MAX_ROLLS) return;
        next = GeneralaEngine.toggleDice(generala, intent.index);
        break;
      }
      case 'SCORE_CATEGORY': {
        if (generala.phase !== 'ROLLING' && generala.phase !== 'SCORING') return;
        if (generala.rollsLeft === GeneralaEngine.MAX_ROLLS) return;
        next = GeneralaEngine.scoreCategory(generala, senderId, intent.category);
        break;
      }
      default:
        return;
    }

    const network = useNetworkStore.getState();
    const newPublicState: PublicGameState = {
      ...gameState,
      generala: next,
    };
    set({ gameState: newPublicState });
    network.sendMessage({ type: 'SYNC_STATE', payload: newPublicState });
  },

  // ——————————————————————————————————————
  //  startGame — Host inicia la partida de Generala
  // ——————————————————————————————————————
  startGame: (players: string[]) => {
    const network = useNetworkStore.getState();
    if (!network.isHost) return;

    const playerNames: Record<string, string> = {
      [network.playerId]: network.playerName || network.playerId.slice(0, 8),
      ...get().pendingPlayerNames,
    };
    const generala = GeneralaEngine.createInitialState(players, playerNames);
    const newPublicState: PublicGameState = {
      ...get().gameState,
      generala,
    };
    set({ gameState: newPublicState });
    network.sendMessage({ type: 'SYNC_STATE', payload: newPublicState });
  },
}));
