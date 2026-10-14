import type { TicketEstadoReal } from '../types/domain'

export const ESTADOS_FINALES_TICKET = ['Aprobado', 'Aprobado (Automático)', 'Rechazado']

/**
 * Tickets "nuevos o pendientes" para un diseñador: sin asignar (disponibles para tomar, sin contar
 * las excepcionales pendientes, que solo responde el Asignador) más los suyos ya retrasados, que
 * necesitan su atención. Comparten esta cuenta la insignia del sidebar y el tablero mismo.
 */
export function contarPendientesDisenador(tickets: TicketEstadoReal[], miId: number): number {
  return tickets.filter((t) => {
    if (t.disenador_id === miId) return t.estado_real === 'Retrasado'
    return !t.disenador_id && !t.es_excepcional && !ESTADOS_FINALES_TICKET.includes(t.estado_real ?? '')
  }).length
}
