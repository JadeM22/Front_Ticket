import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type Notificacion = Tables<{ schema: 'Solicitudes' }, 'Notificaciones'>

export async function listarNotificaciones(usuarioId: number): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('Notificaciones')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('fecha', { ascending: false })
    .limit(30)
  if (error) throw error
  return data ?? []
}

export async function marcarNotificacionVista(id: number): Promise<void> {
  const { error } = await supabase.schema('Solicitudes').from('Notificaciones').update({ visto: true }).eq('id', id)
  if (error) throw error
}

export function suscribirNotificaciones(usuarioId: number, onNueva: (notificacion: Notificacion) => void) {
  const canal = supabase
    .channel(`notificaciones-${usuarioId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'Solicitudes',
        table: 'Notificaciones',
        filter: `usuario_id=eq.${usuarioId}`,
      },
      (payload) => onNueva(payload.new as Notificacion),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(canal)
  }
}
