import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, Download, FileDown, Search, X, Zap } from 'lucide-react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { crearDictamen } from '../../data/dictamenes'
import { listarJefaturasDeUsuario } from '../../data/usuarios'
import { listarAreas } from '../../data/catalogos'
import { mensajeError } from '../../lib/errors'
import { formatFecha } from '../../lib/date'
import { coincideCodigo, coincideTexto } from '../../lib/buscar'
import { exportarCSV, exportarPDF, type ColumnaExportar } from '../../lib/exportar'
import { puedeVerAsignacion } from '../../lib/permisos'
import { etiquetaEstado } from '../../lib/estados'
import { useAuth } from '../../auth/useAuth'
import { useHorarioHabil } from '../../hooks/useHorarioHabil'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { FechaInput } from '../../components/ui/FechaInput'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { EstadoChip } from '../../components/EstadoChip'
import { BadgeExcepcional } from '../../components/BadgeExcepcional'
import { CLASE_CARD_ENLACE, propsCardEnlace } from '../../hooks/useCardEnlace'
import { CronometroDictamen } from '../../components/ui/CronometroDictamen'
import { DictamenModal } from '../../components/DictamenModal'
import { CambioUrgenteModal } from '../../components/CambioUrgenteModal'
import { useAreasQueDirige, useCambiosUrgentes } from '../../hooks/useCambiosUrgentes'
import { puedePedirCambioUrgente } from '../../lib/cambioUrgente'
import { ETIQUETA_FLUJO, TAG_FLUJO, type DecisionJefe, type Flujo, type TicketEstadoReal } from '../../types/domain'

const DECISIONES = ['Aprobado', 'Corrección', 'Aprobado (Automático)', 'Rechazado', 'Retrasado']

function etiquetaFlujo(t: TicketEstadoReal): string {
  return ETIQUETA_FLUJO[t.flujo as Flujo] ?? t.flujo ?? '—'
}

/** Solo los tickets de diseño tienen diseñador, y solo para quien puede ver asignación (Parte 37: ya
 * no incluye al Jefe de Área); "Sin asignar" daría a entender que falta asignarlos. */
function textoDisenador(t: TicketEstadoReal, muestraAsignacion: boolean): string {
  if (!muestraAsignacion) return '—'
  if (t.flujo && t.flujo !== 'DISENO') return '—'
  return t.disenador ?? 'Sin asignar'
}

