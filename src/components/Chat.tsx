import { useState, useRef, useEffect, type FormEvent } from 'react';
import { SendHorizonal } from 'lucide-react';
import { useNetworkStore } from '../store/networkStore';
import { useGameStore } from '../store/gameStore';

export function Chat() {
  const playerId = useNetworkStore((s) => s.playerId);
  const sendMessage = useNetworkStore((s) => s.sendMessage);
  const messages = useGameStore((s) => s.messages);
  const dispatchAction = useGameStore((s) => s.dispatchAction);

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll al último mensaje.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    // Enviar al peer vía DataChannel.
    sendMessage({ type: 'CHAT', payload: text });

    // Procesar localmente (el Host lo sincronizará con SYNC_STATE).
    dispatchAction({ type: 'CHAT', payload: text, senderId: playerId });

    setInput('');
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto h-80 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Historial */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-gray-600 text-sm text-center mt-8">
            Sin mensajes aún. ¡Escribe algo!
          </p>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.senderId === playerId;
          return (
            <div
              key={i}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-1.5 text-sm break-words ${
                  isOwn
                    ? 'bg-indigo-600 text-gray-100'
                    : 'bg-gray-800 text-gray-300'
                }`}
              >
                {!isOwn && (
                  <span className="block text-[10px] text-gray-500 font-mono mb-0.5">
                    {msg.senderId.slice(0, 8)}
                  </span>
                )}
                {msg.text}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-gray-800 px-3 py-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje…"
          className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="shrink-0 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-40"
          disabled={input.trim().length === 0}
        >
          <SendHorizonal className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
