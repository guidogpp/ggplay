import { supabase } from '../lib/supabase';
import type { GameType } from '../types/webrtc';

/**
 * Crea una sala nueva en Supabase y devuelve su `id`.
 * Lanza un error si la inserción falla.
 */
export async function createRoom(
  hostId: string,
  gameType: GameType,
): Promise<string> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ host_id: hostId, game_type: gameType, status: 'waiting' })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Error al crear sala: ${error?.message ?? 'sin datos'}`);
  }

  return data.id as string;
}

/**
 * Verifica que una sala exista y esté en estado `waiting`.
 */
export async function checkRoom(roomId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', roomId)
    .eq('status', 'waiting')
    .maybeSingle();

  if (error) {
    console.error('[checkRoom]', error.message);
    return false;
  }

  return data !== null;
}
