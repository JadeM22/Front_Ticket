import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Zap } from 'lucide-react'
import { obtenerTicketCompleto, tomarTicket } from '../data/tickets'
import { crearDictamen } from '../data/dictamenes'
import { mensajeError } from '../lib/errors'
import { formatFecha, formatFechaHora, formatoHorasHabiles } from '../lib/date'
import { useAuth } from '../auth/useAuth'
import { useHorarioHabil } from '../hooks/useHorarioHabil'
import { useNombresUsuarios } from '../hooks/useNombresUsuarios'
import { MAXIMO_ADJUNTOS_POR_TICKET } from '../data/adjuntos'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SkeletonLista } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { EstadoChip } from '../components/EstadoChip'
import { Timeline } from '../components/ui/Timeline'
import { Stepper } from '../components/ui/Stepper'
import { pasosProgresoTicket } from '../lib/progresoTicket'
import { ProgressRing } from '../components/ui/ProgressRing'
import { ListaEntregables } from '../components/ListaEntregables'
import { ListaAdjuntos } from '../components/ListaAdjuntos'
import { SubirEntregableModal } from '../components/SubirEntregableModal'
import { AgregarAdjuntoModal } from '../components/AgregarAdjuntoModal'
import { DictamenModal } from '../components/DictamenModal'
import { DetalleFormularioVista } from '../components/formularios/DetalleFormularioVista'
import type { DecisionJefe } from '../types/domain'

