import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Filter } from 'lucide-react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { useAuth } from '../../auth/useAuth'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { TicketBoleto } from '../../components/tickets/TicketBoleto'
import { CLASE_INPUT } from '../../components/ui/Campo'

const CLASE_SELECT_FILTRO = `${CLASE_INPUT} w-auto appearance-none pl-9 pr-8 shadow-sm transition-shadow duration-150 hover:shadow-md`

export function EmpleadoSolicitudesPage() {
  const { data: todos, isLoading } = useTicketsEstadoReal()
  const { perfil } = useAuth()
  const navigate = useNavigate()
  // "Mis solicitudes" = las que registró este usuario. RLS deja ver más tickets a quien además es
  // Analista, Diseñador, Jefe o Administrador, así que aquí sí se filtra por autor.
  const tickets = useMemo(() => (todos ?? []).filter((t) => t.usuario_registro === perfil?.id), [todos, perfil?.id])
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
        <div className="relative">
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
          <select className={CLASE_SELECT_FILTRO} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {estados.map((e) => (
              <option key={e} value={e!}>
                {e}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
        </div>
        <div className="relative">
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
          <select className={CLASE_SELECT_FILTRO} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t!}>
                {t}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
        </div>
      </div>

      {isLoading ? (
        <SkeletonLista filas={4} />
      ) : filtrados.length === 0 ? (
        <EmptyState titulo="No hay solicitudes con esos filtros" />
      ) : (
        <div className="space-y-3">
          {filtrados.map((ticket) => (
            <TicketBoleto key={ticket.ticket_id} ticket={ticket} onClick={() => navigate(`/tickets/${ticket.ticket_id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
