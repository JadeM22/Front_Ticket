import { supabase } from '../lib/supabase'
import type { TicketEstadoReal } from '../types/domain'

/**
 * Cambio urgente (Parte 54): una solicitud excepcional nueva ligada a un ticket de diseño Retrasado o
 * Aprobado por `Ticket.ticket_origen_id`. La vista `vw_TicketsEstadoReal` no trae esa columna, así que
 * se lee aparte de `Ticket` (RLS decide cuáles ve cada quien).
 */
export interface CambioUrgente {
  /** Id del ticket nuevo (el cambio urgente). */
  id: number
  ticketOrigenId: number
  motivo: string | null
  /** `null` si quien mira no puede ver el ticket original. */
  codigoOrigen: string | null
}

export async function listarCambiosUrgentes(): Promise<CambioUrgente[]> {
  const sb = supabase.schema('Solicitudes')
  const { data, error } = await sb
    .from('Ticket')
    .select('id, ticket_origen_id, motivo_cambio_urgente')
    .not('ticket_origen_id', 'is', null)
  if (error) throw error
  const filas = data ?? []
  if (filas.length === 0) return []

  const idsOrigen = Array.from(new Set(filas.map((f) => f.ticket_origen_id!)))
  const origenes = await sb.from('Ticket').select('id, codigo').in('id', idsOrigen)
  if (origenes.error) throw origenes.error
  const codigoPorId = new Map((origenes.data ?? []).map((o) => [o.id, o.codigo]))

  return filas.map((f) => ({
    id: f.id,
    ticketOrigenId: f.ticket_origen_id!,
    motivo: f.motivo_cambio_urgente,
    codigoOrigen: codigoPorId.get(f.ticket_origen_id!) ?? null,
  }))
}

/** Los cambios urgentes de un ticket, con su estado real, para la sección del ticket original. */
export async function listarCambiosUrgentesDe(ticketOrigenId: number): Promise<TicketEstadoReal[]> {
  const sb = supabase.schema('Solicitudes')
  const { data, error } = await sb.from('Ticket').select('id').eq('ticket_origen_id', ticketOrigenId)
  if (error) throw error
  const ids = (data ?? []).map((f) => f.id)
  if (ids.length === 0) return []

  const vista = await sb
    .from('vw_TicketsEstadoReal')
    .select('*')
    .in('ticket_id', ids)
    .order('fecha_registro', { ascending: false })
  if (vista.error) throw vista.error
  return vista.data ?? []
}

/**
 * La base valida todo (jefe del área, flujo, estado, motivo, que no haya otro en curso) y devuelve el
 * id del ticket nuevo. Sin `fechaEvento`, usa la mínima de una excepcional.
 */
export async function pedirCambioUrgente(ticketOrigenId: number, motivo: string, fechaEvento: string | null): Promise<number> {
  const { data, error } = await supabase.schema('Solicitudes').rpc('fnSolicitudCambioUrgenteCrearEscalar', {
    p_ticket_origen_id: ticketOrigenId,
    p_motivo: motivo,
    p_fecha_evento: fechaEvento ?? undefined,
  })
  if (error) throw error
  return data
}