const CORRECCIONES_MAXIMAS = 5

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = Number(id)
  const location = useLocation()
  const { perfil, tieneRol } = useAuth()
  const horarioHabil = useHorarioHabil()
  const esAdmin = tieneRol('Administrador')
  const { nombreDe } = useNombresUsuarios()
  const queryClient = useQueryClient()
  const [modalEntregable, setModalEntregable] = useState(false)
  const [modalAdjunto, setModalAdjunto] = useState(false)
  const [modalDictamen, setModalDictamen] = useState(false)
  const [tomando, setTomando] = useState(false)

  // El historial de cambios es solo para Analista y Administrador; el resto ve la barra de progreso.
  const puedeVerHistorial = tieneRol('Analista') || tieneRol('Administrador')
  // Entregables, dictámenes y el contador de correcciones son solo para el equipo de diseño y el jefe
  // del área (el Asignador siempre tiene también el rol Diseñador). El solicitante solo ve el estado.
  const puedeVerGestion = tieneRol('Jefe de Área') || tieneRol('Diseñador') || esAdmin

  const clave = ['ticket-detalle', ticketId, puedeVerHistorial, puedeVerGestion]
  const { data: ticket, isLoading } = useQuery({
    queryKey: clave,
    queryFn: () => obtenerTicketCompleto(ticketId, puedeVerHistorial, puedeVerGestion),
    enabled: Number.isFinite(ticketId),
    // El cronómetro del dictamen se detiene fuera de horario hábil y lo calcula la base.
    refetchInterval: 60_000,
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
    const desdeNotificacion = Boolean((location.state as { desdeNotificacion?: boolean } | null)?.desdeNotificacion)
    return (
      <EmptyState
        titulo={desdeNotificacion ? 'Este ticket ya no está asignado a ti' : 'Ticket no encontrado'}
        descripcion={desdeNotificacion ? undefined : 'No existe o no tienes permiso para verlo.'}
      />
    )
  }

  const { estadoReal, tipoSolicitud } = ticket
  const correccionesUsadas = estadoReal.correcciones_usadas ?? 0
  const esExcepcionalPendiente = estadoReal.es_excepcional && estadoReal.excepcional_estado === 'PENDIENTE'
  const esMiTicketDeDiseno = tieneRol('Diseñador') && estadoReal.disenador_id === perfil?.id
  const puedeTomar = tieneRol('Diseñador') && !estadoReal.disenador_id && !esExcepcionalPendiente
  const puedeSubirEntregable =
    esMiTicketDeDiseno && (estadoReal.estado_real === 'En proceso' || estadoReal.estado_real === 'Corrección' || estadoReal.estado_real === 'Retrasado')
  const puedeDictaminar = tieneRol('Jefe de Área') && estadoReal.estado_real === 'Finalizado'
  const dictamenBloqueadoPorHorario = puedeDictaminar && !estadoReal.es_excepcional && !esAdmin && horarioHabil === false
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
            <p className="font-mono text-sm text-tinta-suave">{estadoReal.codigo}</p>
            <h1 className="text-xl font-bold text-azul-noche">{estadoReal.tipo_solicitud}</h1>
            <p className="text-sm text-tinta-suave">
              {estadoReal.solicitante} · {estadoReal.area}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <EstadoChip estado={estadoReal.estado_real ?? ''} />
            {estadoReal.es_excepcional && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ambar-bruma px-2 py-0.5 text-xs font-semibold text-ambar">
                <Zap size={12} /> Excepcional
              </span>
            )}
          </div>
        </div>

        {estadoReal.es_excepcional && (
          <div className="mt-3 rounded-lg bg-ambar-bruma/60 p-3 text-sm text-ambar">
            {estadoReal.excepcional_estado === 'PENDIENTE' && 'Pendiente de aceptación por el Asignador.'}
            {estadoReal.excepcional_estado === 'ACEPTADA' && `Aceptada por ${estadoReal.disenador ?? 'el equipo de diseño'}.`}
            {estadoReal.excepcional_estado === 'RECHAZADA' && (
              <>Rechazada: {estadoReal.excepcional_motivo_rechazo ?? 'sin motivo registrado'}</>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-tinta-suave">Creado</p>
            <p>{formatFechaHora(estadoReal.fecha_registro)}</p>
          </div>
          <div>
            <p className="text-xs text-tinta-suave">Fecha del evento</p>
            <p>{formatFecha(estadoReal.fecha_evento)}</p>
          </div>
          <div>
            <p className="text-xs text-tinta-suave">Vence</p>
            <p>
              {formatFecha(estadoReal.fecha_limite)}
              {tipoSolicitud && !estadoReal.es_excepcional && (
                <span className="text-tinta-suave"> ({tipoSolicitud.dias_estimados} día(s) {tipoSolicitud.dias_habiles ? 'hábiles' : 'corridos'})</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-tinta-suave">Diseñador</p>
            <p>{estadoReal.disenador ?? 'Sin asignar'}</p>
          </div>
          {puedeVerGestion && (
            <div>
              <p className="text-xs text-tinta-suave">Correcciones</p>
              <p>{correccionesUsadas} / {CORRECCIONES_MAXIMAS}</p>
            </div>
          )}
        </div>

        {puedeVerGestion && estadoReal.estado_real === 'Finalizado' && estadoReal.minutos_habiles_restantes_dictamen != null && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-azul-niebla/40 p-3">
            <ProgressRing horasRestantes={estadoReal.minutos_habiles_restantes_dictamen / 60} />
            <p className="text-sm text-tinta-suave">
              Quedan {formatoHorasHabiles(estadoReal.minutos_habiles_restantes_dictamen)} hábiles para dictaminar. Si
              el jefe de área no dictamina antes de las{' '}
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
          {puedeDictaminar && (
            <Button
              onClick={() => setModalDictamen(true)}
              disabled={dictamenBloqueadoPorHorario}
              title={dictamenBloqueadoPorHorario ? 'Los dictámenes solo se hacen en horario hábil.' : undefined}
            >
              Dictaminar
            </Button>
          )}
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

      {puedeVerGestion && (
        <Card>
          <h2 className="mb-3 font-semibold text-azul-noche">Entregables</h2>
          <ListaEntregables entregables={ticket.entregables} />
        </Card>
      )}

      {puedeVerGestion && ticket.dictamenes.length > 0 && (
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

      {puedeVerHistorial ? (
        <Card>
          <h2 className="mb-3 font-semibold text-azul-noche">Historial</h2>
          <Timeline eventos={eventosTimeline} />
        </Card>
      ) : (
        <Card>
          <h2 className="mb-4 font-semibold text-azul-noche">Progreso de la solicitud</h2>
          <Stepper pasos={pasosProgresoTicket(estadoReal)} />
        </Card>
      )}

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
        codigo={estadoReal.codigo ?? ''}
        correccionesUsadas={correccionesUsadas}
      />
    </div>
  )
}
