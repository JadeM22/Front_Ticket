import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import { nombresAlcance } from '../lib/campus'

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

interface FilaAlcance {
  id: number
  Formularios: {
    FormularioCampus: { Campus: { nombre: string; orden: number; es_cobertura_nacional: boolean } | null }[]
  } | null
}

/** Cuántos ids caben en un `.in()` sin que la URL de PostgREST se vuelva demasiado larga. */
const TAMANO_LOTE_ALCANCE = 200

/**
 * Alcance (campus) de cada ticket, que la RPC de estadísticas no trae: ticket → nombres visibles, con
 * "Cobertura nacional" en lugar de la fila nacional. Los tickets que RLS no devuelve quedan sin alcance.
 */
export async function obtenerAlcancePorTicket(ticketIds: number[]): Promise<Map<number, string[]>> {
  const alcance = new Map<number, string[]>()
  for (let i = 0; i < ticketIds.length; i += TAMANO_LOTE_ALCANCE) {
    const lote = ticketIds.slice(i, i + TAMANO_LOTE_ALCANCE)
    const { data, error } = await supabase
      .schema('Solicitudes')
      .from('Ticket')
      .select('id, Formularios(FormularioCampus(Campus(nombre, orden, es_cobertura_nacional)))')
      .in('id', lote)
    if (error) throw error
    for (const fila of (data ?? []) as unknown as FilaAlcance[]) {
      const campus = (fila.Formularios?.FormularioCampus ?? [])
        .map((fc) => fc.Campus)
        .filter((c): c is NonNullable<typeof c> => c != null)
        .sort((a, b) => a.orden - b.orden)
      alcance.set(fila.id, nombresAlcance(campus))
    }
  }
  return alcance
}
