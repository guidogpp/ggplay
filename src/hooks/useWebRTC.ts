import { useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNetworkStore } from '../store/networkStore';
import { useGameStore } from '../store/gameStore';
import type { Signal, SignalPayload } from '../types/webrtc';
import type { GameAction } from '../types/game';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const CHANNEL_LABEL = 'game-actions';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Inserta una señal en la tabla `signals` de Supabase.
 */
async function sendSignal(
  roomId: string,
  senderId: string,
  receiverId: string,
  type: Signal['type'],
  payload: SignalPayload,
): Promise<void> {
  const { error } = await supabase.from('signals').insert({
    room_id: roomId,
    sender_id: senderId,
    receiver_id: receiverId,
    type,
    payload,
  });
  if (error) {
    console.error('[sendSignal]', error.message);
  }
}

export function useWebRTC() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const supabaseChannelRef = useRef<RealtimeChannel | null>(null);

  const { playerId } = useNetworkStore.getState();
  const setStatus = useNetworkStore((s) => s.setStatus);
  const setRoom = useNetworkStore((s) => s.setRoom);
  const setIsHost = useNetworkStore((s) => s.setIsHost);

  /**
   * Elimina la suscripción de Supabase Realtime para dejar de consumir cuota.
   */
  const cleanupSupabaseChannel = useCallback(() => {
    if (supabaseChannelRef.current) {
      supabase.removeChannel(supabaseChannelRef.current);
      supabaseChannelRef.current = null;
      console.info('[useWebRTC] Canal de Supabase eliminado — señalización cortada.');
    }
  }, []);

  /**
   * Cierra la conexión peer y el data channel, y limpia el canal de Supabase.
   */
  const cleanup = useCallback(() => {
    channelRef.current?.close();
    channelRef.current = null;

    peerRef.current?.close();
    peerRef.current = null;

    cleanupSupabaseChannel();
  }, [cleanupSupabaseChannel]);

  /**
   * Configura los eventos comunes del DataChannel (onopen / onclose).
   */
  const bindDataChannelEvents = useCallback(
    (dc: RTCDataChannel) => {
      dc.onopen = () => {
        console.info('[DataChannel] Conexión P2P abierta.');
        setStatus('connected');
        // Registrar el canal en el store para enviar mensajes.
        useNetworkStore.getState().setDataChannel(dc);
        // CRÍTICO: cortamos la señalización de Supabase para no consumir cuota.
        cleanupSupabaseChannel();

        // Cliente anuncia su nombre al Host vía GameIntent.
        const { isHost: currentIsHost, playerName: pName, playerId: pid } = useNetworkStore.getState();
        if (!currentIsHost) {
          useGameStore.getState().sendIntent({ type: 'ANNOUNCE_PLAYER', name: pName || pid.slice(0, 8) });
        }
      };

      dc.onclose = () => {
        console.info('[DataChannel] Conexión P2P cerrada.');
        useNetworkStore.getState().setDataChannel(null);
        setStatus('disconnected');
      };

      dc.onmessage = (event: MessageEvent<string>) => {
        const action: GameAction = JSON.parse(event.data) as GameAction;
        useNetworkStore.getState().addPeer(action.senderId);
        useGameStore.getState().dispatchAction(action);
      };
    },
    [setStatus, cleanupSupabaseChannel],
  );

  /**
   * Inicializa la conexión WebRTC para la sala indicada.
   *
   * - Si `isHost` es true, crea el DataChannel y genera un offer.
   * - Si es false (Cliente), escucha el offer, responde con un answer y
   *   espera a recibir el DataChannel remoto.
   */
  const initializeConnection = useCallback(
    async (roomId: string, isHost: boolean) => {
      // — Limpieza de conexión previa —
      cleanup();

      // — Actualizar store —
      setRoom(roomId);
      setIsHost(isHost);
      setStatus('signaling');

      // — Nueva RTCPeerConnection —
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerRef.current = pc;

      // ————————————————————————————
      //  ICE Candidates — envío
      // ————————————————————————————
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal(roomId, playerId, NIL_UUID, 'ice-candidate', {
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // ————————————————————————————
      //  Supabase Realtime — escucha de señales
      // ————————————————————————————
      const realtimeChannel = supabase
        .channel(`room-${roomId}`)
        .on<Signal>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'signals',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            const signal = payload.new;

            // Ignorar señales enviadas por nosotros mismos.
            if (signal.sender_id === playerId) return;

            void handleIncomingSignal(signal);
          },
        )
        .subscribe();

      supabaseChannelRef.current = realtimeChannel;

      // ————————————————————————————
      //  Estado: ¿ya se hizo setRemoteDescription?
      //  Cola de ICE candidates que llegan antes de tener remote description.
      // ————————————————————————————
      let remoteDescriptionSet = false;
      const pendingCandidates: RTCIceCandidateInit[] = [];

      /**
       * Drena la cola de ICE candidates pendientes una vez que
       * setRemoteDescription se completó con éxito.
       */
      async function drainPendingCandidates(): Promise<void> {
        const currentPc = peerRef.current;
        if (!currentPc) return;
        while (pendingCandidates.length > 0) {
          const c = pendingCandidates.shift()!;
          await currentPc.addIceCandidate(c);
        }
      }

      // ————————————————————————————
      //  Manejo de señales entrantes
      // ————————————————————————————
      async function handleIncomingSignal(signal: Signal): Promise<void> {
        const currentPc = peerRef.current;
        if (!currentPc) return;

        switch (signal.type) {
          case 'offer': {
            if (isHost) return; // El host no procesa offers ajenos.
            if (signal.payload.sdp) {
              await currentPc.setRemoteDescription(signal.payload.sdp);
              remoteDescriptionSet = true;

              const answer = await currentPc.createAnswer();
              await currentPc.setLocalDescription(answer);
              void sendSignal(roomId, playerId, signal.sender_id, 'answer', {
                sdp: currentPc.localDescription?.toJSON() as RTCSessionDescriptionInit,
              });

              // Drenar ICE candidates que llegaron antes de la offer.
              await drainPendingCandidates();
            }
            break;
          }
          case 'answer': {
            if (!isHost) return; // Solo el host procesa answers.
            if (signal.payload.sdp) {
              await currentPc.setRemoteDescription(signal.payload.sdp);
              remoteDescriptionSet = true;

              // Drenar ICE candidates que llegaron antes del answer.
              await drainPendingCandidates();
            }
            break;
          }
          case 'ice-candidate': {
            if (signal.payload.candidate) {
              if (remoteDescriptionSet) {
                await currentPc.addIceCandidate(signal.payload.candidate);
              } else {
                // Encolar hasta que tengamos remote description.
                pendingCandidates.push(signal.payload.candidate);
              }
            }
            break;
          }
        }
      }

      // ————————————————————————————
      //  Host: crear DataChannel + offer
      // ————————————————————————————
      if (isHost) {
        const dc = pc.createDataChannel(CHANNEL_LABEL);
        channelRef.current = dc;
        bindDataChannelEvents(dc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        void sendSignal(roomId, playerId, NIL_UUID, 'offer', {
          sdp: pc.localDescription?.toJSON() as RTCSessionDescriptionInit,
        });
      } else {
        // ————————————————————————————
        //  Cliente: esperar DataChannel remoto
        // ————————————————————————————
        pc.ondatachannel = (event) => {
          const dc = event.channel;
          channelRef.current = dc;
          bindDataChannelEvents(dc);
        };

        // ————————————————————————————
        //  Cliente: consulta histórica para resolver race condition.
        //  La offer del Host puede haber sido insertada ANTES de que
        //  el Cliente se suscribiera a Realtime.
        // ————————————————————————————
        const { data: existingSignals } = await supabase
          .from('signals')
          .select('*')
          .eq('room_id', roomId)
          .neq('sender_id', playerId)
          .order('created_at', { ascending: true });

        if (existingSignals && existingSignals.length > 0) {
          // Procesar primero la offer (si existe) para establecer remote description.
          const offerSignal = existingSignals.find(
            (s): s is Signal => s.type === 'offer',
          );
          if (offerSignal) {
            await handleIncomingSignal(offerSignal);
          }

          // Luego procesar ICE candidates históricos (ya se drenan si la offer fue procesada).
          const iceCandidates = existingSignals.filter(
            (s): s is Signal => s.type === 'ice-candidate',
          );
          for (const ic of iceCandidates) {
            await handleIncomingSignal(ic);
          }
        }
      }
    },
    [playerId, setStatus, setRoom, setIsHost, cleanup, bindDataChannelEvents],
  );

  return {
    /** Ref al RTCPeerConnection actual (para lectura avanzada). */
    peerRef,
    /** Ref al RTCDataChannel actual. */
    channelRef,
    /** Inicia la conexión WebRTC a una sala. */
    initializeConnection,
    /** Limpia la conexión peer y la suscripción de Supabase. */
    cleanup,
  };
}
