import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState } from 'react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { tomarTicket } from '../../data/tickets'
import { mensajeError } from '../../lib/errors'
import { formatFecha } from '../../lib/date'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/ui/Button'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import type { TicketEstadoReal } from '../../types/domain'

interface Columna {
  titulo: string
  filtro: (t: TicketEstadoReal) => boolean
}

const COLUMNAS: Columna[] = [
  { titulo: 'Sin asignar', filtro: (t) => !t.disenador_id },
  { titulo: 'En proceso', filtro: (t) => Boolean(t.disenador_id) && t.estado_real === 'En proceso' },
  { titulo: 'Corrección', filtro: (t) => t.estado_real === 'Corrección' },
  { titulo: 'Retrasados', filtro: (t) => t.estado_real === 'Retrasado' },
  { titulo: 'Finalizados esperando dictamen', filtro: (t) => t.estado_real === 'Finalizado' },
]

export function DisenadorDashboard() {
  const { data: tickets = [], isLoading } = useTicketsEstadoReal()
  const { perfil } = useAuth()
  const queryClient = useQueryClient()
  const [tomando, setTomando] = useState<number | null>(null)

  async function manejarTomar(ticket: TicketEstadoReal) {
    if (!perfil) return
    setTomando(ticket.ticket_id)
    try {
      await tomarTicket(ticket, perfil.id)
      toast.success(`Tomaste el ticket #${ticket.ticket_id}.`)
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo tomar el ticket.'))
    } finally {
      setTomando(null)
    }
  }

  if (isLoading) return <SkeletonLista filas={5} />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Tablero de diseño</h1>
        <p className="text-sm text-tinta-suave">Toma solicitudes y sube los entregables.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {COLUMNAS.map((columna) => {
          const ticketsColumna = tickets.filter(columna.filtro)
          return (
            <div key={columna.titulo} className="rounded-xl bg-azul-niebla/40 p-3">
              <p className="mb-3 flex items-center justify-between text-sm font-semibold text-azul-noche">
                {columna.titulo}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs">{ticketsColumna.length}</span>
              </p>
              <div className="space-y-2">
                {ticketsColumna.length === 0 && <p className="text-xs text-tinta-suave">Sin tickets.</p>}
                {ticketsColumna.map((ticket) => (
                  <div key={ticket.ticket_id} className="rounded-lg bg-white p-3 shadow-sm">
                    <Link to={`/tickets/${ticket.ticket_id}`} className="block">
                      <p className="font-mono text-xs text-tinta-suave">#{String(ticket.ticket_id).padStart(4, '0')}</p>
                      <p className="text-sm font-semibold text-tinta">{ticket.tipo_solicitud}</p>
                      <p className="text-xs text-tinta-suave">{ticket.solicitante}</p>
                      <p className="text-xs text-tinta-suave">Límite: {formatFecha(ticket.fecha_limite)}</p>
                    </Link>
                    {!ticket.disenador_id && (
                      <Button
                        variante="secundario"
                        className="mt-2 w-full"
                        cargando={tomando === ticket.ticket_id}
                        onClick={() => manejarTomar(ticket)}
                      >
                        Tomar ticket
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {tickets.length === 0 && (
        <EmptyState titulo="No hay tickets disponibles" descripcion="Cuando lleguen solicitudes aparecerán aquí." />
      )}
    </div>
  )
}
