import type { PasoStepper } from '../components/ui/Stepper'
import type { TicketEstadoReal } from '../types/domain'
import { formatFechaHora } from './date'

/**
 * Traduce el estado del ticket a las etapas que ve el solicitante. No todas las solicitudes pasan
 * por las mismas: "En revisión" y la ronda de corrección solo aparecen si el ticket las usa, y la
 * aprobación puede darse sola a las 24 h de la entrega sin dictamen del jefe.
 */
export function pasosProgresoTicket(ticket: TicketEstadoReal): PasoStepper[] {
  const registrado = ticket.estado_registrado

  // Las solicitudes excepcionales rechazadas (por el Asignador o automáticamente) no siguen el flujo normal.
  if (registrado === 'Rechazado') {
    return [
      { etiqueta: 'Enviada', estado: 'completado' },
      {
        etiqueta: 'Rechazada',
        estado: 'actual',
        alerta: true,
        descripcion: ticket.excepcional_motivo_rechazo ?? undefined,
      },
    ]
  }

  const aprobado = registrado === 'Aprobado' || (ticket.estado_real ?? '').startsWith('Aprobado')
  const huboCorreccion = (ticket.correcciones_usadas ?? 0) > 0 || registrado === 'Corrección'
  const retrasado = ticket.estado_real === 'Retrasado'

  const etapas: { clave: string; etiqueta: string; descripcion?: string }[] = [
    { clave: 'enviada', etiqueta: 'Enviada', descripcion: 'Esperando que un diseñador la tome' },
  ]
  if (registrado === 'En revisión') {
    etapas.push({ clave: 'revision', etiqueta: 'En revisión', descripcion: 'El equipo está revisando la solicitud' })
  }
  etapas.push(
    {
      clave: 'diseno',
      etiqueta: 'En diseño',
      descripcion: ticket.disenador ? `A cargo de ${ticket.disenador}` : undefined,
    },
    {
      clave: 'dictamen',
      etiqueta: 'Dictamen del jefe',
      descripcion: 'Si no hay dictamen en 24 horas hábiles se aprueba sola',
    },
  )
  if (huboCorreccion) {
    etapas.push(
      { clave: 'correccion', etiqueta: 'Corrección', descripcion: 'El diseñador aplica los cambios pedidos' },
      { clave: 'dictamen-final', etiqueta: 'Dictamen final', descripcion: 'Si no hay dictamen en 24 horas hábiles se aprueba sola' },
    )
  }
  etapas.push({
    clave: 'aprobada',
    etiqueta: 'Aprobada',
    descripcion: aprobado && ticket.aprobado_automatico ? 'Aprobación automática' : undefined,
  })

  let claveActual: string
  if (aprobado) claveActual = 'aprobada'
  else if (registrado === 'Enviado') claveActual = 'enviada'
  else if (registrado === 'En revisión') claveActual = 'revision'
  else if (registrado === 'Corrección') claveActual = 'correccion'
  else if (registrado === 'Finalizado') claveActual = huboCorreccion ? 'dictamen-final' : 'dictamen'
  else claveActual = 'diseno'

  const indiceActual = etapas.findIndex((etapa) => etapa.clave === claveActual)

  return etapas.map((etapa, indice): PasoStepper => {
    if (aprobado || indice < indiceActual) {
      return {
        etiqueta: etapa.etiqueta,
        estado: 'completado',
        descripcion: etapa.clave === 'aprobada' ? etapa.descripcion : undefined,
      }
    }
    if (indice > indiceActual) return { etiqueta: etapa.etiqueta, estado: 'pendiente' }

    let descripcion = etapa.descripcion
    if (retrasado) descripcion = 'Fuera de plazo'
    else if (registrado === 'Finalizado' && ticket.fecha_aprobacion_automatica) {
      descripcion = `Se aprueba sola el ${formatFechaHora(ticket.fecha_aprobacion_automatica)}`
    }
    return { etiqueta: etapa.etiqueta, estado: 'actual', descripcion, alerta: retrasado }
  })
}
