import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { Button } from './ui/Button'
import { formatFecha } from '../lib/date'
import type { TicketEstadoReal } from '../types/domain'

interface ExcepcionalPendienteCardProps {
  ticket: TicketEstadoReal
  /** Solo el Asignador (y el Administrador) ve los botones; en cualquier otro tablero solo se ve la tarjeta. */
  puedeResponder: boolean
  onAceptar?: () => void
  onRechazar?: () => void
}

/** Un día después de la fecha del evento, la base rechaza sola la solicitud si nadie respondió. */
function fechaRechazoAutomatico(fechaEvento: string | null): string {
  if (!fechaEvento) return '—'
  const fecha = new Date(`${fechaEvento}T12:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() + 1)
  return formatFecha(fecha.toISOString())
}

export function ExcepcionalPendienteCard({ ticket, puedeResponder, onAceptar, onRechazar }: ExcepcionalPendienteCardProps) {
  return (
    <div className="rounded-lg border-2 border-ambar bg-ambar-bruma/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <Link to={`/tickets/${ticket.ticket_id}`} className="flex items-center gap-1.5 font-mono text-xs font-semibold text-ambar">
          <Zap size={12} /> {ticket.codigo}
        </Link>
      </div>
      <p className="text-sm font-semibold text-tinta">{ticket.tipo_solicitud}</p>
      <p className="text-xs text-tinta-suave">{ticket.area}</p>
      <p className="text-xs text-tinta-suave">{ticket.solicitante}</p>
      <p className="text-xs text-tinta-suave">Evento: {formatFecha(ticket.fecha_evento)}</p>
      <p className="mt-1 text-xs font-medium text-ambar">
        Se rechaza automáticamente el {fechaRechazoAutomatico(ticket.fecha_evento)} si no respondes
      </p>
      {puedeResponder ? (
        <div className="mt-2 flex gap-2">
          <Button variante="secundario" className="flex-1" onClick={onAceptar}>
            Aceptar
          </Button>
          <Button variante="peligro" className="flex-1" onClick={onRechazar}>
            Rechazar
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-ambar">Excepcional · esperando al Asignador</p>
      )}
    </div>
  )
}
