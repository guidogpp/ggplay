import { useState } from 'react';
import { Trophy, ArrowLeft, RotateCcw, X } from 'lucide-react';
import { useLocalGameStore } from '../../store/localGameStore';
import type { ScoreCategory, PlayerScores } from '../../types/game';

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

export function LocalGameBoard() {
  const generala = useLocalGameStore((s) => s.generala);
  const scoreCategoryManual = useLocalGameStore((s) => s.scoreCategoryManual);
  const resetLocal = useLocalGameStore((s) => s.resetLocal);

  const [editing, setEditing] = useState<ScoreCategory | null>(null);
  const [inputValue, setInputValue] = useState('');

  if (!generala) return null;

  const { currentTurn, phase, players, scores, playerNames } = generala;

  const displayName = (id: string) => playerNames[id] || id;

  const handleCellTap = (cat: ScoreCategory) => {
    if (phase === 'FINISHED') return;
    setEditing(cat);
    setInputValue('');
  };

  const handleConfirm = () => {
    if (editing === null) return;
    const val = parseInt(inputValue, 10);
    scoreCategoryManual(editing, isNaN(val) || val < 0 ? 0 : val);
    setEditing(null);
    setInputValue('');
  };

  const handleCrossOut = () => {
    if (editing === null) return;
    scoreCategoryManual(editing, 0);
    setEditing(null);
    setInputValue('');
  };

  const handleCancel = () => {
    setEditing(null);
    setInputValue('');
  };

  // —— FINISHED ——
  if (phase === 'FINISHED') {
    const totals = players.map((pid) => ({
      pid,
      name: displayName(pid),
      total: sumScores(scores[pid] ?? {}),
    }));
    totals.sort((a, b) => b.total - a.total);
    const winner = totals[0];

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto py-6 px-4">
        <Trophy className="w-14 h-14 text-amber-400" />
        <h2 className="text-2xl font-bold text-amber-400">¡Partida Terminada!</h2>
        <p className="text-gray-300">
          Ganador:{' '}
          <span className="font-bold text-amber-300">{winner.name}</span>{' '}
          con <span className="font-mono font-bold">{winner.total}</span> puntos
        </p>

        <ScoreTableView generala={generala} onCellTap={() => {}} editingCat={null} />

        <div className="flex gap-3">
          <button
            onClick={resetLocal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Nueva Partida
          </button>
          <button
            onClick={resetLocal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Salir
          </button>
        </div>
      </div>
    );
  }

  // —— EN CURSO ——
  const currentName = displayName(currentTurn);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto py-4 px-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <button
          onClick={resetLocal}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold">Generala — Anotación</h2>
        <div className="w-9" />
      </div>

      {/* Turno */}
      <div className="text-center px-4 py-2 rounded-lg text-sm font-semibold bg-amber-900/30 border border-amber-600 text-amber-300">
        Turno de {currentName}
      </div>

      {/* Input inline cuando se está editando */}
      {editing !== null && (
        <div className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-200">
              {CATEGORY_LABELS[editing]} — {currentName}
            </span>
            <button onClick={handleCancel} className="p-1 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
              placeholder="Puntaje"
              className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm
                         placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500
                         [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors"
            >
              Anotar
            </button>
            <button
              onClick={handleCrossOut}
              className="px-4 py-2 rounded-lg bg-red-900/40 border border-red-700 hover:bg-red-900/60 text-red-400 text-sm font-semibold transition-colors"
            >
              Tachar
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <ScoreTableView generala={generala} onCellTap={handleCellTap} editingCat={editing} />
    </div>
  );
}

// ——————————————————————————————
//  Tabla de puntajes (solo visual)
// ——————————————————————————————
interface ScoreTableViewProps {
  generala: NonNullable<ReturnType<typeof useLocalGameStore.getState>['generala']>;
  onCellTap: (cat: ScoreCategory) => void;
  editingCat: ScoreCategory | null;
}

function ScoreTableView({ generala, onCellTap, editingCat }: ScoreTableViewProps) {
  const { players, scores, currentTurn, phase, playerNames } = generala;

  const displayName = (id: string) => playerNames[id] || id;

  const total = (ps: PlayerScores): number =>
    Object.values(ps).reduce<number>((acc, v) => acc + (v ?? 0), 0);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Categoría</th>
            {players.map((pid) => (
              <th
                key={pid}
                className={`py-2 px-3 text-center font-medium ${
                  pid === currentTurn && phase !== 'FINISHED' ? 'text-amber-400' : 'text-gray-400'
                }`}
              >
                {displayName(pid)}
                {pid === currentTurn && phase !== 'FINISHED' && ' ●'}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ALL_CATEGORIES.map((cat) => {
            const isEditing = editingCat === cat;
            return (
              <tr
                key={cat}
                className={`border-b border-gray-800 ${isEditing ? 'bg-indigo-900/20' : 'hover:bg-gray-800/40'}`}
              >
                <td className="py-1.5 px-3 text-gray-300">{CATEGORY_LABELS[cat]}</td>
                {players.map((pid) => {
                  const val = scores[pid]?.[cat];
                  const isEmpty = val === undefined;
                  const isCurrent = pid === currentTurn;
                  const canTap = isCurrent && isEmpty && phase !== 'FINISHED';

                  return (
                    <td key={pid} className="py-1.5 px-3 text-center">
                      {!isEmpty ? (
                        <span className={val === 0 ? 'text-gray-600 line-through' : 'text-gray-200 font-semibold'}>
                          {val === 0 ? '✕' : val}
                        </span>
                      ) : canTap ? (
                        <button
                          onClick={() => onCellTap(cat)}
                          className="px-3 py-1 rounded text-xs font-medium
                                     bg-indigo-600/20 text-indigo-400 border border-indigo-600/40
                                     hover:bg-indigo-600/40 hover:text-indigo-300
                                     transition-colors"
                        >
                          Anotar
                        </button>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}

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

function sumScores(ps: PlayerScores): number {
  return Object.values(ps).reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
