import type { TicketEstadoReal } from '../types/domain'

/**
 * Estado de la respuesta a una solicitud excepcional, para el detalle y "Mis solicitudes excepcionales".
 * Una aceptada muestra su estado real (En proceso, Finalizado, Corrección…), no siempre "en proceso"; el
 * rechazo automático de la base ya trae "Rechazada automáticamente: …", así que no se le antepone otro
 * "Rechazada:" (6.4).
 */
export function textoRespuestaExcepcional(
  ticket: Pick<TicketEstadoReal, 'excepcional_estado' | 'excepcional_motivo_rechazo' | 'estado_real'>,
): string | null {
  switch (ticket.excepcional_estado) {
    case 'PENDIENTE':
      return 'Pendiente de aceptación'
    case 'ACEPTADA':
      return ticket.estado_real ? `Aceptada – ${ticket.estado_real}` : 'Aceptada'
    case 'RECHAZADA': {
      const motivo = ticket.excepcional_motivo_rechazo?.trim()
      if (!motivo) return 'Rechazada: sin motivo registrado'
      return /^rechazad[ao]\b/i.test(motivo) ? motivo : `Rechazada: ${motivo}`
    }
    default:
      return null
  }
}
