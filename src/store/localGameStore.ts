import { create } from 'zustand';
import { GeneralaEngine } from '../logic/GeneralaEngine';
import type { GeneralaState, ScoreCategory } from '../types/game';

type LocalView = 'setup' | 'playing';

interface LocalGameStoreState {
  view: LocalView;
  generala: GeneralaState | null;

  /** Inicia partida local con nombres de jugadores */
  startLocalGame: (playerNames: string[]) => void;

  /** Anota un valor manual en una categoría para el jugador actual y avanza turno */
  scoreCategoryManual: (category: ScoreCategory, value: number) => void;

  /** Vuelve a la pantalla de setup */
  resetLocal: () => void;
}

export const useLocalGameStore = create<LocalGameStoreState>((set, get) => ({
  view: 'setup',
  generala: null,

  startLocalGame: (playerNames: string[]) => {
    const playerIds = playerNames.map((_, i) => `local_${i}`);
    const names: Record<string, string> = {};
    playerIds.forEach((id, i) => {
      names[id] = playerNames[i];
    });

    const state = GeneralaEngine.createInitialState(playerIds, names);
    set({
      view: 'playing',
      generala: { ...state, rollsLeft: 0, phase: 'SCORING' },
    });
  },

  scoreCategoryManual: (category: ScoreCategory, value: number) => {
    const { generala } = get();
    if (!generala || generala.phase === 'FINISHED') return;

    const currentPlayer = generala.currentTurn;
    if (generala.scores[currentPlayer]?.[category] !== undefined) return;

    const newScores = {
      ...generala.scores,
      [currentPlayer]: { ...generala.scores[currentPlayer], [category]: value },
    };

    if (GeneralaEngine.checkEndGame(newScores)) {
      set({ generala: { ...generala, scores: newScores, phase: 'FINISHED' } });
      return;
    }

    const nextPlayer = generala.players[
      (generala.players.indexOf(currentPlayer) + 1) % generala.players.length
    ];

    set({
      generala: {
        ...generala,
        scores: newScores,
        currentTurn: nextPlayer,
      },
    });
  },

  resetLocal: () => {
    set({ view: 'setup', generala: null });
  },
}));
