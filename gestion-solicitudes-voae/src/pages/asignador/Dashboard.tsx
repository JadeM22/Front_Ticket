import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Hand } from 'lucide-react'
import { useTicketsDiseno } from '../../hooks/useTickets'
import { tomarTicket, reasignarTicket } from '../../data/tickets'
import { listarDisenadoresAsignables, type DisenadorAsignable } from '../../data/usuarios'
import { mensajeError } from '../../lib/errors'
import { formatRelativo, hoyTegucigalpaISO } from '../../lib/date'
import { ESTADOS_FINALES_TICKET } from '../../lib/tableroDisenador'
import { useAuth } from '../../auth/useAuth'
import { TicketCard } from '../../components/TicketCard'
import { ExcepcionalPendienteCard } from '../../components/ExcepcionalPendienteCard'
import { ResponderExcepcionalModal } from '../../components/ResponderExcepcionalModal'
import { Button } from '../../components/ui/Button'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import type { TicketEstadoReal } from '../../types/domain'

const ESTADOS_ACTIVOS = ['Enviado', 'En revisión', 'En proceso', 'Corrección', 'Retrasado', 'Finalizado']
const DIAS_HISTORIAL = 30

const COLUMNAS_DISENADOR = [
  { titulo: 'En proceso', estado: 'En proceso' },
  { titulo: 'Corrección', estado: 'Corrección' },
  { titulo: 'Retrasados', estado: 'Retrasado' },
  { titulo: 'Finalizados esperando dictamen', estado: 'Finalizado' },
] as const

