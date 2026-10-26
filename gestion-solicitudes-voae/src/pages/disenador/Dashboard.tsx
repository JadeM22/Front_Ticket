import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Hand } from 'lucide-react'
import { useTicketsDiseno, useConteoSinAsignar } from '../../hooks/useTickets'
import { tomarTicket } from '../../data/tickets'
import { mensajeError } from '../../lib/errors'
import { ESTADOS_FINALES_TICKET } from '../../lib/tableroDisenador'
import { useAuth } from '../../auth/useAuth'
import { TicketCard } from '../../components/TicketCard'
import { ExcepcionalPendienteCard } from '../../components/ExcepcionalPendienteCard'
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

type Vista = 'sin-asignar' | 'mis-tickets'

/**
 * Las excepcionales pendientes que aparecen aquí nunca llevan botones: solo el Asignador las
 * acepta o rechaza, y eso vive por completo en `/asignador` (v5 separa esa gestión del tablero
 * del diseñador, aunque el usuario también tenga el rol Asignador).
 */
export function DisenadorDashboard() {
  const { data: tickets = [], isLoading } = useTicketsDiseno()
  const { data: conteoSinAsignar } = useConteoSinAsignar()
  const { perfil } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const vista = ((params.get('vista') as Vista | null) ?? 'sin-asignar') as Vista
  const [tomando, setTomando] = useState<number | null>(null)
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [excepcionalesAbierto, setExcepcionalesAbierto] = useState(false)

  function cambiarVista(siguiente: Vista) {
    const nuevosParams = new URLSearchParams(params)
    nuevosParams.set('vista', siguiente)
    setParams(nuevosParams, { replace: true })
  }

  async function manejarTomar(ticket: TicketEstadoReal) {
    if (!perfil) return
    setTomando(ticket.ticket_id)
    try {
      const resultado = await tomarTicket(ticket, perfil.id)
      if (resultado === 'tomado') {
        toast.success(`Tomaste ${ticket.codigo}.`)
      } else if (resultado === 'ocupado') {
        toast.error(`Otro diseñador ya tomó ${ticket.codigo}.`)
      } else {
        toast.error('No se pudo tomar el ticket.')
      }
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'sin-asignar-count'] })
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo tomar el ticket.'))
    } finally {
      setTomando(null)
    }
  }

  if (isLoading || !perfil) return <SkeletonLista filas={5} />

  // FIFO: el más antiguo primero (la consulta compartida las trae al revés).
  const ticketsFifo = [...tickets].sort(
    (a, b) =>
      new Date(a.fecha_registro ?? 0).getTime() - new Date(b.fecha_registro ?? 0).getTime() ||
      (a.ticket_id ?? 0) - (b.ticket_id ?? 0),
  )

  const excepcionalesPendientes = ticketsFifo.filter((t) => t.es_excepcional && t.excepcional_estado === 'PENDIENTE')
  // Las excepcionales PENDIENTE las decide el Asignador; una ya ACEPTADA sin diseñador (p. ej. liberada) se
  // toma como cualquier otra (Parte 46).
  const sinAsignar = ticketsFifo.filter(
    (t) =>
      !t.disenador_id &&
      (!t.es_excepcional || t.excepcional_estado === 'ACEPTADA') &&
      !ESTADOS_FINALES_TICKET.includes(t.estado_real ?? ''),
  )
  const misTickets = ticketsFifo.filter((t) => t.disenador_id === perfil.id && !ESTADOS_FINALES_TICKET.includes(t.estado_real ?? ''))
  const historial = ticketsFifo.filter(
    (t) => ESTADOS_FINALES_TICKET.includes(t.estado_real ?? '') && (t.disenador_id === perfil.id || (!t.disenador_id && t.es_excepcional)),
  )

  // Mismo número que el badge del sidebar: la consulta liviana compartida, no el tamaño de la lista local.
  const conteoSinAsignarTexto = conteoSinAsignar ?? sinAsignar.length

  const PESTANAS: { clave: Vista; etiqueta: string }[] = [
    { clave: 'sin-asignar', etiqueta: `Tickets sin asignación (${conteoSinAsignarTexto})` },
    { clave: 'mis-tickets', etiqueta: `Mis tickets (${misTickets.length})` },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Mi tablero</h1>
        <p className="text-sm text-tinta-suave">Toma solicitudes y sube los entregables.</p>
      </div>

      <div role="tablist" aria-label="Mi tablero" className="flex gap-1 border-b border-azul-niebla">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={vista === p.clave}
            onClick={() => cambiarVista(p.clave)}
            className={`px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
              vista === p.clave
                ? 'border-b-2 border-azul-institucional text-azul-institucional'
                : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {vista === 'sin-asignar' && (
        <div className="space-y-4">
          {sinAsignar.length === 0 ? (
            <EmptyState titulo="No hay tickets sin asignar" descripcion="Cuando lleguen solicitudes aparecerán aquí." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sinAsignar.map((ticket) => (
                <TicketCard
                  key={ticket.ticket_id}
                  ticket={ticket}
                  onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                  accion={
                    <button
                      type="button"
                      onClick={() => manejarTomar(ticket)}
                      disabled={tomando === ticket.ticket_id}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-menta px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-menta-profundo disabled:opacity-60"
                    >
                      <Hand size={16} /> {tomando === ticket.ticket_id ? 'Tomando…' : 'Tomar'}
                    </button>
                  }
                />
              ))}
            </div>
          )}

          {excepcionalesPendientes.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setExcepcionalesAbierto((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-ambar hover:text-ambar/80"
              >
                {excepcionalesAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Excepcionales pendientes de aceptación ({excepcionalesPendientes.length})
              </button>
              {excepcionalesAbierto && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {excepcionalesPendientes.map((ticket) => (
                    <ExcepcionalPendienteCard key={ticket.ticket_id} ticket={ticket} puedeResponder={false} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {vista === 'mis-tickets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
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
                      <TicketCard key={ticket.ticket_id} ticket={ticket} onClick={() => navigate(`/tickets/${ticket.ticket_id}`)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {misTickets.length === 0 && (
            <EmptyState titulo="No tienes tickets activos" descripcion="Toma uno desde 'Tickets sin asignación'." />
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
                  historial.map((ticket) => (
                    <TicketCard key={ticket.ticket_id} ticket={ticket} onClick={() => navigate(`/tickets/${ticket.ticket_id}`)} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
