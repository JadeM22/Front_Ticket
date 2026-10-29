import { Link } from 'react-router-dom'
import { Button } from './ui/Button'
import { useCambiosUrgentes } from '../hooks/useCambiosUrgentes'
import { BadgeExcepcional } from './BadgeExcepcional'
import { CLASE_CARD_ENLACE, useCardEnlace } from '../hooks/useCardEnlace'
import { formatFecha } from '../lib/date'
import type { TicketEstadoReal } from '../types/domain'

interface ExcepcionalPendienteCardProps {
  ticket: TicketEstadoReal
  /** Solo el Asignador (y el Administrador) ve el botón; en cualquier otro tablero solo se ve la tarjeta. */
  puedeResponder: boolean
  onDictaminar?: () => void
}

/** Un día después de la fecha del evento, la base rechaza sola la solicitud si nadie respondió. */
function fechaRechazoAutomatico(fechaEvento: string | null): string {
  if (!fechaEvento) return '—'
  const fecha = new Date(`${fechaEvento}T12:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() + 1)
  return formatFecha(fecha.toISOString())
}

/** Toda la tarjeta abre el detalle; "Dictaminar" no. */
export function ExcepcionalPendienteCard({ ticket, puedeResponder, onDictaminar }: ExcepcionalPendienteCardProps) {
  const enlace = useCardEnlace(`/tickets/${ticket.ticket_id}`)
  // Un cambio urgente muestra su motivo y el ticket original, para decidir a quién asignarlo.
  const cambio = useCambiosUrgentes().cambioDe(ticket.ticket_id)
  return (
    <div
      {...enlace}
      aria-label={`Ticket ${ticket.codigo}`}
      className={`rounded-lg border-2 border-ambar bg-ambar-bruma/40 p-3 ${CLASE_CARD_ENLACE}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="whitespace-nowrap font-mono text-xs font-semibold text-ambar">{ticket.codigo}</span>
        <BadgeExcepcional ticketId={ticket.ticket_id} />
      </div>
      {cambio && (
        <div className="mt-1 rounded-md bg-white/70 p-2 text-xs text-tinta">
          <p>
            Cambio urgente de{' '}
            {cambio.codigoOrigen ? (
              <Link
                to={`/tickets/${cambio.ticketOrigenId}`}
                onClick={(e) => e.stopPropagation()}
                className="font-mono font-semibold text-azul-institucional hover:underline"
              >
                {cambio.codigoOrigen}
              </Link>
            ) : (
              'otro ticket'
            )}
          </p>
          {cambio.motivo && <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-tinta-suave">{cambio.motivo}</p>}
        </div>
      )}
      <p className="text-sm font-semibold text-tinta">{ticket.tipo_solicitud}</p>
      <p className="text-xs text-tinta-suave">{ticket.area}</p>
      <p className="text-xs text-tinta-suave">{ticket.solicitante}</p>
      <p className="text-xs text-tinta-suave">Evento: {formatFecha(ticket.fecha_evento)}</p>
      <p className="mt-1 text-xs font-medium text-ambar">
        {puedeResponder
          ? `Se rechaza automáticamente el ${fechaRechazoAutomatico(ticket.fecha_evento)} si no respondes`
          : `Pendiente de aceptación; se rechaza automáticamente si no se acepta antes del ${fechaRechazoAutomatico(ticket.fecha_evento)}`}
      </p>
      {puedeResponder && (
        <Button
          className="mt-2 w-full"
          onClick={(e) => {
            e.stopPropagation()
            onDictaminar?.()
          }}
        >
          Dictaminar
        </Button>
      )}
    </div>
  )
}
