import { useGameStore } from '../../store/gameStore';
import { useNetworkStore } from '../../store/networkStore';
import type { GeneralaState, ScoreCategory, PlayerScores } from '../../types/game';
import { GeneralaEngine } from '../../logic/GeneralaEngine';

const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  ones: '1 — Unos',
  twos: '2 — Doses',
  threes: '3 — Treses',
  fours: '4 — Cuatros',
  fives: '5 — Cincos',
  sixes: '6 — Seises',
  escalera: 'Escalera',
  full: 'Full',
  poker: 'Póker',
  generala: 'Generala',
  generala_doble: 'Generala Doble',
};

const ALL_CATEGORIES: ScoreCategory[] = Object.keys(CATEGORY_LABELS) as ScoreCategory[];

interface ScoreTableProps {
  generala: GeneralaState;
}

export function ScoreTable({ generala }: ScoreTableProps) {
  const sendIntent = useGameStore((s) => s.sendIntent);
  const localPlayerId = useNetworkStore((s) => s.playerId);

  const { players, scores, currentTurn, dices, rollsLeft, phase } = generala;

  const isMyTurn = currentTurn === localPlayerId;
  const hasRolled = rollsLeft < GeneralaEngine.MAX_ROLLS;
  const canScore = isMyTurn && hasRolled && phase !== 'FINISHED';

  const handleScore = (category: ScoreCategory) => {
    sendIntent({ type: 'SCORE_CATEGORY', category });
  };

  const { playerNames } = generala;

  /** Nombre para encabezados: usa playerNames si está disponible */
  const displayName = (id: string) => {
    if (id === localPlayerId) return 'Tú';
    return playerNames[id] || id.slice(0, 6);
  };

  /** Calcula el total de un jugador */
  const total = (ps: PlayerScores): number =>
    Object.values(ps).reduce<number>((acc, v) => acc + (v ?? 0), 0);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        {/* Cabecera */}
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Categoría</th>
            {players.map((pid) => (
              <th
                key={pid}
                className={`py-2 px-3 text-center font-medium ${
                  pid === currentTurn ? 'text-amber-400' : 'text-gray-400'
                }`}
              >
                {displayName(pid)}
                {pid === currentTurn && ' ●'}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ALL_CATEGORIES.map((cat) => (
            <tr key={cat} className="border-b border-gray-800 hover:bg-gray-800/40">
              <td className="py-1.5 px-3 text-gray-300">{CATEGORY_LABELS[cat]}</td>
              {players.map((pid) => {
                const val = scores[pid]?.[cat];
                const isEmpty = val === undefined;
                const isLocal = pid === localPlayerId;
                const showButton = isLocal && isEmpty && canScore;

                // Vista previa del puntaje potencial
                const preview = isEmpty && isLocal && hasRolled
                  ? GeneralaEngine.calculateScore(cat, dices)
                  : null;

                return (
                  <td key={pid} className="py-1.5 px-3 text-center">
                    {!isEmpty ? (
                      <span className={val === 0 ? 'text-gray-600' : 'text-gray-200 font-semibold'}>
                        {val}
                      </span>
                    ) : showButton ? (
                      <button
                        onClick={() => handleScore(cat)}
                        className="px-2 py-0.5 rounded text-xs font-medium
                                   bg-indigo-600/20 text-indigo-400 border border-indigo-600/40
                                   hover:bg-indigo-600/40 hover:text-indigo-300
                                   transition-colors"
                      >
                        {preview !== null ? `+${preview}` : 'Anotar'}
                      </button>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Fila de totales */}
          <tr className="border-t-2 border-gray-600">
            <td className="py-2 px-3 font-bold text-gray-200">TOTAL</td>
            {players.map((pid) => (
              <td key={pid} className="py-2 px-3 text-center font-bold text-gray-100">
                {total(scores[pid] ?? {})}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
