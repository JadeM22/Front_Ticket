import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { useAuth } from '../../auth/useAuth'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { TicketBoleto } from '../../components/tickets/TicketBoleto'
import { EstadoChip } from '../../components/EstadoChip'
import { etiquetaEstado } from '../../lib/estados'

export function EmpleadoDashboard() {
  const { data: todos = [], isLoading } = useTicketsEstadoReal()
  const { perfil } = useAuth()
  // "Mis solicitudes" = las que registró este usuario. RLS deja ver más tickets a quien además es
  // Analista, Diseñador, Jefe o Administrador, así que aquí sí se filtra por autor.
  const tickets = todos.filter((t) => t.usuario_registro === perfil?.id)

  // Se agrupa por lo que ve el solicitante: "En proceso" junta En proceso y Corrección.
  const conteos = tickets.reduce<Record<string, { estado: string; total: number }>>((acumulado, ticket) => {
    const estado = ticket.estado_real ?? 'Sin estado'
    const etiqueta = etiquetaEstado(estado, 'solicitante')
    acumulado[etiqueta] ??= { estado, total: 0 }
    acumulado[etiqueta].total++
    return acumulado
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-azul-noche">Mis solicitudes</h1>
          <p className="text-sm text-tinta-suave">Resumen de tus tickets por estado.</p>
        </div>
        <Link to="/empleado/nueva">
          <Button>
            <Plus size={16} /> Nueva solicitud
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <SkeletonLista filas={2} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(conteos).map(([etiqueta, { estado, total }]) => (
            <Card key={etiqueta} className="flex flex-col gap-2">
              <EstadoChip estado={estado} perspectiva="solicitante" />
              <p className="font-mono text-2xl font-bold text-azul-noche">{total}</p>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-suave">Últimos tickets</h2>
        {isLoading ? (
          <SkeletonLista />
        ) : tickets.length === 0 ? (
          <EmptyState
            titulo="Aún no has creado solicitudes"
            descripcion="Crea tu primera solicitud para que el equipo de diseño la atienda."
            accion={
              <Link to="/empleado/nueva">
                <Button variante="secundario">Nueva solicitud</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {tickets.slice(0, 6).map((ticket) => (
              <TicketBoleto key={ticket.ticket_id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
