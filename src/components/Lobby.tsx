import { useState, useEffect } from 'react';
import { WifiOff, Link2, LogIn, Plus, Loader2, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import { useNetworkStore } from '../store/networkStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { createRoom, checkRoom } from '../services/roomService';
import { Chat } from './Chat';
import { GameBoard } from './game/GameBoard';

type LobbyView = 'idle' | 'creating' | 'waiting' | 'joining';

export function Lobby() {
  const { status, roomId, playerId } = useNetworkStore();
  const playerName = useNetworkStore((s) => s.playerName);
  const setPlayerName = useNetworkStore((s) => s.setPlayerName);
  const { initializeConnection } = useWebRTC();

  const [view, setView] = useState<LobbyView>('idle');
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Lee ?room= de la URL al montar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinId(roomParam);
      setView('joining');
    }
  }, []);

  const nameEmpty = playerName.trim().length === 0;

  // —————————————————————————————
  //  Crear sala (Host)
  // —————————————————————————————
  const handleCreateRoom = async () => {
    setError(null);
    setView('creating');

    try {
      const newRoomId = await createRoom(playerId, 'generala');
      useNetworkStore.getState().setRoom(newRoomId);
      useNetworkStore.getState().setIsHost(true);
      await initializeConnection(newRoomId, true);
      setView('waiting');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      setView('idle');
    }
  };

  // —————————————————————————————
  //  Unirse a sala (Cliente)
  // —————————————————————————————
  const handleJoinRoom = async () => {
    setError(null);
    const trimmedId = joinId.trim();

    if (!trimmedId) {
      setError('Ingresa un Room ID válido.');
      return;
    }

    try {
      const exists = await checkRoom(trimmedId);
      if (!exists) {
        setError('Sala no encontrada o ya no está disponible.');
        return;
      }

      useNetworkStore.getState().setRoom(trimmedId);
      useNetworkStore.getState().setIsHost(false);
      await initializeConnection(trimmedId, false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
    }
  };

  // —————————————————————————————
  //  Copiar enlace de invitación
  // —————————————————————————————
  const inviteUrl = roomId ? `${window.location.origin}?room=${roomId}` : '';

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = roomId
    ? `https://wa.me/?text=${encodeURIComponent(`¡Únete a mi partida de Generala en GGPlay! ${inviteUrl}`)}`
    : '';

  // —————————————————————————————
  //  Badge de estado de red
  // —————————————————————————————
  const statusConfig: Record<typeof status, { label: string; color: string }> = {
    idle: { label: 'Desconectado', color: 'text-gray-400' },
    signaling: { label: 'Señalizando…', color: 'text-yellow-400' },
    connected: { label: 'Conectado', color: 'text-emerald-400' },
    error: { label: 'Error', color: 'text-red-400' },
    disconnected: { label: 'Desconectado', color: 'text-gray-400' },
  };

  const { label: statusLabel, color: statusColor } = statusConfig[status];

  // ═════════════════════════════════════════
  //  Render — Connected (sin banner de debug)
  // ═════════════════════════════════════════
  if (status === 'connected') {
    return (
      <div className="flex flex-col items-center min-h-screen gap-6 px-4 py-6">
        <GameBoard />
        <Chat />
      </div>
    );
  }

  // ═════════════════════════════════════════
  //  Render — Lobby
  // ═════════════════════════════════════════
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-4">
      {/* Header */}
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">GGPlay</h1>
        <p className="text-sm text-gray-500">La Generala — P2P</p>
        <div className="flex items-center justify-center gap-2 text-sm">
          <WifiOff className={`w-4 h-4 ${statusColor}`} />
          <span className={statusColor}>{statusLabel}</span>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-2 text-sm max-w-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* — Input de nombre (siempre visible pre-conexión) — */}
      {view !== 'waiting' && (
        <div className="w-full max-w-xs">
          <label className="block text-sm text-gray-400 mb-1.5">Tu nombre</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ej: Lionel"
            maxLength={20}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm
                       placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* — Modo Idle — */}
      {(view === 'idle' || view === 'creating') && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => void handleCreateRoom()}
            disabled={view === 'creating' || nameEmpty}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {view === 'creating' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Crear Sala
          </button>

          <button
            onClick={() => { setView('joining'); setError(null); }}
            disabled={view === 'creating' || nameEmpty}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Unirse a Sala
          </button>
        </div>
      )}

      {/* — Waiting (Host) — */}
      {view === 'waiting' && status === 'signaling' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm text-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-gray-300">Esperando oponente…</p>
          <p className="text-sm text-gray-400">Comparte el enlace de la sala:</p>

          {/* Botones de invitación */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => void handleCopyLink()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                         bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 text-gray-400" />
                  Copiar enlace
                </>
              )}
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                         bg-emerald-700 hover:bg-emerald-600 text-sm font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* — Joining (Cliente) — */}
      {view === 'joining' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <label className="text-sm text-gray-400">Room ID</label>
          <input
            type="text"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Pega el ID de la sala"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setView('idle'); setError(null); }}
              className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleJoinRoom()}
              disabled={status === 'signaling' || nameEmpty}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold transition-colors text-sm"
            >
              {status === 'signaling' ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Confirmar'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
