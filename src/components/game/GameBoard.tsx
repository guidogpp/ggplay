import { Dices, Trophy, Play } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useNetworkStore } from '../../store/networkStore';
import { Dice } from './Dice';
import { ScoreTable } from './ScoreTable';
import { GeneralaEngine } from '../../logic/GeneralaEngine';
import type { PlayerScores } from '../../types/game';

export function GameBoard() {
  const generala = useGameStore((s) => s.gameState.generala);
  const sendIntent = useGameStore((s) => s.sendIntent);
  const startGame = useGameStore((s) => s.startGame);
  const playerId = useNetworkStore((s) => s.playerId);
  const isHost = useNetworkStore((s) => s.isHost);
  const peerIds = useNetworkStore((s) => s.peerIds);

  // ——————————————————————————
  //  Pre-juego: el host puede iniciar
  // ——————————————————————————
  if (!generala) {
    if (!isHost) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <Dices className="w-12 h-12 text-gray-500" />
          <p className="text-gray-400">Esperando a que el host inicie la partida…</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Dices className="w-12 h-12 text-indigo-400" />
        <p className="text-gray-400 text-sm">
          {peerIds.length === 0
            ? 'Esperando al otro jugador…'
            : `Jugador conectado ✓`}
        </p>
        <button
          onClick={() => startGame([playerId, ...peerIds])}
          disabled={peerIds.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl
                     bg-indigo-600 hover:bg-indigo-500 font-semibold
                     transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5" />
          Empezar Generala
        </button>
      </div>
    );
  }

  const { dices, kept, rollsLeft, currentTurn, phase, players } = generala;
  const isMyTurn = currentTurn === playerId;
  const hasRolled = rollsLeft < GeneralaEngine.MAX_ROLLS;

  // ——————————————————————————
  //  Fase FINISHED
  // ——————————————————————————
  if (phase === 'FINISHED') {
    const totals = players.map((pid) => ({
      pid,
      total: sumScores(generala.scores[pid] ?? {}),
    }));
    totals.sort((a, b) => b.total - a.total);
    const winner = totals[0];

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto py-6">
        <Trophy className="w-14 h-14 text-amber-400" />
        <h2 className="text-2xl font-bold text-amber-400">¡Partida Terminada!</h2>
        <p className="text-gray-300">
          Ganador:{' '}
          <span className="font-bold text-amber-300">
            {winner.pid === playerId ? 'Tú' : (generala.playerNames[winner.pid] || winner.pid.slice(0, 8))}
          </span>{' '}
          con <span className="font-mono font-bold">{winner.total}</span> puntos
        </p>
        <ScoreTable generala={generala} />
      </div>
    );
  }

  // ——————————————————————————
  //  Partida en curso
  // ——————————————————————————
  const peerName = generala.playerNames[currentTurn] || currentTurn.slice(0, 8);
  const turnLabel = isMyTurn ? 'Tu turno' : `Turno de ${peerName}…`;
  const canRoll = isMyTurn && phase === 'ROLLING' && rollsLeft > 0;
  const canToggle = isMyTurn && phase === 'ROLLING' && hasRolled;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto py-4">
      {/* Indicador de turno */}
      <div
        className={`text-center px-4 py-2 rounded-lg text-sm font-semibold ${
          isMyTurn
            ? 'bg-amber-900/30 border border-amber-600 text-amber-300'
            : 'bg-gray-800 border border-gray-700 text-gray-400'
        }`}
      >
        {turnLabel}
        {isMyTurn && (
          <span className="ml-2 text-xs opacity-70">
            ({rollsLeft} tirada{rollsLeft !== 1 ? 's' : ''} restante{rollsLeft !== 1 ? 's' : ''})
          </span>
        )}
      </div>

      {/* Dados */}
      <div className="flex gap-3 flex-wrap justify-center">
        {dices.map((value, i) => (
          <Dice
            key={i}
            value={value}
            isKept={kept[i]}
            disabled={!canToggle}
            rollsLeft={rollsLeft}
            onToggle={() => sendIntent({ type: 'TOGGLE_DICE', index: i })}
          />
        ))}
      </div>

      {/* Botón tirar */}
      <button
        onClick={() => sendIntent({ type: 'ROLL_DICE' })}
        disabled={!canRoll}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold
                   transition-colors
                   bg-indigo-600 hover:bg-indigo-500
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
      >
        <Dices className="w-5 h-5" />
        {hasRolled ? 'Volver a tirar' : 'Tirar dados'}
      </button>

      {/* Tabla de puntajes */}
      <ScoreTable generala={generala} />
    </div>
  );
}

function sumScores(ps: PlayerScores): number {
  return Object.values(ps).reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
