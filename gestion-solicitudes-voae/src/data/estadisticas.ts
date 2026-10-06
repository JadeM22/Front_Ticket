import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

export type FilaEstadistica =
  Database['Solicitudes']['Functions']['fnEstadisticasTicketsTabla']['Returns'][number]

export interface FiltrosEstadisticas {
  desde?: string | null
  hasta?: string | null
  areaId?: number | null
  tipoSolicitudId?: number | null
}

export async function obtenerEstadisticas(filtros: FiltrosEstadisticas): Promise<FilaEstadistica[]> {
  const { data, error } = await supabase.schema('Solicitudes').rpc('fnEstadisticasTicketsTabla', {
    p_desde: filtros.desde ?? undefined,
    p_hasta: filtros.hasta ?? undefined,
    p_area_id: filtros.areaId ?? undefined,
    p_tipo_solicitud_id: filtros.tipoSolicitudId ?? undefined,
  })
  if (error) throw error
  return data ?? []
}
