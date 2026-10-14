import type { TicketEstadoReal } from '../types/domain'

export const ESTADOS_FINALES_TICKET = ['Aprobado', 'Aprobado (Automático)', 'Rechazado']

const ESTADOS_LIBERADO = ['En proceso', 'Corrección', 'Retrasado']

/**
 * Un ticket "liberado" es uno que ya se había empezado (no es simplemente nuevo) pero quedó sin
 * diseñador porque a quien lo tenía se le desactivó la cuenta o se le quitó el rol Diseñador
 * (Parte 25): la base lo regresa a `disenador_id = null` conservando su estado.
 */
export function esTicketLiberado(ticket: TicketEstadoReal): boolean {
  return !ticket.disenador_id && ESTADOS_LIBERADO.includes(ticket.estado_registrado ?? '')
}
