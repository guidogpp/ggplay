import { useState } from 'react';
import { Users, Plus, Minus, Play, ArrowLeft } from 'lucide-react';

interface LocalSetupProps {
  onStart: (playerNames: string[]) => void;
  onBack: () => void;
}

export function LocalSetup({ onStart, onBack }: LocalSetupProps) {
  const [numPlayers, setNumPlayers] = useState(2);
  const [names, setNames] = useState<string[]>(['', '']);

  const handleNumChange = (delta: number) => {
    const next = Math.max(2, Math.min(8, numPlayers + delta));
    setNumPlayers(next);
    setNames((prev) => {
      if (next > prev.length) {
        return [...prev, ...Array(next - prev.length).fill('')];
      }
      return prev.slice(0, next);
    });
  };

  const handleNameChange = (index: number, value: string) => {
    setNames((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const allNamed = names.every((n) => n.trim().length > 0);

  const handleStart = () => {
    if (!allNamed) return;
    onStart(names.map((n) => n.trim()));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-4">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">GGPlay</h1>
        <p className="text-sm text-gray-500">Generala — Solo Anotación</p>
      </header>

      {/* Selector de cantidad */}
      <div className="flex flex-col items-center gap-3">
        <label className="text-sm text-gray-400 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Cantidad de jugadores
        </label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleNumChange(-1)}
            disabled={numPlayers <= 2}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="text-3xl font-bold w-10 text-center">{numPlayers}</span>
          <button
            onClick={() => handleNumChange(1)}
            disabled={numPlayers >= 8}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nombres */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {names.map((name, i) => (
          <div key={i}>
            <label className="block text-xs text-gray-500 mb-1">Jugador {i + 1}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(i, e.target.value)}
              placeholder={`Nombre jugador ${i + 1}`}
              maxLength={20}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm
                         placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>

      {/* Botones */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleStart}
          disabled={!allNamed}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl
                     bg-indigo-600 hover:bg-indigo-500 font-semibold transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5" />
          Empezar
        </button>

        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl
                     bg-gray-800 hover:bg-gray-700 font-semibold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>
      </div>
    </div>
  );
}
