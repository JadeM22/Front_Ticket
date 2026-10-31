import type { TicketEstadoReal } from '../types/domain'

/** El motivo tal cual si ya empieza con "Rechazada…" (rechazo automático de la base); si no, se antepone. */
function textoRechazo(motivoRechazo: string | null | undefined): string {
  const motivo = motivoRechazo?.trim()
  if (!motivo) return 'Rechazada: sin motivo registrado'
  return /^rechazad[ao]\b/i.test(motivo) ? motivo : `Rechazada: ${motivo}`
}

/**
 * Estado de la respuesta a una solicitud excepcional, para el detalle y "Mis solicitudes excepcionales".
 * - Diseño: una aceptada muestra su estado real (En proceso, Finalizado, Corrección…), no siempre "en
 *   proceso".
 * - Aprobación (Parte 62): aceptarla no la cierra, solo la pasa al dictamen; por eso queda "Aceptada – en
 *   revisión" hasta que se aprueba o deniega.
 * - Confirmación: un solo paso; la decisión del Validador la responde (Confirmada / Rechazada).
 * El rechazo automático de la base ya trae "Rechazada automáticamente: …", así que no se le antepone
 * otro "Rechazada:" (6.4).
 */
export function textoRespuestaExcepcional(
  ticket: Pick<
    TicketEstadoReal,
    'excepcional_estado' | 'excepcional_motivo_rechazo' | 'estado_real' | 'estado_registrado' | 'flujo'
  >,
): string | null {
  switch (ticket.excepcional_estado) {
    case 'PENDIENTE':
      return 'Pendiente de aceptación'
    case 'ACEPTADA':
      if (ticket.flujo === 'APROBACION') {
        if (ticket.estado_registrado === 'Aprobado') return 'Aprobada'
        if (ticket.estado_registrado === 'Rechazado') return 'Denegada'
        return 'Aceptada – en revisión'
      }
      if (ticket.flujo === 'CONFIRMACION') return 'Confirmada'
      return ticket.estado_real ? `Aceptada – ${ticket.estado_real}` : 'Aceptada'
    case 'RECHAZADA':
      return textoRechazo(ticket.excepcional_motivo_rechazo)
    default:
      return null
  }
}
