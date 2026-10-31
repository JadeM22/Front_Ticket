import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { DetalleFormulario, TicketEstadoReal } from '../types/domain'
import { obtenerIdEstadoPorNombre, obtenerTipoSolicitud, type TipoSolicitud } from './catalogos'
import { obtenerDetalleFormulario } from './formularios'
import { listarEntregablesPorTicket, type Entregable } from './entregables'
import { listarDictamenesPorTicket, type DictamenJefe } from './dictamenes'
import { listarAdjuntosPorTicket, type Adjunto } from './adjuntos'
import { listarEnviosIA, listarRevisionesIA, type EnvioIA, type RevisionIA } from './afichesIA'
import { obtenerDecisionValidacion, type DecisionValidacion } from './validacion'

/**
 * Lo único que el detalle necesita de la tabla `Ticket` (lo demás sale de la vista). Nunca `*`: la
 * tabla trae `disenador_id`/`asignado_por`/`fecha_asignacion`/`excepcional_respondido_por`, que la
 * vista sí oculta a quien no debe ver la asignación (E-01).
 */
const COLUMNAS_TICKET_BASE = 'id, formulario_id, tipo_solicitud_id, ticket_origen_id, motivo_cambio_urgente'
export type TicketBase = Pick<
  Tables<{ schema: 'Solicitudes' }, 'Ticket'>,
  'id' | 'formulario_id' | 'tipo_solicitud_id' | 'ticket_origen_id' | 'motivo_cambio_urgente'
>
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
  /** Solo en tickets de flujo APROBACION; vacíos en los de diseño. */
  enviosIA: EnvioIA[]
  revisionesIA: RevisionIA[]
  /** Solo en tickets de flujo CONFIRMACION, una vez que el Validador decidió. */
  decisionValidacion: DecisionValidacion | null
  /**
   * Parte 53: la corrección llegó al final del plazo y la base movió `fecha_limite` (el último registro
   * del historial es "Fecha límite: A -> B"). Solo se calcula para quien gestiona un ticket en Corrección.
   */
  conMargenCorreccion: boolean
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
    .select(COLUMNAS_TICKET_BASE)
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
 * `true` si lo último que registró el historial fue un cambio de fecha límite. Si RLS no deja leer
 * `TicketLog`, simplemente no hay aviso: no es un error que deba ver el usuario.
 */
async function ultimoCambioEsFechaLimite(ticketId: number): Promise<boolean> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('TicketLog')
    .select('descripcion_cambio')
    .eq('ticket_id', ticketId)
    .order('numero_version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return false
  return data.descripcion_cambio.includes('Fecha límite:')
}

/**
 * `incluirHistorial` decide si se consulta `TicketLog`: solo Analista y Administrador ven el
 * historial, así que para el resto ni siquiera se pide (queda `log: []`). `incluirGestion` hace lo
 * mismo con `DictamenJefe`: el solicitante no ve dictámenes. Los `Entregables` se piden siempre:
 * el solicitante sí los ve, y RLS solo devuelve los que cada quien puede leer.
 *
 * Solo los tickets de diseño tienen entregables y dictamen: uno IA trae en su lugar sus envíos y
 * revisiones, y uno de validación la decisión del Validador.
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

  const esAprobacion = estadoReal.flujo === 'APROBACION'
  const esConfirmacion = estadoReal.flujo === 'CONFIRMACION'
  const esDiseno = !esAprobacion && !esConfirmacion

  const [
    detalleFormulario,
    log,
    entregables,
    dictamenes,
    adjuntos,
    enviosIA,
    revisionesIA,
    decisionValidacion,
    conMargenCorreccion,
  ] = await Promise.all([
      obtenerDetalleFormulario(base.formulario_id),
      incluirHistorial ? listarTicketLog(ticketId) : [],
      esDiseno ? listarEntregablesPorTicket(ticketId) : [],
      incluirGestion && esDiseno ? listarDictamenesPorTicket(ticketId) : [],
      listarAdjuntosPorTicket(ticketId),
      esAprobacion ? listarEnviosIA(ticketId) : [],
      esAprobacion ? listarRevisionesIA(ticketId) : [],
      esConfirmacion ? obtenerDecisionValidacion(ticketId) : null,
      incluirGestion && esDiseno && estadoReal.estado_real === 'Corrección' ? ultimoCambioEsFechaLimite(ticketId) : false,
    ])

  return {
    estadoReal,
    base,
    tipoSolicitud,
    detalleFormulario,
    log,
    entregables,
    dictamenes,
    adjuntos,
    enviosIA,
    revisionesIA,
    decisionValidacion,
    conMargenCorreccion,
  }
}

/** `ocupado`: otro diseñador se adelantó. `fallo`: sigue sin diseñador, pero no se pudo tomar. */
export type ResultadoTomar = 'tomado' | 'ocupado' | 'fallo'

