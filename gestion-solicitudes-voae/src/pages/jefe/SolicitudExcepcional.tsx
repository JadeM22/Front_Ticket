import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { AsistenteSolicitud } from '../../components/formularios/AsistenteSolicitud'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { useAuth } from '../../auth/useAuth'
import { formatFecha } from '../../lib/date'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { EstadoChip } from '../../components/EstadoChip'
import { textoRespuestaExcepcional } from '../../lib/excepcional'

export function SolicitudExcepcionalPage() {
  const { perfil } = useAuth()
  const { data: todos = [] } = useTicketsEstadoReal()
  // "Mis solicitudes excepcionales" = las que este jefe registró como excepcionales.
  const excepcionales = todos.filter((t) => t.usuario_registro === perfil?.id && t.es_excepcional)

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-ambar-bruma p-3 text-sm text-ambar">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-none" />
          <p>
            Úsala solo para urgencias. Puedes enviarla cualquier día y a cualquier hora, con al menos 2 días
            hábiles de anticipación al evento. Alguien del equipo la acepta o la rechaza; si nadie la atiende
            antes del evento, se rechaza automáticamente.
          </p>
        </div>
      </div>

      <AsistenteSolicitud excepcional />

      <div className="mx-auto max-w-2xl">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-suave">
          Mis solicitudes excepcionales
        </h2>
        {excepcionales.length === 0 ? (
          <EmptyState titulo="Todavía no has enviado solicitudes excepcionales" />
        ) : (
          <div className="space-y-2">
            {excepcionales.map((ticket) => (
              <Card key={ticket.ticket_id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link
                    to={`/tickets/${ticket.ticket_id}`}
                    className="whitespace-nowrap font-mono text-sm font-semibold text-azul-institucional hover:underline"
                  >
                    {ticket.codigo}
                  </Link>
                  <p className="text-sm text-tinta">{ticket.tipo_solicitud}</p>
                  <p className="text-xs text-tinta-suave">Evento: {formatFecha(ticket.fecha_evento)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <EstadoChip estado={ticket.estado_real ?? ''} />
                  <p className="text-xs text-tinta-suave">
                    {textoRespuestaExcepcional(ticket)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
