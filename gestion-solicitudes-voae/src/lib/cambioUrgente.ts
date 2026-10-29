import type { TicketEstadoReal } from '../types/domain'

/**
 * La base revisa el estado *guardado* (no el que calcula la vista): un "Aprobado (Automático)" o un
 * "Retrasado" que el cron todavía no persistió se rechazaría. Por eso el botón sigue a
 * `estado_registrado`, y solo aparece cuando el pedido se puede hacer de verdad.
 */
const ESTADOS_ORIGEN = ['Retrasado', 'Aprobado']
/** Un cambio urgente deja de estar "en curso" cuando termina aprobado o rechazado (igual que la base). */
const ESTADOS_CERRADOS = ['Aprobado', 'Rechazado']

export function cambioUrgenteEnCurso(cambios: Pick<TicketEstadoReal, 'estado_registrado'>[]): boolean {
  return cambios.some((c) => !ESTADOS_CERRADOS.includes(c.estado_registrado ?? ''))
}

/**
 * `true` solo cuando la base va a aceptar el pedido: ticket de diseño, guardado como Retrasado o
 * Aprobado, de un área que el usuario dirige y sin otro cambio urgente en curso.
 */
export function puedePedirCambioUrgente(
  ticket: TicketEstadoReal,
  areasQueDirige: Set<number>,
  cambiosDelTicket: Pick<TicketEstadoReal, 'estado_registrado'>[],
): boolean {
  return (
    (ticket.flujo ?? 'DISENO') === 'DISENO' &&
    ticket.area_id != null &&
    areasQueDirige.has(ticket.area_id) &&
    ESTADOS_ORIGEN.includes(ticket.estado_registrado ?? '') &&
    !cambioUrgenteEnCurso(cambiosDelTicket)
  )
}
