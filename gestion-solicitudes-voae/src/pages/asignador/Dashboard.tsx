import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { tomarTicket, reasignarTicket } from '../../data/tickets'
import { listarDisenadoresAsignables, type DisenadorAsignable } from '../../data/usuarios'
import { listarAreas, listarTiposSolicitud } from '../../data/catalogos'
import { mensajeError } from '../../lib/errors'
import { useAuth } from '../../auth/useAuth'
import { TicketCard } from '../../components/TicketCard'
import { ExcepcionalPendienteCard } from '../../components/ExcepcionalPendienteCard'
import { ResponderExcepcionalModal } from '../../components/ResponderExcepcionalModal'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import type { TicketEstadoReal } from '../../types/domain'

const ESTADOS_ACTIVOS = ['Enviado', 'En revisión', 'En proceso', 'Corrección', 'Retrasado', 'Finalizado']

export function AsignadorDashboard() {
  const { data: tickets = [], isLoading } = useTicketsEstadoReal()
  const { perfil } = useAuth()
  const queryClient = useQueryClient()

  const [busqueda, setBusqueda] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [respuesta, setRespuesta] = useState<{ ticket: TicketEstadoReal; modo: 'aceptar' | 'rechazar' } | null>(null)
  const [reasignacionPendiente, setReasignacionPendiente] = useState<{ ticket: TicketEstadoReal; disenador: DisenadorAsignable } | null>(null)

  const { data: disenadores = [] } = useQuery({ queryKey: ['admin', 'disenadores-asignables'], queryFn: listarDisenadoresAsignables })
  const { data: tipos = [] } = useQuery({ queryKey: ['catalogos', 'tipos-solicitud'], queryFn: listarTiposSolicitud })
  const { data: areas = [] } = useQuery({ queryKey: ['catalogos', 'areas'], queryFn: listarAreas })

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
  }

  async function manejarTomar(ticket: TicketEstadoReal) {
    if (!perfil) return
    try {
      await tomarTicket(ticket, perfil.id)
      toast.success(`Tomaste el ticket ${ticket.codigo}.`)
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo tomar el ticket.'))
    }
  }

  async function aplicarReasignacion(ticket: TicketEstadoReal, disenador: DisenadorAsignable) {
    try {
      await reasignarTicket(ticket, disenador.id)
      toast.success(`${ticket.codigo} reasignado a ${disenador.nombre}.`)
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo reasignar el ticket.'))
    }
  }

  function manejarCambiarDisenador(ticket: TicketEstadoReal, disenadorId: number) {
    const disenador = disenadores.find((d) => d.id === disenadorId)
    if (!disenador) return
    if (ticket.disenador_id && ticket.disenador_id !== disenadorId) {
      setReasignacionPendiente({ ticket, disenador })
    } else {
      void aplicarReasignacion(ticket, disenador)
    }
  }

  const filtrados = useMemo(() => {
    const busquedaNormalizada = busqueda.trim().toLowerCase()
    return tickets.filter((t) => {
      if (busquedaNormalizada && !(t.codigo ?? '').toLowerCase().includes(busquedaNormalizada)) return false
      if (tipoId && String(t.tipo_solicitud_id) !== tipoId) return false
      if (areaId && String(t.area_id) !== areaId) return false
      if (estadoFiltro && t.estado_real !== estadoFiltro) return false
      return true
    })
  }, [tickets, busqueda, tipoId, areaId, estadoFiltro])

  const excepcionalesPendientes = filtrados.filter((t) => t.es_excepcional && t.excepcional_estado === 'PENDIENTE')
  const sinAsignar = filtrados.filter(
    (t) => !t.disenador_id && !t.es_excepcional && ESTADOS_ACTIVOS.includes(t.estado_real ?? ''),
  )

  if (isLoading || !perfil) return <SkeletonLista filas={5} />

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
                onAceptar={() => setRespuesta({ ticket, modo: 'aceptar' })}
                onRechazar={() => setRespuesta({ ticket, modo: 'rechazar' })}
              />
            ))}
          </div>
        </div>
      )}

      <Card className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-tinta-suave">
          Buscar
          <div className="relative mt-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
            <input
              className={`${CLASE_INPUT} w-48 pl-8`}
              placeholder="Buscar por código"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </label>
        <label className="text-xs text-tinta-suave">
          Tipo
          <select className={`${CLASE_INPUT} mt-1 w-auto`} value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-tinta-suave">
          Área
          <select className={`${CLASE_INPUT} mt-1 w-auto`} value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Todas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-tinta-suave">
          Estado
          <select className={`${CLASE_INPUT} mt-1 w-auto`} value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS_ACTIVOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Carril
          titulo="Sin asignar"
          tickets={sinAsignar}
          disenadores={disenadores}
          onCambiarDisenador={manejarCambiarDisenador}
          onTomar={manejarTomar}
        />
        {disenadores.map((disenador) => {
          const ticketsDisenador = filtrados.filter(
            (t) => t.disenador_id === disenador.id && ESTADOS_ACTIVOS.includes(t.estado_real ?? ''),
          )
          return (
            <Carril
              key={disenador.id}
              titulo={disenador.nombre}
              tickets={ticketsDisenador}
              disenadores={disenadores}
              onCambiarDisenador={manejarCambiarDisenador}
            />
          )
        })}
      </div>

      {filtrados.length === 0 && <EmptyState titulo="No hay tickets con estos filtros" />}

      <ResponderExcepcionalModal
        ticket={respuesta?.ticket ?? null}
        modo={respuesta?.modo ?? null}
        disenadores={disenadores}
        onCerrar={() => setRespuesta(null)}
        onRespondido={invalidar}
      />

      <Modal
        abierto={reasignacionPendiente !== null}
        onCerrar={() => setReasignacionPendiente(null)}
        titulo="Reasignar ticket"
      >
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
                  void aplicarReasignacion(reasignacionPendiente.ticket, reasignacionPendiente.disenador)
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

function Carril({
  titulo,
  tickets,
  disenadores,
  onCambiarDisenador,
  onTomar,
}: {
  titulo: string
  tickets: TicketEstadoReal[]
  disenadores: DisenadorAsignable[]
  onCambiarDisenador: (ticket: TicketEstadoReal, disenadorId: number) => void
  onTomar?: (ticket: TicketEstadoReal) => void
}) {
  return (
    <div className="rounded-xl bg-azul-niebla/40 p-3">
      <p className="mb-3 flex items-center justify-between text-sm font-semibold text-azul-noche">
        {titulo}
        <span className="rounded-full bg-white px-2 py-0.5 text-xs">{tickets.length}</span>
      </p>
      <div className="space-y-2">
        {tickets.length === 0 && <p className="text-xs text-tinta-suave">Sin tickets.</p>}
        {tickets.map((ticket) => (
          <div key={ticket.ticket_id}>
            <TicketCard ticket={ticket} />
            <div className="mt-1 flex gap-2">
              <select
                className={`${CLASE_INPUT} flex-1 text-xs`}
                value=""
                onChange={(e) => e.target.value && onCambiarDisenador(ticket, Number(e.target.value))}
              >
                <option value="">Asignar a…</option>
                {disenadores.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
              {onTomar && (
                <Button variante="secundario" onClick={() => onTomar(ticket)}>
                  Tomar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