export function AsignadorDashboard() {
  const { data: tickets = [], isLoading } = useTicketsDiseno()
  const { perfil } = useAuth()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const pestana = params.get('tab') ?? 'sin-asignar'

  const [respuesta, setRespuesta] = useState<TicketEstadoReal | null>(null)
  const [reasignacionPendiente, setReasignacionPendiente] = useState<{ ticket: TicketEstadoReal; disenador: DisenadorAsignable } | null>(null)
  const [tomando, setTomando] = useState<number | null>(null)

  const { data: disenadores = [] } = useQuery({ queryKey: ['admin', 'disenadores-asignables'], queryFn: listarDisenadoresAsignables })

  function cambiarPestana(clave: string) {
    const siguiente = new URLSearchParams(params)
    siguiente.set('tab', clave)
    setParams(siguiente, { replace: true })
  }

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
    void queryClient.invalidateQueries({ queryKey: ['tickets', 'sin-asignar-count'] })
  }

  async function manejarTomar(ticket: TicketEstadoReal) {
    if (!perfil) return
    setTomando(ticket.ticket_id)
    try {
      const resultado = await tomarTicket(ticket, perfil.id)
      if (resultado === 'tomado') toast.success(`Tomaste ${ticket.codigo}.`)
      else if (resultado === 'ocupado') toast.error(`Otro diseñador ya tomó ${ticket.codigo}.`)
      else toast.error('No se pudo tomar el ticket.')
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo tomar el ticket.'))
    } finally {
      setTomando(null)
    }
  }

  async function aplicarAsignacion(ticket: TicketEstadoReal, disenador: DisenadorAsignable) {
    try {
      await reasignarTicket(ticket, disenador.id)
      toast.success(`${ticket.codigo} asignado a ${disenador.nombre}.`)
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo asignar el ticket.'))
    }
  }

  function manejarCambiarDisenador(ticket: TicketEstadoReal, disenadorId: number) {
    const disenador = disenadores.find((d) => d.id === disenadorId)
    if (!disenador) return
    if (ticket.disenador_id && ticket.disenador_id !== disenadorId) {
      setReasignacionPendiente({ ticket, disenador })
    } else {
      void aplicarAsignacion(ticket, disenador)
    }
  }

  if (isLoading || !perfil) return <SkeletonLista filas={5} />

  // FIFO estricto: el más antiguo primero (la consulta compartida las trae al revés).
  const ticketsFifo = [...tickets].sort(
    (a, b) =>
      new Date(a.fecha_registro ?? 0).getTime() - new Date(b.fecha_registro ?? 0).getTime() ||
      (a.ticket_id ?? 0) - (b.ticket_id ?? 0),
  )

  const excepcionalesPendientes = ticketsFifo.filter((t) => t.es_excepcional && t.excepcional_estado === 'PENDIENTE')
  // Las excepcionales ya aceptadas sí entran aquí si quedaron liberadas (su diseñador se desactivó):
  // solo las pendientes de aceptación quedan fuera, porque esas las gestiona la sección de arriba.
  const sinAsignar = ticketsFifo.filter(
    (t) =>
      !t.disenador_id &&
      !(t.es_excepcional && t.excepcional_estado === 'PENDIENTE') &&
      ESTADOS_ACTIVOS.includes(t.estado_real ?? ''),
  )

  const PESTANAS = [
    { clave: 'sin-asignar', etiqueta: `Sin asignar (${sinAsignar.length})` },
    ...disenadores.map((d) => {
      const activos = ticketsFifo.filter((t) => t.disenador_id === d.id && ESTADOS_ACTIVOS.includes(t.estado_real ?? '')).length
      return { clave: `disenador-${d.id}`, etiqueta: `${d.nombre}${d.id === perfil.id ? ' (yo)' : ''} (${activos})` }
    }),
  ]

  const disenadorActivo = pestana.startsWith('disenador-') ? disenadores.find((d) => `disenador-${d.id}` === pestana) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Asignación</h1>
        <p className="text-sm text-tinta-suave">Reparte y reasigna los tickets entre el equipo de diseño.</p>
      </div>

      {excepcionalesPendientes.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ambar">
            Excepcionales pendientes
            <span className="rounded-full bg-ambar-bruma px-2 py-0.5 text-xs">{excepcionalesPendientes.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {excepcionalesPendientes.map((ticket) => (
              <ExcepcionalPendienteCard
                key={ticket.ticket_id}
                ticket={ticket}
                puedeResponder
                onDictaminar={() => setRespuesta(ticket)}
              />
            ))}
          </div>
        </div>
      )}

      <div role="tablist" aria-label="Asignación" className="flex gap-1 overflow-x-auto border-b border-azul-niebla">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={pestana === p.clave}
            onClick={() => cambiarPestana(p.clave)}
            className={`flex-none whitespace-nowrap px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
              pestana === p.clave
                ? 'border-b-2 border-azul-institucional text-azul-institucional'
                : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'sin-asignar' &&
        (sinAsignar.length === 0 ? (
          <EmptyState titulo="No hay tickets sin asignar" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {sinAsignar.map((ticket, indice) => (
              <div key={ticket.ticket_id} className="flex flex-col">
                <div className="mb-1 flex flex-none items-center justify-between text-xs text-tinta-suave">
                  <span className="font-mono font-semibold text-azul-institucional">#{indice + 1}</span>
                  <span>En cola desde {formatRelativo(ticket.fecha_registro)}</span>
                </div>
                <div className="flex-1">
                  <TicketCard perspectiva="diseno"
                    ticket={ticket}
                    accion={
                      <div className="space-y-2">
                        <select
                          className={`${CLASE_INPUT} text-xs`}
                          value=""
                          onChange={(e) => e.target.value && manejarCambiarDisenador(ticket, Number(e.target.value))}
                        >
                          <option value="">Asignar a…</option>
                          {disenadores.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.nombre}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => manejarTomar(ticket)}
                          disabled={tomando === ticket.ticket_id}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-menta px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-menta-profundo disabled:opacity-60"
                        >
                          <Hand size={16} /> {tomando === ticket.ticket_id ? 'Tomando…' : 'Tomar'}
                        </button>
                      </div>
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        ))}

      {disenadorActivo && (
        <PestanaDisenador
          disenador={disenadorActivo}
          tickets={ticketsFifo}
          disenadores={disenadores}
          onCambiarDisenador={manejarCambiarDisenador}
        />
      )}

      <ResponderExcepcionalModal
        ticket={respuesta}
        disenadores={disenadores}
        onCerrar={() => setRespuesta(null)}
        onRespondido={invalidar}
      />

      <Modal abierto={reasignacionPendiente !== null} onCerrar={() => setReasignacionPendiente(null)} titulo="Reasignar ticket">
        {reasignacionPendiente && (
          <>
            <p className="text-sm text-tinta-suave">
              <strong className="text-tinta">{reasignacionPendiente.ticket.codigo}</strong> ya tenía diseñador asignado.
              ¿Deseas reasignarlo a <strong className="text-tinta">{reasignacionPendiente.disenador.nombre}</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variante="secundario" onClick={() => setReasignacionPendiente(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  void aplicarAsignacion(reasignacionPendiente.ticket, reasignacionPendiente.disenador)
                  setReasignacionPendiente(null)
                }}
              >
                Reasignar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

function PestanaDisenador({
  disenador,
  tickets,
  disenadores,
  onCambiarDisenador,
}: {
  disenador: DisenadorAsignable
  tickets: TicketEstadoReal[]
  disenadores: DisenadorAsignable[]
  onCambiarDisenador: (ticket: TicketEstadoReal, disenadorId: number) => void
}) {
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const propios = tickets.filter((t) => t.disenador_id === disenador.id)
  const activos = propios.filter((t) => ESTADOS_ACTIVOS.includes(t.estado_real ?? ''))

  const limite = hoyTegucigalpaISO()
  const fechaLimite = new Date(`${limite}T12:00:00Z`)
  fechaLimite.setUTCDate(fechaLimite.getUTCDate() - DIAS_HISTORIAL)
  const desdeIso = fechaLimite.toISOString().slice(0, 10)
  const historial = propios.filter(
    (t) =>
      ESTADOS_FINALES_TICKET.includes(t.estado_real ?? '') &&
      (t.fecha_registro ?? '').slice(0, 10) >= desdeIso,
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {COLUMNAS_DISENADOR.map((columna) => {
          const ticketsColumna = activos.filter((t) => t.estado_real === columna.estado)
          return (
            <div key={columna.titulo} className="rounded-xl bg-azul-niebla/40 p-3">
              <p className="mb-3 flex items-center justify-between text-sm font-semibold text-azul-noche">
                {columna.titulo}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs">{ticketsColumna.length}</span>
              </p>
              <div className="space-y-2">
                {ticketsColumna.length === 0 && <p className="text-xs text-tinta-suave">Sin tickets.</p>}
                {ticketsColumna.map((ticket) => (
                  <div key={ticket.ticket_id}>
                    <TicketCard perspectiva="diseno" ticket={ticket} />
                    <select
                      className={`${CLASE_INPUT} mt-1 w-full text-xs`}
                      value=""
                      onChange={(e) => e.target.value && onCambiarDisenador(ticket, Number(e.target.value))}
                    >
                      <option value="">Reasignar a…</option>
                      {disenadores
                        .filter((d) => d.id !== disenador.id)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {activos.length === 0 && <EmptyState titulo="Sin tickets activos para este diseñador" />}

      <div>
        <button
          type="button"
          onClick={() => setHistorialAbierto((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-tinta-suave hover:text-tinta"
        >
          {historialAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Aprobados y rechazados (últimos {DIAS_HISTORIAL} días) ({historial.length})
        </button>
        {historialAbierto && (
          <div className="mt-3 space-y-2">
            {historial.length === 0 ? (
              <p className="text-sm text-tinta-suave">Sin movimientos en este periodo.</p>
            ) : (
              historial.map((ticket) => <TicketCard perspectiva="diseno" key={ticket.ticket_id} ticket={ticket} />)
            )}
          </div>
        )}
      </div>
    </div>
  )
}
