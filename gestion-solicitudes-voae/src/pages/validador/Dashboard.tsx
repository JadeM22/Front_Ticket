import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Building2, User } from 'lucide-react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { INTENTOS_MAXIMOS_IA, listarUltimosEnviosIA } from '../../data/afichesIA'
import { formatFecha, formatFechaHora } from '../../lib/date'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { EstadoChip } from '../../components/EstadoChip'
import { BadgeExcepcional } from '../../components/BadgeExcepcional'
import { MiniaturaAfiche } from '../../components/afichesIA/HistorialEnviosIA'
import { afichesPorRevisar, validacionesPendientes } from '../../lib/bandejaValidador'
import type { TicketEstadoReal } from '../../types/domain'

/** El más urgente primero; los que no tienen fecha límite al final. */
function porFechaLimite(a: TicketEstadoReal, b: TicketEstadoReal): number {
  return (a.fecha_limite ?? '9999').localeCompare(b.fecha_limite ?? '9999')
}

/**
 * Bandeja del Validador, en dos páginas con su propio ítem de menú (E-09): `afiches` (con IA, esperando
 * revisión) y `solicitudes` (validación, p. ej. Cobertura de evento, esperando su decisión). RLS ya
 * limita qué tickets recibe; aquí solo se filtra por flujo y estado. La decisión se toma desde el detalle.
 */
export function ValidadorDashboard({ vista }: { vista: 'afiches' | 'solicitudes' }) {
  const { data: tickets = [], isLoading } = useTicketsEstadoReal()
  const afiches = afichesPorRevisar(tickets).sort(porFechaLimite)
  const idsAfiches = afiches.map((t) => t.ticket_id!)

  // Miniaturas: el último envío de cada afiche, en una sola consulta (E-08).
  const { data: ultimosEnvios } = useQuery({
    queryKey: ['afiches-ia', 'ultimos-envios', idsAfiches],
    queryFn: () => listarUltimosEnviosIA(idsAfiches),
    enabled: vista === 'afiches' && idsAfiches.length > 0,
  })

  if (isLoading) return <SkeletonLista filas={4} />

  if (vista === 'solicitudes') {
    return (
      <Seccion
        titulo="Solicitudes pendientes"
        tickets={validacionesPendientes(tickets).sort(porFechaLimite)}
        vacio="No hay solicitudes pendientes"
        detalle={() => null}
      />
    )
  }

  const enCorreccion = tickets.filter((t) => t.flujo === 'APROBACION_IA' && t.estado_registrado === 'Corrección').length

  return (
    <Seccion
      titulo="Afiches pendientes"
      tickets={afiches}
      vacio="No hay afiches pendientes"
      extra={enCorreccion > 0 ? <> · {enCorreccion} esperando que el solicitante reenvíe</> : null}
      miniatura={(ticket) => {
        const envio = ultimosEnvios?.get(ticket.ticket_id!)
        return envio ? <MiniaturaAfiche envio={envio} /> : null
      }}
      detalle={(ticket) => (
        <p>
          Intento {ticket.intentos_usados ?? 0} de {INTENTOS_MAXIMOS_IA}
        </p>
      )}
    />
  )
}

function Seccion({
  titulo,
  tickets,
  vacio,
  extra = null,
  miniatura,
  detalle,
}: {
  titulo: string
  tickets: TicketEstadoReal[]
  vacio: string
  extra?: ReactNode
  miniatura?: (ticket: TicketEstadoReal) => ReactNode
  detalle: (ticket: TicketEstadoReal) => ReactNode
}) {
  const navigate = useNavigate()
  const vencidos = tickets.filter((t) => t.fuera_de_plazo).length

  function abrirDetalle(ticketId: number) {
    navigate(`/tickets/${ticketId}`)
  }

  function abrirDictamen(ticketId: number) {
    navigate(`/tickets/${ticketId}`, { state: { abrirDictamen: true } })
  }

  return (
    <section className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">{titulo}</h1>
        <p className="text-sm text-tinta-suave">
          {tickets.length} pendiente(s)
          {vencidos > 0 && <span className="font-semibold text-coral"> · {vencidos} fuera de plazo</span>}
          {extra}
        </p>
      </div>

      {tickets.length === 0 ? (
        <EmptyState titulo={vacio} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <article
              key={ticket.ticket_id}
              onClick={() => abrirDetalle(ticket.ticket_id!)}
              onKeyDown={(e) => e.key === 'Enter' && abrirDetalle(ticket.ticket_id!)}
              role="button"
              tabIndex={0}
              aria-label={`Ticket ${ticket.codigo}`}
              className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-institucional"
            >
              <Card
                className={`flex h-full flex-col space-y-2 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                  ticket.fuera_de_plazo ? 'border-2 border-coral!' : ''
                }`}
              >
                {miniatura?.(ticket)}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-mono text-sm text-tinta-suave">{ticket.codigo}</p>
                    {ticket.es_excepcional && <BadgeExcepcional />}
                  </div>
                  <EstadoChip estado={ticket.estado_real ?? ''} perspectiva="admin" />
                </div>
                <p className="truncate font-semibold text-tinta" title={ticket.titulo ?? undefined}>
                  {ticket.titulo || ticket.tipo_solicitud}
                </p>
                <div className="space-y-0.5">
                  <p
                    className="flex items-start gap-1.5 truncate text-sm font-medium text-tinta"
                    title={ticket.solicitante ?? undefined}
                  >
                    <User size={14} className="mt-0.5 flex-none text-tinta-suave" />
                    {ticket.solicitante}
                  </p>
                  <p className="flex items-start gap-1.5 text-xs text-tinta-suave" title={ticket.area ?? undefined}>
                    <Building2 size={13} className="mt-0.5 flex-none" />
                    <span className="line-clamp-2">{ticket.area}</span>
                  </p>
                </div>
                <div className="space-y-0.5 border-t border-azul-niebla/60 pt-2 text-xs text-tinta-suave">
                  {detalle(ticket)}
                  <p className={ticket.fuera_de_plazo ? 'flex items-center gap-1 font-semibold text-coral' : undefined}>
                    {ticket.fuera_de_plazo && <AlertTriangle size={12} />}
                    Responder antes del {formatFecha(ticket.fecha_limite)}
                  </p>
                  <p>Evento: {formatFecha(ticket.fecha_evento)}</p>
                  <p>Solicitada: {formatFechaHora(ticket.fecha_registro)}</p>
                </div>
                <Button
                  className="mt-auto w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    abrirDictamen(ticket.ticket_id!)
                  }}
                >
                  Dictaminar
                </Button>
              </Card>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
