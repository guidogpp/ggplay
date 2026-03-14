import type { GeneralaState, ScoreCategory, PlayerScores } from '../types/game';

const NUM_DICES = 5;

const ALL_CATEGORIES: ScoreCategory[] = [
  'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
  'escalera', 'full', 'poker', 'generala', 'generala_doble',
];

export class GeneralaEngine {
  static readonly MAX_ROLLS = 3;

  // ——————————————————————————————————————
  //  Crear estado inicial
  // ——————————————————————————————————————
  static createInitialState(
    players: string[],
    playerNames: Record<string, string> = {},
  ): GeneralaState {
    const scores: Record<string, PlayerScores> = {};
    for (const p of players) {
      scores[p] = {};
    }
    return {
      dices: [0, 0, 0, 0, 0],
      kept: [false, false, false, false, false],
      rollsLeft: GeneralaEngine.MAX_ROLLS,
      scores,
      currentTurn: players[0],
      phase: 'ROLLING',
      players,
      playerNames,
    };
  }

  // ——————————————————————————————————————
  //  Tirar dados (solo el Host genera aleatorios)
  // ——————————————————————————————————————
  static rollDices(state: GeneralaState): GeneralaState {
    if (state.rollsLeft <= 0) return state;

    const newDices = state.dices.map((d, i) => {
      if (state.kept[i] && d !== 0) return d;
      return Math.floor(Math.random() * 6) + 1;
    });
    const newRollsLeft = state.rollsLeft - 1;

    console.log('[ENGINE] Tirando dados. Kept:', state.kept, 'Resultado:', newDices);

    return {
      ...state,
      dices: newDices,
      rollsLeft: newRollsLeft,
      phase: newRollsLeft === 0 ? 'SCORING' : 'ROLLING',
    };
  }

  // ——————————————————————————————————————
  //  Alternar dado guardado / libre
  // ——————————————————————————————————————
  static toggleDice(state: GeneralaState, index: number): GeneralaState {
    if (index < 0 || index >= NUM_DICES) return state;
    if (state.dices[index] === 0) return state;
    if (state.rollsLeft === GeneralaEngine.MAX_ROLLS) return state;

    const newKept = [...state.kept];
    newKept[index] = !newKept[index];
    return { ...state, kept: newKept };
  }

  // ——————————————————————————————————————
  //  Calcular puntaje para una categoría
  // ——————————————————————————————————————
  static calculateScore(category: ScoreCategory, dices: number[]): number {
    const faceValue = GeneralaEngine.faceValue(category);
    if (faceValue !== null) {
      return dices.filter((d) => d === faceValue).reduce((sum, d) => sum + d, 0);
    }

    const sorted = [...dices].sort((a, b) => a - b);
    const counts = GeneralaEngine.getCounts(dices);
    const freqs = Object.values(counts).sort((a, b) => b - a);

    switch (category) {
      case 'escalera': {
        const key = sorted.join(',');
        return key === '1,2,3,4,5' || key === '2,3,4,5,6' ? 20 : 0;
      }
      case 'full':
        return freqs[0] === 3 && freqs[1] === 2 ? 30 : 0;
      case 'poker':
        return freqs[0] >= 4 ? 40 : 0;
      case 'generala':
        return freqs[0] === 5 ? 50 : 0;
      case 'generala_doble':
        return freqs[0] === 5 ? 100 : 0;
      default:
        return 0;
    }
  }

  // ——————————————————————————————————————
  //  Anotar en una categoría y avanzar turno
  // ——————————————————————————————————————
  static scoreCategory(
    state: GeneralaState,
    playerId: string,
    category: ScoreCategory,
  ): GeneralaState {
    if (state.scores[playerId]?.[category] !== undefined) return state;

    let score = GeneralaEngine.calculateScore(category, state.dices);

    // Generala Doble solo vale 100 si fue en la primera tirada.
    if (category === 'generala_doble' && state.rollsLeft !== GeneralaEngine.MAX_ROLLS - 1) {
      score = 0;
    }

    const newScores: Record<string, PlayerScores> = {
      ...state.scores,
      [playerId]: { ...state.scores[playerId], [category]: score },
    };

    if (GeneralaEngine.checkEndGame(newScores)) {
      return { ...state, scores: newScores, phase: 'FINISHED' };
    }

    const nextPlayer = GeneralaEngine.nextPlayer(state.players, playerId);
    return {
      ...state,
      scores: newScores,
      dices: [0, 0, 0, 0, 0],
      kept: [false, false, false, false, false],
      rollsLeft: GeneralaEngine.MAX_ROLLS,
      currentTurn: nextPlayer,
      phase: 'ROLLING',
    };
  }

  // ——————————————————————————————————————
  //  Verificar si todas las categorías están completas
  // ——————————————————————————————————————
  static checkEndGame(scores: Record<string, PlayerScores>): boolean {
    return Object.values(scores).every((ps) =>
      ALL_CATEGORIES.every((cat) => ps[cat] !== undefined),
    );
  }

  // ——————————————————————————————————————
  //  Helpers privados
  // ——————————————————————————————————————
  private static faceValue(category: ScoreCategory): number | null {
    switch (category) {
      case 'ones':   return 1;
      case 'twos':   return 2;
      case 'threes': return 3;
      case 'fours':  return 4;
      case 'fives':  return 5;
      case 'sixes':  return 6;
      default:       return null;
    }
  }

  private static getCounts(dices: number[]): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const d of dices) {
      counts[d] = (counts[d] ?? 0) + 1;
    }
    return counts;
  }

  private static nextPlayer(players: string[], current: string): string {
    const idx = players.indexOf(current);
    return players[(idx + 1) % players.length];
  }
}
