import { useMemo, useState } from 'react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { TicketCard } from '../../components/TicketCard'
import { CLASE_INPUT } from '../../components/ui/Campo'

export function EmpleadoSolicitudesPage() {
  const { data: tickets = [], isLoading } = useTicketsEstadoReal()
  const [estado, setEstado] = useState('')
  const [tipo, setTipo] = useState('')

  const estados = useMemo(() => Array.from(new Set(tickets.map((t) => t.estado_real).filter(Boolean))), [tickets])
  const tipos = useMemo(() => Array.from(new Set(tickets.map((t) => t.tipo_solicitud).filter(Boolean))), [tickets])

  const filtrados = tickets.filter(
    (t) => (!estado || t.estado_real === estado) && (!tipo || t.tipo_solicitud === tipo),
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Mis solicitudes</h1>
        <p className="text-sm text-tinta-suave">Filtra por estado o tipo de solicitud.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className={`${CLASE_INPUT} w-auto`} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {estados.map((e) => (
            <option key={e} value={e!}>
              {e}
            </option>
          ))}
        </select>
        <select className={`${CLASE_INPUT} w-auto`} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t!}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <SkeletonLista filas={4} />
      ) : filtrados.length === 0 ? (
        <EmptyState titulo="No hay solicitudes con esos filtros" />
      ) : (
        <div className="space-y-3">
          {filtrados.map((ticket) => (
            <TicketCard key={ticket.ticket_id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  )
}
