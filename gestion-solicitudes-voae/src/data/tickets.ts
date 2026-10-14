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

/** Solo el código, para mostrarlo en el toast de "Solicitud XXX0000 creada" tras crear el ticket. */
export async function obtenerCodigoTicket(ticketId: number): Promise<string | null> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('Ticket')
    .select('codigo')
    .eq('id', ticketId)
    .maybeSingle()
  if (error) throw error
  return data?.codigo ?? null
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

/**
 * `incluirHistorial` decide si se consulta `TicketLog`: solo Analista y Administrador ven el
 * historial, así que para el resto ni siquiera se pide (queda `log: []`). `incluirGestion` hace lo
 * mismo con `Entregables`/`DictamenJefe`: el solicitante puro ya no ve ni entregables ni dictámenes
 * (RLS tampoco se los devolvería), así que para él tampoco se consultan.
 */
export async function obtenerTicketCompleto(
  ticketId: number,
  incluirHistorial: boolean,
  incluirGestion: boolean,
): Promise<TicketCompleto | null> {
  const estadoReal = await obtenerTicketEstadoReal(ticketId)
  if (!estadoReal) return null

  const base = await obtenerTicketBase(ticketId)
  if (!base) return null

  const tipoSolicitud = await obtenerTipoSolicitud(base.tipo_solicitud_id)

  const [detalleFormulario, log, entregables, dictamenes, adjuntos] = await Promise.all([
    tipoSolicitud ? obtenerDetalleFormulario(base.formulario_id, tipoSolicitud.formulario as FormularioCodigo) : null,
    incluirHistorial ? listarTicketLog(ticketId) : [],
    incluirGestion ? listarEntregablesPorTicket(ticketId) : [],
    incluirGestion ? listarDictamenesPorTicket(ticketId) : [],
    listarAdjuntosPorTicket(ticketId),
  ])

  return { estadoReal, base, tipoSolicitud, detalleFormulario, log, entregables, dictamenes, adjuntos }
}

/**
 * "Tomar" un ticket asigna el diseñador. Solo fuerza la transición a "En proceso" cuando el
 * ticket viene de "Enviado"/"En revisión": si ya está "Retrasado" la única transición válida
 * es a "Finalizado" (la pone el entregable), así que aquí solo se actualiza el diseñador.
 *
 * El `update` lleva `.is('disenador_id', null)`: así se detecta si otro diseñador se adelantó entre
 * que se cargó la lista y que se hizo clic en "Tomar" — si la condición ya no se cumple, Supabase
 * actualiza cero filas (`data` vacío) en vez de lanzar un error. Devuelve `true` solo si de verdad
 * quedó asignado a `disenadorId`.
 */
export async function tomarTicket(ticket: TicketEstadoReal, disenadorId: number): Promise<boolean> {
  const payload: { disenador_id: number; estado_id?: number } = { disenador_id: disenadorId }

  if (ticket.estado_registrado === 'Enviado' || ticket.estado_registrado === 'En revisión') {
    payload.estado_id = await obtenerIdEstadoPorNombre('En proceso')
  }

  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('Ticket')
    .update(payload)
    .eq('id', ticket.ticket_id!)
    .is('disenador_id', null)
    .select('id')
  if (error) throw error
  return (data?.length ?? 0) > 0
}

/**
 * Cuenta ligera (sin traer filas) de los tickets que un diseñador puede tomar: sin asignar, no
 * excepcionales y en un estado no final. La usan el badge de "Mi tablero" en el sidebar y la pestaña
 * "Tickets sin asignación" para mostrar el mismo número.
 */
export async function contarTicketsSinAsignar(): Promise<number> {
  const { count, error } = await supabase
    .schema('Solicitudes')
    .from('vw_TicketsEstadoReal')
    .select('ticket_id', { count: 'exact', head: true })
    .is('disenador_id', null)
    .eq('es_excepcional', false)
    .not('estado_registrado', 'in', '("Aprobado","Rechazado","Finalizado")')
  if (error) throw error
  return count ?? 0
}

/** Solo el Asignador acepta o rechaza una solicitud excepcional pendiente. */
export async function responderExcepcional(
  ticketId: number,
  aceptar: boolean,
  opciones: { motivo?: string; disenadorId?: number } = {},
): Promise<void> {
  const { error } = await supabase.schema('Solicitudes').rpc('fnSolicitudExcepcionalResponderEscalar', {
    p_ticket_id: ticketId,
    p_aceptar: aceptar,
    p_motivo: opciones.motivo,
    p_disenador_id: opciones.disenadorId,
  })
  if (error) throw error
}

/** Asignador o Administrador: reasigna el ticket a otro diseñador (y lo pasa a "En proceso" si aplica). */
export async function reasignarTicket(ticket: TicketEstadoReal, disenadorId: number): Promise<void> {
  const payload: { disenador_id: number; estado_id?: number } = { disenador_id: disenadorId }

  if (ticket.estado_registrado === 'Enviado' || ticket.estado_registrado === 'En revisión') {
    payload.estado_id = await obtenerIdEstadoPorNombre('En proceso')
  }

  const { error } = await supabase.schema('Solicitudes').from('Ticket').update(payload).eq('id', ticket.ticket_id!)
  if (error) throw error
}
