import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { tomarTicket } from '../../data/tickets'
import { listarDisenadoresAsignables } from '../../data/usuarios'
import { mensajeError } from '../../lib/errors'
import { ESTADOS_FINALES_TICKET } from '../../lib/tableroDisenador'
import { useAuth } from '../../auth/useAuth'
import { TicketCard } from '../../components/TicketCard'
import { ExcepcionalPendienteCard } from '../../components/ExcepcionalPendienteCard'
import { ResponderExcepcionalModal } from '../../components/ResponderExcepcionalModal'
import { Button } from '../../components/ui/Button'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import type { TicketEstadoReal } from '../../types/domain'

interface Columna {
  titulo: string
  filtro: (t: TicketEstadoReal, miId: number) => boolean
}

const COLUMNAS: Columna[] = [
  { titulo: 'En proceso', filtro: (t, miId) => t.disenador_id === miId && t.estado_real === 'En proceso' },
  { titulo: 'Corrección', filtro: (t, miId) => t.disenador_id === miId && t.estado_real === 'Corrección' },
  { titulo: 'Retrasados', filtro: (t, miId) => t.disenador_id === miId && t.estado_real === 'Retrasado' },
  { titulo: 'Finalizados esperando dictamen', filtro: (t, miId) => t.disenador_id === miId && t.estado_real === 'Finalizado' },
]

export function DisenadorDashboard() {
  const { data: tickets = [], isLoading } = useTicketsEstadoReal()
  const { perfil, tieneRol } = useAuth()
  const esAsignador = tieneRol('Asignador') || tieneRol('Administrador')
  const queryClient = useQueryClient()
  const [tomando, setTomando] = useState<number | null>(null)
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [respuesta, setRespuesta] = useState<{ ticket: TicketEstadoReal; modo: 'aceptar' | 'rechazar' } | null>(null)

  const { data: disenadores = [] } = useQuery({
    queryKey: ['admin', 'disenadores-asignables'],
    queryFn: listarDisenadoresAsignables,
    enabled: esAsignador,
  })

  async function manejarTomar(ticket: TicketEstadoReal) {
    if (!perfil) return
    setTomando(ticket.ticket_id)
    try {
      await tomarTicket(ticket, perfil.id)
      toast.success(`Tomaste el ticket ${ticket.codigo}.`)
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo tomar el ticket.'))
    } finally {
      setTomando(null)
    }
  }

  if (isLoading || !perfil) return <SkeletonLista filas={5} />

  // FIFO: en cada columna va primero la solicitud más antigua (la consulta compartida las trae al revés).
  const ticketsFifo = [...tickets].sort(
    (a, b) =>
      new Date(a.fecha_registro ?? 0).getTime() - new Date(b.fecha_registro ?? 0).getTime() ||
      (a.ticket_id ?? 0) - (b.ticket_id ?? 0),
  )

  const excepcionalesPendientes = ticketsFifo.filter((t) => t.es_excepcional && t.excepcional_estado === 'PENDIENTE')
  const sinAsignar = ticketsFifo.filter((t) => !t.disenador_id && !t.es_excepcional && !ESTADOS_FINALES_TICKET.includes(t.estado_real ?? ''))
  const historial = ticketsFifo.filter(
    (t) => ESTADOS_FINALES_TICKET.includes(t.estado_real ?? '') && (t.disenador_id === perfil.id || (!t.disenador_id && t.es_excepcional)),
  )

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Mi tablero</h1>
        <p className="text-sm text-tinta-suave">Toma solicitudes y sube los entregables.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl bg-azul-niebla/40 p-3">
          <p className="mb-3 flex items-center justify-between text-sm font-semibold text-azul-noche">
            Sin asignar
            <span className="rounded-full bg-white px-2 py-0.5 text-xs">{excepcionalesPendientes.length + sinAsignar.length}</span>
          </p>
          <div className="space-y-2">
            {excepcionalesPendientes.map((ticket) => (
              <ExcepcionalPendienteCard
                key={ticket.ticket_id}
                ticket={ticket}
                puedeResponder={esAsignador}
                onAceptar={() => setRespuesta({ ticket, modo: 'aceptar' })}
                onRechazar={() => setRespuesta({ ticket, modo: 'rechazar' })}
              />
            ))}
            {sinAsignar.length === 0 && excepcionalesPendientes.length === 0 && (
              <p className="text-xs text-tinta-suave">Sin tickets.</p>
            )}
            {sinAsignar.map((ticket) => (
              <div key={ticket.ticket_id}>
                <TicketCard ticket={ticket} />
                <Button
                  variante="secundario"
                  className="mt-2 w-full"
                  cargando={tomando === ticket.ticket_id}
                  onClick={() => manejarTomar(ticket)}
                >
                  Tomar
                </Button>
              </div>
            ))}
          </div>
        </div>

        {COLUMNAS.map((columna) => {
          const ticketsColumna = ticketsFifo.filter((t) => columna.filtro(t, perfil.id))
          return (
            <div key={columna.titulo} className="rounded-xl bg-azul-niebla/40 p-3">
              <p className="mb-3 flex items-center justify-between text-sm font-semibold text-azul-noche">
                {columna.titulo}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs">{ticketsColumna.length}</span>
              </p>
              <div className="space-y-2">
                {ticketsColumna.length === 0 && <p className="text-xs text-tinta-suave">Sin tickets.</p>}
                {ticketsColumna.map((ticket) => (
                  <TicketCard key={ticket.ticket_id} ticket={ticket} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {tickets.length === 0 && (
        <EmptyState titulo="No hay tickets disponibles" descripcion="Cuando lleguen solicitudes aparecerán aquí." />
      )}

      <div>
        <button
          type="button"
          onClick={() => setHistorialAbierto((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-tinta-suave hover:text-tinta"
        >
          {historialAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Historial ({historial.length})
        </button>
        {historialAbierto && (
          <div className="mt-3 space-y-2">
            {historial.length === 0 ? (
              <p className="text-sm text-tinta-suave">Sin tickets en el historial.</p>
            ) : (
              historial.map((ticket) => <TicketCard key={ticket.ticket_id} ticket={ticket} />)
            )}
          </div>
        )}
      </div>

      <ResponderExcepcionalModal
        ticket={respuesta?.ticket ?? null}
        modo={respuesta?.modo ?? null}
        disenadores={disenadores}
        onCerrar={() => setRespuesta(null)}
        onRespondido={invalidar}
      />
    </div>
  )
}
