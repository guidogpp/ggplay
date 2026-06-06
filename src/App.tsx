import { useState } from 'react';
import './index.css';
import { Lobby } from './components/Lobby';
import { LocalSetup } from './components/LocalSetup';
import { LocalGameBoard } from './components/game/LocalGameBoard';
import { useLocalGameStore } from './store/localGameStore';
import { Wifi, ClipboardList } from 'lucide-react';

type AppMode = 'menu' | 'online' | 'local';

function App() {
  const [mode, setMode] = useState<AppMode>('menu');
  const localView = useLocalGameStore((s) => s.view);
  const startLocalGame = useLocalGameStore((s) => s.startLocalGame);
  const resetLocal = useLocalGameStore((s) => s.resetLocal);

  if (mode === 'online') {
    return <Lobby />;
  }

  if (mode === 'local') {
    if (localView === 'setup') {
      return (
        <LocalSetup
          onStart={(names) => startLocalGame(names)}
          onBack={() => { resetLocal(); setMode('menu'); }}
        />
      );
    }
    return <LocalGameBoard />;
  }

  // —— Menú principal ——
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-4">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">GGPlay</h1>
        <p className="text-sm text-gray-500">La Generala</p>
      </header>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => setMode('online')}
          className="flex items-center justify-center gap-3 w-full py-4 px-4 rounded-xl
                     bg-indigo-600 hover:bg-indigo-500 font-semibold transition-colors text-lg"
        >
          <Wifi className="w-6 h-6" />
          Jugar en Línea
        </button>

        <button
          onClick={() => setMode('local')}
          className="flex items-center justify-center gap-3 w-full py-4 px-4 rounded-xl
                     bg-gray-800 hover:bg-gray-700 font-semibold transition-colors text-lg"
        >
          <ClipboardList className="w-6 h-6" />
          Solo Anotación
        </button>
      </div>

      <p className="text-xs text-gray-600 max-w-xs text-center">
        «Solo Anotación» es para jugar con dados físicos y usar la app solo para llevar los puntajes.
      </p>
    </div>
  );
}

export default App
