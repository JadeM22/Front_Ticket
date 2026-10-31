import type { TicketEstadoReal } from '../types/domain'

// Compartido por la bandeja del Validador y los contadores de su menú, para que siempre coincidan.
const ESTADOS_POR_REVISAR = ['Enviado', 'Retrasado']

const esperando = (t: TicketEstadoReal) => ESTADOS_POR_REVISAR.includes(t.estado_registrado ?? '')

/**
 * Tickets de aprobación (cualquier tipo con flujo APROBACION) con al menos un envío — sin envío todavía
 * no hay qué revisar — que esperan revisión.
 */
export function revisionesPorHacer(tickets: TicketEstadoReal[]): TicketEstadoReal[] {
  return tickets.filter((t) => t.flujo === 'APROBACION' && esperando(t) && (t.intentos_usados ?? 0) > 0)
}

/** Solicitudes de confirmación (p. ej. Cobertura de evento) que esperan la decisión. */
export function confirmacionesPendientes(tickets: TicketEstadoReal[]): TicketEstadoReal[] {
  return tickets.filter((t) => t.flujo === 'CONFIRMACION' && esperando(t))
}
