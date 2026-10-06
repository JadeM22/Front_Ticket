import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { DetalleFormulario, FormularioCodigo, TicketEstadoReal } from '../types/domain'
import { obtenerIdEstadoPorNombre, obtenerTipoSolicitud, type TipoSolicitud } from './catalogos'
import { obtenerDetalleFormulario } from './formularios'
import { listarEntregablesPorTicket, type Entregable } from './entregables'
import { listarDictamenesPorTicket, type DictamenJefe } from './dictamenes'
import { listarAdjuntosPorTicket, type Adjunto } from './adjuntos'

export type TicketBase = Tables<{ schema: 'Solicitudes' }, 'Ticket'>
export type TicketLog = Tables<{ schema: 'Solicitudes' }, 'TicketLog'>

export interface TicketCompleto {
  estadoReal: TicketEstadoReal
  base: TicketBase
  tipoSolicitud: TipoSolicitud | null
  detalleFormulario: DetalleFormulario | null
  log: TicketLog[]
  entregables: Entregable[]
  dictamenes: DictamenJefe[]
  adjuntos: Adjunto[]
}

export async function listarTicketsEstadoReal(): Promise<TicketEstadoReal[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('vw_TicketsEstadoReal')
    .select('*')
    .order('fecha_registro', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function obtenerTicketEstadoReal(ticketId: number): Promise<TicketEstadoReal | null> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('vw_TicketsEstadoReal')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function obtenerTicketBase(ticketId: number): Promise<TicketBase | null> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('Ticket')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function listarTicketLog(ticketId: number): Promise<TicketLog[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('TicketLog')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('numero_version')
  if (error) throw error
  return data ?? []
}

export async function obtenerTicketCompleto(ticketId: number): Promise<TicketCompleto | null> {
  const estadoReal = await obtenerTicketEstadoReal(ticketId)
  if (!estadoReal) return null

  const base = await obtenerTicketBase(ticketId)
  if (!base) return null

  const tipoSolicitud = await obtenerTipoSolicitud(base.tipo_solicitud_id)

  const [detalleFormulario, log, entregables, dictamenes, adjuntos] = await Promise.all([
    tipoSolicitud ? obtenerDetalleFormulario(base.formulario_id, tipoSolicitud.formulario as FormularioCodigo) : null,
    listarTicketLog(ticketId),
    listarEntregablesPorTicket(ticketId),
    listarDictamenesPorTicket(ticketId),
    listarAdjuntosPorTicket(ticketId),
  ])

  return { estadoReal, base, tipoSolicitud, detalleFormulario, log, entregables, dictamenes, adjuntos }
}

/**
 * "Tomar" un ticket asigna el diseñador. Solo fuerza la transición a "En proceso" cuando el
 * ticket viene de "Enviado"/"En revisión": si ya está "Retrasado" la única transición válida
 * es a "Finalizado" (la pone el entregable), así que aquí solo se actualiza el diseñador.
 */
export async function tomarTicket(ticket: TicketEstadoReal, disenadorId: number): Promise<void> {
  const payload: { disenador_id: number; estado_id?: number } = { disenador_id: disenadorId }

  if (ticket.estado_registrado === 'Enviado' || ticket.estado_registrado === 'En revisión') {
    payload.estado_id = await obtenerIdEstadoPorNombre('En proceso')
  }

  const { error } = await supabase.schema('Solicitudes').from('Ticket').update(payload).eq('id', ticket.ticket_id!)
  if (error) throw error
}
