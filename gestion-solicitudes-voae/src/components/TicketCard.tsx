import { Link } from 'react-router-dom'
import { EstadoChip } from './EstadoChip'
import { formatFecha } from '../lib/date'
import type { TicketEstadoReal } from '../types/domain'

export function TicketCard({ ticket }: { ticket: TicketEstadoReal }) {
  return (
    <Link
      to={`/tickets/${ticket.ticket_id}`}
      className="flex overflow-hidden rounded-xl bg-white shadow-sm transition-shadow duration-150 hover:shadow-md"
    >
      <div className="relative flex w-16 flex-none flex-col items-center justify-center border-r-2 border-dashed border-azul-niebla bg-azul-noche py-4">
        <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-fondo" />
        <span
          className="font-mono text-xs font-semibold tracking-wide text-menta"
          style={{ writingMode: 'vertical-rl' }}
        >
          #{String(ticket.ticket_id).padStart(4, '0')}
        </span>
        <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-fondo" />
      </div>

      <div className="flex-1 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-semibold text-azul-noche">{ticket.tipo_solicitud}</p>
          <EstadoChip estado={ticket.estado_real ?? ''} />
        </div>
        <p className="text-sm text-tinta-suave">
          {ticket.solicitante} · {ticket.area}
        </p>
        <p className="mt-2 text-xs text-tinta-suave">
          Fecha límite: <span className="font-mono">{formatFecha(ticket.fecha_limite)}</span>
          {ticket.disenador && <> · Diseñador: {ticket.disenador}</>}
        </p>
      </div>
    </Link>
  )
}
