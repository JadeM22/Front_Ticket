import type { TicketEstadoReal } from '../types/domain'

// Compartido por la bandeja del Validador y los contadores de su menú, para que siempre coincidan.
const ESTADOS_POR_REVISAR = ['Enviado', 'Retrasado']

const esperando = (t: TicketEstadoReal) => ESTADOS_POR_REVISAR.includes(t.estado_registrado ?? '')

/** Afiches con al menos un envío (sin envío todavía no hay qué revisar) que esperan revisión. */
export function afichesPorRevisar(tickets: TicketEstadoReal[]): TicketEstadoReal[] {
  return tickets.filter((t) => t.flujo === 'APROBACION_IA' && esperando(t) && (t.intentos_usados ?? 0) > 0)
}

/** Solicitudes de validación (Cobertura de evento) que esperan la decisión. */
export function validacionesPendientes(tickets: TicketEstadoReal[]): TicketEstadoReal[] {
  return tickets.filter((t) => t.flujo === 'VALIDACION' && esperando(t))
}