export function JefeDashboard() {
  const { data: tickets = [], isLoading } = useTicketsEstadoReal()
  const { perfil, tieneRol } = useAuth()
  const horarioHabil = useHorarioHabil()
  const esAdmin = tieneRol('Administrador')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [ticketDictamen, setTicketDictamen] = useState<TicketEstadoReal | null>(null)
  const [ticketCambioUrgente, setTicketCambioUrgente] = useState<TicketEstadoReal | null>(null)
  const areasQueDirige = useAreasQueDirige()
  const { cambios } = useCambiosUrgentes()
  // Estado guardado de los cambios urgentes de un ticket; uno que no está en la lista cuenta como en curso.
  const cambiosDelTicket = (origenId: number | null) =>
    cambios
      .filter((c) => c.ticketOrigenId === origenId)
      .map((c) => ({ estado_registrado: tickets.find((t) => t.ticket_id === c.id)?.estado_registrado ?? null }))
  // Parte 37: el Jefe de Área ya no ve quién diseña el ticket, ni la columna ni el filtro.
  const muestraAsignacion = puedeVerAsignacion(perfil?.roles ?? [])

  // Jefaturas adicionales (Parte 39): el filtro ofrece su propia área o coordinación más las que dirige,
  // aunque alguna todavía no tenga tickets (E-07), y solo aparece si en total son 2 o más.
  const { data: jefaturas = [] } = useQuery({
    queryKey: ['jefaturas', perfil?.id],
    queryFn: () => listarJefaturasDeUsuario(perfil!.id),
    enabled: perfil != null,
  })
  const { data: areas = [] } = useQuery({ queryKey: ['catalogos', 'areas'], queryFn: listarAreas })
  const areasDisponibles = useMemo(() => {
    const ids = new Set([perfil?.area_id, ...jefaturas.map((j) => j.area_id)])
    return areas
      .filter((a) => ids.has(a.id))
      .map((a) => a.nombre)
      .sort()
  }, [areas, jefaturas, perfil?.area_id])
  const tieneJefaturas = areasDisponibles.length >= 2

  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [decisionFiltro, setDecisionFiltro] = useState('')
  const [flujoFiltro, setFlujoFiltro] = useState('')
  const [areaFiltro, setAreaFiltro] = useState('')
  const [exportarAbierto, setExportarAbierto] = useState(false)
  const exportarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportarAbierto) return
    function alHacerClicFuera(evento: MouseEvent) {
      if (exportarRef.current && !exportarRef.current.contains(evento.target as Node)) setExportarAbierto(false)
    }
    document.addEventListener('mousedown', alHacerClicFuera)
    return () => document.removeEventListener('mousedown', alHacerClicFuera)
  }, [exportarAbierto])

  // Los tickets IA y de validación nunca llegan a "Finalizado" ni los dictamina el jefe: los ve en el
  // historial, solo en lectura.
  const esPorDictaminar = (t: TicketEstadoReal) => t.estado_real === 'Finalizado' && (t.flujo ?? 'DISENO') === 'DISENO'
  const porArea = (t: TicketEstadoReal) => !areaFiltro || t.area === areaFiltro
  const porDictaminar = tickets.filter((t) => esPorDictaminar(t) && porArea(t))
  const historialCompleto = tickets.filter((t) => !esPorDictaminar(t))

  const hayFiltrosActivos = Boolean(busqueda || desde || hasta || decisionFiltro || flujoFiltro || areaFiltro)

  function limpiarFiltros() {
    setBusqueda('')
    setDesde('')
    setHasta('')
    setDecisionFiltro('')
    setFlujoFiltro('')
    setAreaFiltro('')
  }

  const historial = useMemo(
    () =>
      historialCompleto.filter((t) => {
        if (busqueda) {
          const campos = muestraAsignacion
            ? [t.tipo_solicitud, t.disenador, t.solicitante, etiquetaEstado(t.estado_real, 'jefe')]
            : [t.tipo_solicitud, t.solicitante, etiquetaEstado(t.estado_real, 'jefe')]
          const coincide = coincideCodigo(t.codigo, busqueda) || campos.some((campo) => coincideTexto(campo, busqueda))
          if (!coincide) return false
        }
        const fecha = (t.fecha_registro ?? '').slice(0, 10)
        if (desde && fecha < desde) return false
        if (hasta && fecha > hasta) return false
        if (decisionFiltro && t.estado_real !== decisionFiltro) return false
        if (flujoFiltro && t.flujo !== flujoFiltro) return false
        if (areaFiltro && t.area !== areaFiltro) return false
        return true
      }),
    [historialCompleto, busqueda, desde, hasta, decisionFiltro, flujoFiltro, areaFiltro, muestraAsignacion],
  )

  const columnasExportar: ColumnaExportar<TicketEstadoReal>[] = [
    { etiqueta: 'Código', valor: (t) => t.codigo },
    { etiqueta: 'Tipo', valor: (t) => t.tipo_solicitud },
    { etiqueta: 'Flujo', valor: etiquetaFlujo },
    ...(tieneJefaturas ? [{ etiqueta: 'Área', valor: (t: TicketEstadoReal) => t.area ?? '—' }] : []),
    ...(muestraAsignacion
      ? [{ etiqueta: 'Diseñador', valor: (t: TicketEstadoReal) => textoDisenador(t, muestraAsignacion) }]
      : []),
    { etiqueta: 'Estado', valor: (t) => etiquetaEstado(t.estado_real, 'jefe') },
    { etiqueta: 'Registrado', valor: (t) => formatFecha(t.fecha_registro) },
    { etiqueta: 'Fecha límite', valor: (t) => formatFecha(t.fecha_limite) },
  ]

  function exportarCsv() {
    setExportarAbierto(false)
    exportarCSV(historial, columnasExportar, `historial_dictamenes_${Date.now()}.csv`)
  }

  function exportarPdf() {
    setExportarAbierto(false)
    const area = tieneJefaturas ? 'Varias coordinaciones' : tickets[0]?.area ?? ''
    const filtrosTexto = [
      areaFiltro ? `Área: ${areaFiltro}` : null,
      desde || hasta ? `Rango: ${desde || '—'} a ${hasta || '—'}` : null,
      decisionFiltro ? `Decisión: ${decisionFiltro}` : null,
      flujoFiltro ? `Flujo: ${ETIQUETA_FLUJO[flujoFiltro as Flujo]}` : null,
      busqueda ? `Búsqueda: "${busqueda}"` : null,
    ].filter(Boolean)
    exportarPDF({
      titulo: `Historial de dictámenes – ${area}`,
      subtitulo: filtrosTexto.length > 0 ? filtrosTexto.join(' · ') : 'Sin filtros adicionales',
      columnas: columnasExportar,
      filas: historial,
      nombreArchivo: `historial_dictamenes_${Date.now()}.pdf`,
    })
  }

  async function manejarConfirmar(decision: DecisionJefe, comentario?: string) {
    if (!ticketDictamen) return
    try {
      await crearDictamen(ticketDictamen.ticket_id!, decision, comentario)
      toast.success(decision === 'APROBADO' ? 'Ticket aprobado.' : 'Se solicitó corrección.')
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
      // El detalle tiene su propia clave: después de una corrección puede cambiar la fecha límite (Parte 53).
      void queryClient.invalidateQueries({ queryKey: ['ticket-detalle', ticketDictamen.ticket_id] })
      setTicketDictamen(null)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo registrar el dictamen.'))
    }
  }

  if (isLoading) return <SkeletonLista filas={4} />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-azul-noche">Por dictaminar</h1>
          <p className="text-sm text-tinta-suave">Tienes 24 horas hábiles desde la entrega para aprobar o pedir corrección.</p>
        </div>
        {tieneJefaturas && (
          <label className="text-xs text-tinta-suave">
            Área / Coordinación
            <select className={`${CLASE_INPUT} mt-1 w-auto`} value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)}>
              <option value="">Todas</option>
              {areasDisponibles.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {porDictaminar.length === 0 ? (
        <EmptyState titulo="No hay tickets esperando dictamen" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {porDictaminar.map((ticket) => {
            const bloqueadoPorHorario = !ticket.es_excepcional && !esAdmin && horarioHabil === false
            return (
              <article
                key={ticket.ticket_id}
                {...propsCardEnlace(`/tickets/${ticket.ticket_id}`, navigate)}
                aria-label={`Ticket ${ticket.codigo}`}
                className={`rounded-xl ${CLASE_CARD_ENLACE}`}
              >
              <Card className="flex h-full flex-col space-y-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-azul-noche">
                      {ticket.codigo} · {ticket.tipo_solicitud}
                    </span>
                    {ticket.es_excepcional && <BadgeExcepcional ticketId={ticket.ticket_id} />}
                  </div>
                  {tieneJefaturas && <p className="text-xs text-tinta-suave">{ticket.area}</p>}
                  {muestraAsignacion && <p className="text-xs text-tinta-suave">{ticket.disenador ?? 'Sin diseñador'}</p>}
                  <p className="text-xs text-tinta-suave">
                    Correcciones {ticket.correcciones_usadas ?? 0}/{ticket.correcciones_maximas ?? 5}
                  </p>
                </div>
                <CronometroDictamen
                  minutos={ticket.minutos_habiles_restantes_dictamen}
                  fechaAprobacion={ticket.fecha_aprobacion_automatica}
                />
                <div className="mt-auto flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={bloqueadoPorHorario}
                    title={bloqueadoPorHorario ? 'Los dictámenes solo se hacen en horario hábil.' : undefined}
                    onClick={(e) => {
                      e.stopPropagation()
                      setTicketDictamen(ticket)
                    }}
                  >
                    Dictaminar
                  </Button>
                  <Button
                    variante="fantasma"
                    className="flex-1 border border-azul-institucional text-azul-institucional"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/tickets/${ticket.ticket_id}`)
                    }}
                  >
                    Ver detalles
                  </Button>
                </div>
              </Card>
              </article>
            )
          })}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-suave">
          {tieneJefaturas ? 'Historial de varias coordinaciones' : 'Historial del área'}
        </h2>

        <Card className="mb-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-tinta-suave">
            Buscar
            <div className="relative mt-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
              <input
                className={`${CLASE_INPUT} w-56 pl-8`}
                placeholder={muestraAsignacion ? 'Código, tipo, diseñador, solicitante, estado' : 'Código, tipo, solicitante, estado'}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </label>
          <label className="text-xs text-tinta-suave">
            Desde
            <FechaInput className="mt-1 w-40" valor={desde} onCambiar={setDesde} />
          </label>
          <label className="text-xs text-tinta-suave">
            Hasta
            <FechaInput className="mt-1 w-40" valor={hasta} onCambiar={setHasta} />
          </label>
          <label className="text-xs text-tinta-suave">
            Decisión
            <select
              className={`${CLASE_INPUT} mt-1 w-auto`}
              value={decisionFiltro}
              onChange={(e) => setDecisionFiltro(e.target.value)}
            >
              <option value="">Todas</option>
              {DECISIONES.map((d) => (
                <option key={d} value={d}>
                  {etiquetaEstado(d, 'jefe')}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-tinta-suave">
            Flujo
            <select className={`${CLASE_INPUT} mt-1 w-auto`} value={flujoFiltro} onChange={(e) => setFlujoFiltro(e.target.value)}>
              <option value="">Todos</option>
              {(Object.keys(ETIQUETA_FLUJO) as Flujo[]).map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETA_FLUJO[valor]}
                </option>
              ))}
            </select>
          </label>
          <Button
            variante="secundario"
            className="border border-azul-niebla shadow-sm hover:bg-azul-niebla/60"
            disabled={!hayFiltrosActivos}
            onClick={limpiarFiltros}
          >
            <X size={14} /> Limpiar filtros
          </Button>
          <div className="relative ml-auto" ref={exportarRef}>
            <Button variante="secundario" onClick={() => setExportarAbierto((v) => !v)}>
              <Download size={14} /> Exportar <ChevronDown size={14} />
            </Button>
            {exportarAbierto && (
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-azul-niebla bg-white p-1 shadow-xl">
                <button
                  type="button"
                  onClick={exportarCsv}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-tinta hover:bg-azul-niebla"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  type="button"
                  onClick={exportarPdf}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-tinta hover:bg-azul-niebla"
                >
                  <FileDown size={14} /> PDF
                </button>
              </div>
            )}
          </div>
        </Card>

        {historial.length === 0 ? (
          <EmptyState titulo="No hay registros con estos filtros" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-azul-niebla bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
                <tr>
                  <th className="px-4 py-2">Ticket</th>
                  <th className="px-4 py-2">Tipo</th>
                  {tieneJefaturas && <th className="px-4 py-2">Área</th>}
                  {muestraAsignacion && <th className="px-4 py-2">Diseñador</th>}
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Fecha límite</th>
                  <th className="px-4 py-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-azul-niebla/60">
                {historial.map((ticket) => (
                  <tr key={ticket.ticket_id}>
                    <td className="whitespace-nowrap px-4 py-2">
                      <Link to={`/tickets/${ticket.ticket_id}`} className="font-mono text-azul-institucional hover:underline">
                        {ticket.codigo}
                      </Link>
                      {ticket.es_excepcional && (
                        <span className="ml-1.5">
                          <BadgeExcepcional ticketId={ticket.ticket_id} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {ticket.tipo_solicitud}
                      {TAG_FLUJO[ticket.flujo as Flujo] && (
                        <span className="ml-1.5 rounded-full bg-indigo-bruma px-2 py-0.5 text-xs text-indigo-suave">
                          {TAG_FLUJO[ticket.flujo as Flujo]}
                        </span>
                      )}
                    </td>
                    {tieneJefaturas && <td className="px-4 py-2">{ticket.area}</td>}
                    {muestraAsignacion && <td className="px-4 py-2">{textoDisenador(ticket, muestraAsignacion)}</td>}
                    <td className="px-4 py-2">
                      <EstadoChip estado={ticket.estado_real ?? ''} perspectiva="jefe" />
                    </td>
                    <td className="px-4 py-2">{formatFecha(ticket.fecha_limite)}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {puedePedirCambioUrgente(ticket, areasQueDirige, cambiosDelTicket(ticket.ticket_id)) && (
                        <Button variante="secundario" className="px-2.5 py-1 text-xs" onClick={() => setTicketCambioUrgente(ticket)}>
                          <Zap size={12} /> Cambio urgente
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CambioUrgenteModal ticket={ticketCambioUrgente} onCerrar={() => setTicketCambioUrgente(null)} />

      {ticketDictamen && (
        <DictamenModal
          abierto
          codigo={ticketDictamen.codigo ?? ''}
          correccionesUsadas={ticketDictamen.correcciones_usadas ?? 0}
          onCerrar={() => setTicketDictamen(null)}
          onConfirmar={manejarConfirmar}
        />
      )}
    </div>
  )
}
