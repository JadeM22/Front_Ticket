import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { obtenerTicketCompleto, tomarTicket } from '../data/tickets'
import { crearDictamen } from '../data/dictamenes'
import { INTENTOS_MAXIMOS_IA, revisarEnvioIA } from '../data/afichesIA'
import { registrarDecisionValidacion } from '../data/validacion'
import { mensajeError } from '../lib/errors'
import { formatFecha, formatFechaHora } from '../lib/date'
import { TagAsignado } from '../components/tickets/Etiquetas'
import { BadgeExcepcional } from '../components/BadgeExcepcional'
import { puedeVerAsignacion } from '../lib/permisos'
import { textoRespuestaExcepcional } from '../lib/excepcional'
import { etiquetarCambioEstado, perspectivaDetalle } from '../lib/estados'
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
import { pasosProgresoIA, pasosProgresoTicket, pasosProgresoValidacion } from '../lib/progresoTicket'
import { etiquetasGenerales } from '../lib/validacionFormularios'
import { CronometroDictamen } from '../components/ui/CronometroDictamen'
import { ListaEntregables } from '../components/ListaEntregables'
import { ListaAdjuntos } from '../components/ListaAdjuntos'
import { SubirEntregableModal } from '../components/SubirEntregableModal'
import { AgregarAdjuntoModal } from '../components/AgregarAdjuntoModal'
import { DictamenModal } from '../components/DictamenModal'
import { DetalleFormularioVista } from '../components/formularios/DetalleFormularioVista'
import { HistorialEnviosIA, VistaAfiche } from '../components/afichesIA/HistorialEnviosIA'
import { SubirAficheModal } from '../components/afichesIA/SubirAficheModal'
import { RevisarAficheModal } from '../components/afichesIA/RevisarAficheModal'
import type { EnvioIA } from '../data/afichesIA'
import type { DecisionIA, DecisionJefe } from '../types/domain'

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
  const [modalAfiche, setModalAfiche] = useState(false)
  const [modalRevision, setModalRevision] = useState(false)
  const [modalValidacion, setModalValidacion] = useState(false)
  const [tomando, setTomando] = useState(false)

  // El historial de cambios es solo para Analista y Administrador; el resto ve la barra de progreso.
  const puedeVerHistorial = tieneRol('Analista') || tieneRol('Administrador')
  // Dictámenes, cronómetro y contador de correcciones son solo para el equipo de diseño y el jefe del
  // área (el Asignador siempre tiene también el rol Diseñador). Los entregables también los ve el
  // solicitante, pero sin comentarios ni botones de dictamen.
  const puedeVerGestion = tieneRol('Jefe de Área') || tieneRol('Diseñador') || esAdmin
  // Empleado/Analista no ven quién diseña el ticket (Parte 27): ni el campo, ni la etiqueta "Asignado",
  // ni quién hizo el cambio de diseñador en el historial.
  const muestraAsignacion = puedeVerAsignacion(perfil?.roles ?? [])

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

  // Al llegar desde la tarjeta de "Dictaminar" (Validador/Por dictaminar del Jefe), abre de una vez el
  // modal de decisión que corresponda. Una sola vez por navegación, nunca al refrescar el ticket.
  const yaAbrioDictamenRef = useRef(false)
  useEffect(() => {
    if (!ticket || yaAbrioDictamenRef.current) return
    const abrir = (location.state as { abrirDictamen?: boolean } | null)?.abrirDictamen
    if (!abrir) return
    yaAbrioDictamenRef.current = true
    const { estadoReal } = ticket
    const esIATicket = estadoReal.flujo === 'APROBACION_IA'
    const esValidacionTicket = estadoReal.flujo === 'VALIDACION'
    const esperando = estadoReal.estado_registrado === 'Enviado' || estadoReal.estado_registrado === 'Retrasado'
    const ultimoEnvio = ultimoEnvioDe(ticket.enviosIA)
    const ultimoEnvioRevisado = ultimoEnvio != null && ticket.revisionesIA.some((r) => r.envio_id === ultimoEnvio.id)
    // setState se dispara desde el callback, no de forma síncrona en el cuerpo del efecto.
    const temporizador = setTimeout(() => {
      if (esIATicket && tieneRol('Validador') && esperando && ultimoEnvio != null && !ultimoEnvioRevisado) {
        setModalRevision(true)
      } else if (esValidacionTicket && tieneRol('Validador') && esperando && ticket.decisionValidacion == null) {
        setModalValidacion(true)
      } else if (!esIATicket && !esValidacionTicket && tieneRol('Jefe de Área') && estadoReal.estado_real === 'Finalizado') {
        setModalDictamen(true)
      }
    }, 0)
    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket])

  async function manejarTomar() {
    if (!ticket || !perfil) return
    setTomando(true)
    try {
      const resultado = await tomarTicket(ticket.estadoReal, perfil.id)
      if (resultado === 'tomado') toast.success('Tomaste el ticket.')
      else if (resultado === 'ocupado') toast.error(`Otro diseñador ya tomó ${ticket.estadoReal.codigo}.`)
      else toast.error('No se pudo tomar el ticket.')
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo tomar el ticket.'))
    } finally {
      setTomando(false)
    }
  }

  async function manejarRevision(decision: DecisionIA, comentario: string) {
    const envio = ticket ? ultimoEnvioDe(ticket.enviosIA) : null
    if (!envio) return
    try {
      await revisarEnvioIA(envio.id, decision, comentario)
      toast.success(decision === 'APROBADO' ? 'Afiche aprobado.' : 'Afiche rechazado.')
      invalidar()
      setModalRevision(false)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo registrar la revisión.'))
    }
  }

  async function manejarValidacion(decision: DecisionIA, comentario: string) {
    if (!ticket || !perfil) return
    try {
      await registrarDecisionValidacion({
        ticketId: ticket.estadoReal.ticket_id!,
        validadorId: perfil.id,
        decision,
        comentario,
      })
      toast.success(decision === 'APROBADO' ? 'Solicitud aprobada.' : 'Solicitud rechazada.')
      invalidar()
      setModalValidacion(false)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo registrar la decisión.'))
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
        titulo={desdeNotificacion ? 'Ya no tienes acceso a este ticket' : 'Ticket no encontrado'}
        descripcion={
          desdeNotificacion
            ? 'Puede que se haya reasignado o que hayas cambiado de área.'
            : 'No existe o no tienes permiso para verlo.'
        }
      />
    )
  }

  const { estadoReal, tipoSolicitud } = ticket
  // Solo los tickets de diseño tienen diseñador, entregables y dictamen. Los IA y los de validación
  // los resuelve un Validador.
  const esIA = estadoReal.flujo === 'APROBACION_IA'
  const esValidacion = estadoReal.flujo === 'VALIDACION'
  const esDiseno = !esIA && !esValidacion
  const registrado = estadoReal.estado_registrado
  const correccionesUsadas = estadoReal.correcciones_usadas ?? 0
  const esExcepcionalPendiente = estadoReal.es_excepcional && estadoReal.excepcional_estado === 'PENDIENTE'
  const esMiTicketDeDiseno = esDiseno && tieneRol('Diseñador') && estadoReal.disenador_id === perfil?.id
  const puedeTomar = esDiseno && tieneRol('Diseñador') && !estadoReal.disenador_id && !esExcepcionalPendiente
  const puedeSubirEntregable =
    esMiTicketDeDiseno && (estadoReal.estado_real === 'En proceso' || estadoReal.estado_real === 'Corrección' || estadoReal.estado_real === 'Retrasado')
  const puedeDictaminar = esDiseno && tieneRol('Jefe de Área') && estadoReal.estado_real === 'Finalizado'
  const dictamenBloqueadoPorHorario = puedeDictaminar && !estadoReal.es_excepcional && !esAdmin && horarioHabil === false
  const esSolicitante = perfil?.id === estadoReal.usuario_registro

  // Flujo IA: el estado lo cambia la base al insertar en EnvioIA/RevisionIA; aquí solo se decide qué
  // botón mostrar. estado_real puede decir "Retrasado" con estado_registrado aún en "Enviado".
  const ultimoEnvio = ultimoEnvioDe(ticket.enviosIA)
  const ultimoEnvioRevisado = ultimoEnvio != null && ticket.revisionesIA.some((r) => r.envio_id === ultimoEnvio.id)
  const esperandoAprobador = registrado === 'Enviado' || registrado === 'Retrasado'
  const puedeSubirPrimerAfiche = esIA && esSolicitante && esperandoAprobador && ticket.enviosIA.length === 0
  const puedeReenviarAfiche = esIA && esSolicitante && registrado === 'Corrección'
  const puedeRevisarAfiche =
    esIA && tieneRol('Validador') && esperandoAprobador && ultimoEnvio != null && !ultimoEnvioRevisado
  // Validación: una sola decisión, mientras el ticket sigue en "Enviado"/"Retrasado".
  const decision = ticket.decisionValidacion
  const puedeDecidirValidacion = esValidacion && tieneRol('Validador') && esperandoAprobador && decision == null
  const intentosRestantes = INTENTOS_MAXIMOS_IA - (estadoReal.intentos_usados ?? 0)
  const puedeVerEntregables = esDiseno && (puedeVerGestion || esSolicitante)
  // Los tickets IA solo admiten el afiche (Parte 32).
  const puedeAgregarAdjunto =
    !esIA &&
    esSolicitante &&
    estadoReal.estado_real !== 'Aprobado' &&
    ticket.adjuntos.length < MAXIMO_ADJUNTOS_POR_TICKET
  const etiquetas = etiquetasGenerales(tipoSolicitud?.etiquetas_generales)
  const perspectiva = perspectivaDetalle(tieneRol, esDiseno)

  const eventosTimeline = ticket.log.flatMap((entrada) => {
    let descripcion = etiquetarCambioEstado(entrada.descripcion_cambio, perspectiva)
    if (!muestraAsignacion) {
      const partes = descripcion.split('; ').filter((parte) => !parte.startsWith('Diseñador: '))
      if (partes.length === 0) return []
      descripcion = partes.join('; ')
    }
    const esOtraPersona = !muestraAsignacion && entrada.usuario_registro != null && entrada.usuario_registro !== perfil?.id
    const autor = esOtraPersona ? 'Equipo de diseño' : nombreDe(entrada.usuario_registro)
    return [{ id: entrada.id, descripcion, fecha: entrada.fecha_registro, autor }]
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="whitespace-nowrap font-mono text-sm text-tinta-suave">{estadoReal.codigo}</p>
              {estadoReal.es_excepcional && <BadgeExcepcional />}
            </div>
            <h1 className="text-xl font-bold text-azul-noche">{estadoReal.titulo || estadoReal.tipo_solicitud}</h1>
            <p className="text-sm text-tinta-suave">
              {estadoReal.titulo && <>{estadoReal.tipo_solicitud} · </>}
              {estadoReal.solicitante} · {estadoReal.area}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <EstadoChip estado={estadoReal.estado_real ?? ''} perspectiva={perspectiva} />
            {muestraAsignacion && estadoReal.asignado_por_asignador && (
              <TagAsignado por={estadoReal.asignado_por_nombre} fecha={estadoReal.fecha_asignacion} />
            )}
          </div>
        </div>

        {estadoReal.es_excepcional && (
          <div className="mt-3 rounded-lg bg-ambar-bruma/60 p-3 text-sm text-ambar">
            {textoRespuestaExcepcional(estadoReal)}
          </div>
        )}

        {/* Parte 53: la base dio 1 día hábil porque la corrección llegó al final del plazo. */}
        {esDiseno && tieneRol('Diseñador') && estadoReal.estado_real === 'Corrección' && ticket.conMargenCorreccion && (
          <div className="mt-3 rounded-lg bg-ambar-bruma/60 p-3 text-sm text-ambar">
            Como la corrección llegó al final del plazo, tienes hasta el {formatFechaHora(estadoReal.fecha_limite)} para
            entregarla.
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-tinta-suave">Creado</p>
            <p>{formatFechaHora(estadoReal.fecha_registro)}</p>
          </div>
          <div>
            <p className="text-xs text-tinta-suave">{etiquetas.fecha_evento}</p>
            <p>{formatFecha(estadoReal.fecha_evento)}</p>
          </div>
          <div>
            <p className="text-xs text-tinta-suave">{esDiseno ? 'Vence' : 'Fecha límite de respuesta'}</p>
            <p>
              {formatFecha(estadoReal.fecha_limite)}
              {tipoSolicitud && !estadoReal.es_excepcional && (
                <span className="text-tinta-suave"> ({tipoSolicitud.dias_estimados} día(s) {tipoSolicitud.dias_habiles ? 'hábiles' : 'corridos'})</span>
              )}
            </p>
          </div>
          {esIA && (
            <div>
              <p className="text-xs text-tinta-suave">Intentos restantes</p>
              <p className={intentosRestantes <= 1 ? 'font-semibold text-coral' : undefined}>
                {Math.max(intentosRestantes, 0)} de {INTENTOS_MAXIMOS_IA}
              </p>
            </div>
          )}
          {muestraAsignacion && esDiseno && (
            <div>
              <p className="text-xs text-tinta-suave">Diseñador</p>
              <p>{estadoReal.disenador ?? 'Sin asignar'}</p>
              {estadoReal.asignado_por_asignador && (
                <p className="text-xs text-indigo-suave">
                  Asignado por {estadoReal.asignado_por_nombre} el {formatFechaHora(estadoReal.fecha_asignacion)}
                </p>
              )}
            </div>
          )}
          {puedeVerGestion && esDiseno && (
            <div>
              <p className="text-xs text-tinta-suave">Correcciones</p>
              <p>{correccionesUsadas} / {CORRECCIONES_MAXIMAS}</p>
            </div>
          )}
        </div>

        {puedeVerGestion && estadoReal.estado_real === 'Finalizado' && estadoReal.minutos_habiles_restantes_dictamen != null && (
          <div className="mt-4">
            <CronometroDictamen
              minutos={estadoReal.minutos_habiles_restantes_dictamen}
              fechaAprobacion={estadoReal.fecha_aprobacion_automatica}
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {puedeTomar && (
            <Button cargando={tomando} onClick={manejarTomar}>
              Tomar ticket
            </Button>
          )}
          {puedeSubirEntregable && <Button onClick={() => setModalEntregable(true)}>Subir entregable</Button>}
          {(puedeSubirPrimerAfiche || puedeReenviarAfiche) && (
            <Button onClick={() => setModalAfiche(true)}>{puedeReenviarAfiche ? 'Reenviar afiche' : 'Subir afiche'}</Button>
          )}
          {puedeRevisarAfiche && <Button onClick={() => setModalRevision(true)}>Dictaminar</Button>}
          {puedeDecidirValidacion && <Button onClick={() => setModalValidacion(true)}>Dictaminar</Button>}
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
          <DetalleFormularioVista detalle={ticket.detalleFormulario} etiquetas={etiquetas} />
        ) : (
          <p className="text-sm text-tinta-suave">No se encontró el detalle del formulario.</p>
        )}
      </Card>

      {esIA && (
        <Card>
          <h2 className="mb-3 font-semibold text-azul-noche">Afiche</h2>
          {ultimoEnvio ? (
            <>
              <p className="mb-2 text-xs text-tinta-suave">
                Intento {ultimoEnvio.intento} · {ultimoEnvio.nombre_archivo}
              </p>
              <VistaAfiche envio={ultimoEnvio} />
            </>
          ) : (
            <p className="text-sm text-tinta-suave">
              {puedeSubirPrimerAfiche
                ? 'Tu solicitud se creó, pero el afiche no se llegó a subir. Usa "Subir afiche" para enviarlo a revisión.'
                : 'El solicitante todavía no ha subido el afiche.'}
            </p>
          )}

          {ticket.enviosIA.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-azul-noche">Envíos y revisiones</h3>
              <HistorialEnviosIA envios={ticket.enviosIA} revisiones={ticket.revisionesIA} />
            </div>
          )}
        </Card>
      )}

      {esValidacion && decision && (
        <Card>
          <h2 className="mb-3 font-semibold text-azul-noche">Decisión de validación</h2>
          <div
            className={`rounded-lg p-3 text-sm ${
              decision.decision === 'APROBADO' ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
            }`}
          >
            <p className="font-semibold">
              {decision.decision === 'APROBADO' ? 'Aprobada' : 'Rechazada'} · {formatFechaHora(decision.fecha_decision)}
            </p>
            {decision.comentario && <p className="mt-1 whitespace-pre-line text-tinta">{decision.comentario}</p>}
          </div>
        </Card>
      )}

      {/* Un ticket IA solo lleva su afiche; se muestran los adjuntos que tuviera de antes. */}
      {(!esIA || ticket.adjuntos.length > 0) && (
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
      )}

      {puedeVerEntregables && (
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
          <Stepper
            pasos={
              esIA
                ? pasosProgresoIA(estadoReal, INTENTOS_MAXIMOS_IA)
                : esValidacion
                  ? pasosProgresoValidacion(estadoReal, decision?.comentario ?? null)
                  : pasosProgresoTicket(estadoReal)
            }
          />
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

      <SubirAficheModal
        abierto={modalAfiche}
        onCerrar={() => setModalAfiche(false)}
        onSubido={invalidar}
        ticketId={estadoReal.ticket_id!}
        titulo={puedeReenviarAfiche ? 'Reenviar afiche' : 'Subir afiche'}
      />

      <RevisarAficheModal
        abierto={modalRevision}
        onCerrar={() => setModalRevision(false)}
        onConfirmar={manejarRevision}
        titulo={`Revisar afiche de ${estadoReal.codigo ?? ''}`}
        intento={ultimoEnvio?.intento ?? 1}
      />

      <RevisarAficheModal
        abierto={modalValidacion}
        onCerrar={() => setModalValidacion(false)}
        onConfirmar={manejarValidacion}
        titulo={`Validar ${estadoReal.codigo ?? ''}`}
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

/** Solo se revisa el envío más reciente. */
function ultimoEnvioDe(envios: EnvioIA[]): EnvioIA | null {
  return envios.reduce<EnvioIA | null>((ultimo, e) => (!ultimo || e.intento > ultimo.intento ? e : ultimo), null)
}
