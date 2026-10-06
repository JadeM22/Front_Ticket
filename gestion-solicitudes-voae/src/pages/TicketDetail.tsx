import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { obtenerTicketCompleto, tomarTicket } from '../data/tickets'
import { crearDictamen } from '../data/dictamenes'
import { mensajeError } from '../lib/errors'
import { formatFecha, formatFechaHora } from '../lib/date'
import { useAuth } from '../auth/useAuth'
import { useNombresUsuarios } from '../hooks/useNombresUsuarios'
import { MAXIMO_ADJUNTOS_POR_TICKET } from '../data/adjuntos'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SkeletonLista } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { EstadoChip } from '../components/EstadoChip'
import { Timeline } from '../components/ui/Timeline'
import { ProgressRing } from '../components/ui/ProgressRing'
import { ListaEntregables } from '../components/ListaEntregables'
import { ListaAdjuntos } from '../components/ListaAdjuntos'
import { SubirEntregableModal } from '../components/SubirEntregableModal'
import { AgregarAdjuntoModal } from '../components/AgregarAdjuntoModal'
import { DictamenModal } from '../components/DictamenModal'
import { DetalleFormularioVista } from '../components/formularios/DetalleFormularioVista'
import type { DecisionJefe } from '../types/domain'

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = Number(id)
  const { perfil, tieneRol } = useAuth()
  const { nombreDe } = useNombresUsuarios()
  const queryClient = useQueryClient()
  const [modalEntregable, setModalEntregable] = useState(false)
  const [modalAdjunto, setModalAdjunto] = useState(false)
  const [modalDictamen, setModalDictamen] = useState(false)
  const [tomando, setTomando] = useState(false)

  const clave = ['ticket-detalle', ticketId]
  const { data: ticket, isLoading } = useQuery({
    queryKey: clave,
    queryFn: () => obtenerTicketCompleto(ticketId),
    enabled: Number.isFinite(ticketId),
  })

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: clave })
    void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
  }

  async function manejarTomar() {
    if (!ticket || !perfil) return
    setTomando(true)
    try {
      await tomarTicket(ticket.estadoReal, perfil.id)
      toast.success('Tomaste el ticket.')
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo tomar el ticket.'))
    } finally {
      setTomando(false)
    }
  }

  async function manejarDictamen(decision: DecisionJefe, comentario?: string) {
    if (!ticket) return
    try {
      await crearDictamen(ticket.estadoReal.ticket_id!, decision, comentario)
      toast.success(decision === 'APROBADO' ? 'Ticket aprobado.' : 'Se solicitó corrección.')
      invalidar()
      setModalDictamen(false)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo registrar el dictamen.'))
    }
  }

  if (isLoading) return <SkeletonLista filas={4} />
  if (!ticket) {
    return <EmptyState titulo="Ticket no encontrado" descripcion="No existe o no tienes permiso para verlo." />
  }

  const { estadoReal, tipoSolicitud } = ticket
  const esMiTicketDeDiseno = tieneRol('Diseñador') && estadoReal.disenador_id === perfil?.id
  const puedeTomar = tieneRol('Diseñador') && !estadoReal.disenador_id
  const puedeSubirEntregable =
    esMiTicketDeDiseno && (estadoReal.estado_real === 'En proceso' || estadoReal.estado_real === 'Corrección' || estadoReal.estado_real === 'Retrasado')
  const puedeDictaminar = tieneRol('Jefe de Área') && estadoReal.estado_real === 'Finalizado'
  const esSolicitante = perfil?.id === estadoReal.usuario_registro
  const puedeAgregarAdjunto =
    esSolicitante && estadoReal.estado_real !== 'Aprobado' && ticket.adjuntos.length < MAXIMO_ADJUNTOS_POR_TICKET

  const eventosTimeline = ticket.log.map((entrada) => ({
    id: entrada.id,
    descripcion: entrada.descripcion_cambio,
    fecha: entrada.fecha_registro,
    autor: nombreDe(entrada.usuario_registro),
  }))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-tinta-suave">#{String(estadoReal.ticket_id).padStart(4, '0')}</p>
            <h1 className="text-xl font-bold text-azul-noche">{estadoReal.tipo_solicitud}</h1>
            <p className="text-sm text-tinta-suave">
              {estadoReal.solicitante} · {estadoReal.area}
            </p>
          </div>
          <EstadoChip estado={estadoReal.estado_real ?? ''} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-tinta-suave">Registrado</p>
            <p>{formatFecha(estadoReal.fecha_registro)}</p>
          </div>
          <div>
            <p className="text-xs text-tinta-suave">Vence</p>
            <p>
              {formatFecha(estadoReal.fecha_limite)}
              {tipoSolicitud && (
                <span className="text-tinta-suave"> ({tipoSolicitud.dias_estimados} día(s) {tipoSolicitud.dias_habiles ? 'hábiles' : 'corridos'})</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-tinta-suave">Diseñador</p>
            <p>{estadoReal.disenador ?? 'Sin asignar'}</p>
          </div>
          <div>
            <p className="text-xs text-tinta-suave">Correcciones usadas</p>
            <p>{estadoReal.correcciones_usadas ?? 0} / 1</p>
          </div>
        </div>

        {estadoReal.estado_real === 'Finalizado' && estadoReal.horas_restantes_dictamen != null && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-azul-niebla/40 p-3">
            <ProgressRing horasRestantes={estadoReal.horas_restantes_dictamen} />
            <p className="text-sm text-tinta-suave">
              Si el jefe de área no dictamina antes de las{' '}
              <span className="font-medium text-tinta">{formatFechaHora(estadoReal.fecha_aprobacion_automatica)}</span>, el
              ticket se aprueba automáticamente.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {puedeTomar && (
            <Button cargando={tomando} onClick={manejarTomar}>
              Tomar ticket
            </Button>
          )}
          {puedeSubirEntregable && <Button onClick={() => setModalEntregable(true)}>Subir entregable</Button>}
          {puedeDictaminar && <Button onClick={() => setModalDictamen(true)}>Dictaminar</Button>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-azul-noche">Detalle de la solicitud</h2>
        {ticket.detalleFormulario ? (
          <DetalleFormularioVista detalle={ticket.detalleFormulario} />
        ) : (
          <p className="text-sm text-tinta-suave">No se encontró el detalle del formulario.</p>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-azul-noche">
            Adjuntos del solicitante ({ticket.adjuntos.length} / {MAXIMO_ADJUNTOS_POR_TICKET})
          </h2>
          {puedeAgregarAdjunto && (
            <Button variante="secundario" onClick={() => setModalAdjunto(true)}>
              <Plus size={14} /> Agregar
            </Button>
          )}
        </div>
        <ListaAdjuntos adjuntos={ticket.adjuntos} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-azul-noche">Entregables</h2>
        <ListaEntregables entregables={ticket.entregables} />
      </Card>

      {ticket.dictamenes.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold text-azul-noche">Dictámenes</h2>
          <ul className="space-y-2 text-sm">
            {ticket.dictamenes.map((dictamen) => (
              <li key={dictamen.id} className="rounded-lg border border-azul-niebla p-3">
                <p className="font-medium text-tinta">
                  {dictamen.decision === 'APROBADO' ? 'Aprobado' : 'Corrección solicitada'} ·{' '}
                  {formatFechaHora(dictamen.fecha_dictamen)}
                </p>
                {dictamen.comentario && <p className="text-tinta-suave">{dictamen.comentario}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold text-azul-noche">Historial</h2>
        <Timeline eventos={eventosTimeline} />
      </Card>

      {perfil && (
        <SubirEntregableModal
          abierto={modalEntregable}
          onCerrar={() => setModalEntregable(false)}
          onSubido={invalidar}
          ticketId={estadoReal.ticket_id!}
          disenadorId={perfil.id}
        />
      )}

      <AgregarAdjuntoModal
        abierto={modalAdjunto}
        onCerrar={() => setModalAdjunto(false)}
        onAgregado={invalidar}
        ticketId={estadoReal.ticket_id!}
      />

      <DictamenModal
        abierto={modalDictamen}
        onCerrar={() => setModalDictamen(false)}
        onConfirmar={manejarDictamen}
        ticketId={estadoReal.ticket_id!}
      />
    </div>
  )
}
