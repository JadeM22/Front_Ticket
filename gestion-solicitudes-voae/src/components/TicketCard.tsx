import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { EstadoChip } from './EstadoChip'
import { formatFecha, formatFechaHora, formatoHorasHabiles } from '../lib/date'
import { useAuth } from '../auth/useAuth'
import type { TicketEstadoReal } from '../types/domain'

const CORRECCIONES_MAXIMAS = 5

export function TicketCard({ ticket }: { ticket: TicketEstadoReal }) {
  const { tieneRol } = useAuth()
  const correccionesUsadas = ticket.correcciones_usadas ?? 0
  const muestraCronometro =
    (tieneRol('Jefe de Área') || tieneRol('Diseñador')) && ticket.minutos_habiles_restantes_dictamen != null

  return (
    <Link
      to={`/tickets/${ticket.ticket_id}`}
      className="flex overflow-hidden rounded-xl bg-white shadow-sm transition-shadow duration-150 hover:shadow-md"
    >
      <div className="relative flex w-16 flex-none flex-col items-center justify-center border-r-2 border-dashed border-azul-niebla bg-azul-noche py-4">
        <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-fondo" />
        <span className="font-mono text-xs font-semibold tracking-wide text-menta" style={{ writingMode: 'vertical-rl' }}>
          {ticket.codigo}
        </span>
        <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-fondo" />
      </div>

      <div className="flex-1 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-azul-noche">{ticket.tipo_solicitud}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {ticket.es_excepcional && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ambar-bruma px-2 py-0.5 text-xs font-semibold text-ambar">
                <Zap size={12} /> Excepcional
              </span>
            )}
            {correccionesUsadas > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  correccionesUsadas >= CORRECCIONES_MAXIMAS ? 'bg-coral-bruma text-coral' : 'bg-ambar-bruma text-ambar'
                }`}
              >
                Correcciones {correccionesUsadas}/{CORRECCIONES_MAXIMAS}
              </span>
            )}
            <EstadoChip estado={ticket.estado_real ?? ''} />
          </div>
        </div>

        {ticket.es_excepcional && ticket.excepcional_estado === 'PENDIENTE' && (
          <p className="mb-1 text-xs font-medium text-ambar">Pendiente de aceptación</p>
        )}

        {/* Una sola columna siempre: este componente también vive en columnas angostas de tablero,
            donde un grid de varias columnas atado al ancho del viewport (no del contenedor) se encima. */}
        <div className="space-y-0.5 text-xs text-tinta-suave">
          <p>Creada: {formatFechaHora(ticket.fecha_registro)}</p>
          <p>Evento: {formatFecha(ticket.fecha_evento)}</p>
          <p>Vence: {formatFecha(ticket.fecha_limite)}</p>
          <p>Diseñador: {ticket.disenador ?? 'Sin asignar'}</p>
        </div>

        {muestraCronometro && (
          <p className="mt-1 text-xs font-medium text-ambar">
            Dictamen: quedan {formatoHorasHabiles(ticket.minutos_habiles_restantes_dictamen ?? 0)} hábiles
          </p>
        )}
      </div>
    </Link>
  )
}