/**
 * "Tomar" un ticket asigna el diseñador. Solo fuerza la transición a "En proceso" cuando el
 * ticket viene de "Enviado"/"En revisión": si ya está "Retrasado" la única transición válida
 * es a "Finalizado" (la pone el entregable), así que aquí solo se actualiza el diseñador.
 *
 * El `update` lleva `.is('disenador_id', null)` para detectar si otro diseñador se adelantó entre
 * que se cargó la lista y que se hizo clic en "Tomar". Supabase no lanza error cuando la condición
 * (o RLS) deja fuera la fila: actualiza cero filas. En ese caso se vuelve a consultar el ticket y
 * solo se reporta `ocupado` si de verdad ya tiene diseñador (E-02).
 */
export async function tomarTicket(ticket: TicketEstadoReal, disenadorId: number): Promise<ResultadoTomar> {
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
  if ((data?.length ?? 0) > 0) return 'tomado'

  const actual = await obtenerTicketEstadoReal(ticket.ticket_id!)
  return actual?.disenador_id != null ? 'ocupado' : 'fallo'
}

/**
 * Cuenta ligera (sin traer filas) de los tickets que un diseñador puede tomar: sin asignar, en un
 * estado no final y, si son excepcionales, ya aceptadas (las PENDIENTE las decide el Asignador; Parte 46). La usan el badge de "Mi tablero" en el sidebar y la pestaña
 * "Tickets sin asignación" para mostrar el mismo número.
 */
export async function contarTicketsSinAsignar(): Promise<number> {
  const { count, error } = await supabase
    .schema('Solicitudes')
    .from('vw_TicketsEstadoReal')
    .select('ticket_id', { count: 'exact', head: true })
    .is('disenador_id', null)
    .or('es_excepcional.eq.false,excepcional_estado.eq.ACEPTADA')
    // Los tickets IA nunca tienen diseñador: RLS ya se los oculta al Diseñador, pero alguien que además
    // sea Administrador sí los recibe y no deben contar como "sin asignar".
    .eq('flujo', 'DISENO')
    .not('estado_registrado', 'in', '("Aprobado","Rechazado","Finalizado")')
  if (error) throw error
  return count ?? 0
}

export interface TicketActivoResumen {
  codigo: string
  estado_registrado: string | null
}

/**
 * Tickets de un diseñador que quedarían liberados (`disenador_id = null`) si se le desactiva la
 * cuenta o se le quita el rol Diseñador (Parte 25). Los "Finalizado" no entran: esos se quedan con
 * él hasta que el jefe pida corrección. La usa `admin/Usuarios.tsx` para avisar antes de confirmar.
 */
export async function listarTicketsActivosDeDisenador(disenadorId: number): Promise<TicketActivoResumen[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('vw_TicketsEstadoReal')
    .select('codigo, estado_registrado')
    .eq('disenador_id', disenadorId)
    .in('estado_registrado', ['En revisión', 'En proceso', 'Corrección', 'Retrasado'])
  if (error) throw error
  return (data ?? []).filter((t): t is TicketActivoResumen => Boolean(t.codigo))
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
