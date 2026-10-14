import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, Download, FileDown, Search, X } from 'lucide-react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { crearDictamen } from '../../data/dictamenes'
import { mensajeError } from '../../lib/errors'
import { formatFecha } from '../../lib/date'
import { coincideCodigo, coincideTexto } from '../../lib/buscar'
import { exportarCSV, exportarPDF, type ColumnaExportar } from '../../lib/exportar'
import { useAuth } from '../../auth/useAuth'
import { useHorarioHabil } from '../../hooks/useHorarioHabil'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { FechaInput } from '../../components/ui/FechaInput'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { EstadoChip } from '../../components/EstadoChip'
import { CronometroDictamen } from '../../components/ui/CronometroDictamen'
import { DictamenModal } from '../../components/DictamenModal'
import type { DecisionJefe, TicketEstadoReal } from '../../types/domain'

const DECISIONES = ['Aprobado', 'Corrección', 'Aprobado (Automático)']

export function JefeDashboard() {
  const { data: tickets = [], isLoading } = useTicketsEstadoReal()
  const { tieneRol } = useAuth()
  const horarioHabil = useHorarioHabil()
  const esAdmin = tieneRol('Administrador')
  const queryClient = useQueryClient()
  const [ticketDictamen, setTicketDictamen] = useState<TicketEstadoReal | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [decisionFiltro, setDecisionFiltro] = useState('')
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

  const porDictaminar = tickets.filter((t) => t.estado_real === 'Finalizado')
  const historialCompleto = tickets.filter((t) => t.estado_real !== 'Finalizado')

  const hayFiltrosActivos = Boolean(busqueda || desde || hasta || decisionFiltro)

  function limpiarFiltros() {
    setBusqueda('')
    setDesde('')
    setHasta('')
    setDecisionFiltro('')
  }

  const historial = useMemo(
    () =>
      historialCompleto.filter((t) => {
        if (busqueda) {
          const coincide =
            coincideCodigo(t.codigo, busqueda) ||
            [t.tipo_solicitud, t.disenador, t.solicitante, t.estado_real].some((campo) => coincideTexto(campo, busqueda))
          if (!coincide) return false
        }
        const fecha = (t.fecha_registro ?? '').slice(0, 10)
        if (desde && fecha < desde) return false
        if (hasta && fecha > hasta) return false
        if (decisionFiltro && t.estado_real !== decisionFiltro) return false
        return true
      }),
    [historialCompleto, busqueda, desde, hasta, decisionFiltro],
  )

  const columnasExportar: ColumnaExportar<TicketEstadoReal>[] = [
    { etiqueta: 'Código', valor: (t) => t.codigo },
    { etiqueta: 'Tipo', valor: (t) => t.tipo_solicitud },
    { etiqueta: 'Diseñador', valor: (t) => t.disenador ?? 'Sin asignar' },
    { etiqueta: 'Estado', valor: (t) => t.estado_real },
    { etiqueta: 'Registrado', valor: (t) => formatFecha(t.fecha_registro) },
    { etiqueta: 'Fecha límite', valor: (t) => formatFecha(t.fecha_limite) },
  ]

  function exportarCsv() {
    setExportarAbierto(false)
    exportarCSV(historial, columnasExportar, `historial_dictamenes_${Date.now()}.csv`)
  }

  function exportarPdf() {
    setExportarAbierto(false)
    const area = tickets[0]?.area ?? ''
    const filtrosTexto = [
      desde || hasta ? `Rango: ${desde || '—'} a ${hasta || '—'}` : null,
      decisionFiltro ? `Decisión: ${decisionFiltro}` : null,
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
      setTicketDictamen(null)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo registrar el dictamen.'))
    }
  }

  if (isLoading) return <SkeletonLista filas={4} />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Por dictaminar</h1>
        <p className="text-sm text-tinta-suave">Tienes 24 horas hábiles desde la entrega para aprobar o pedir corrección.</p>
      </div>

      {porDictaminar.length === 0 ? (
        <EmptyState titulo="No hay tickets esperando dictamen" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {porDictaminar.map((ticket) => {
            const bloqueadoPorHorario = !ticket.es_excepcional && !esAdmin && horarioHabil === false
            return (
              <Card key={ticket.ticket_id} className="space-y-3">
                <div>
                  <Link to={`/tickets/${ticket.ticket_id}`} className="font-semibold text-azul-noche hover:underline">
                    {ticket.codigo} · {ticket.tipo_solicitud}
                  </Link>
                  <p className="text-xs text-tinta-suave">{ticket.disenador ?? 'Sin diseñador'}</p>
                  <p className="text-xs text-tinta-suave">
                    Correcciones {ticket.correcciones_usadas ?? 0}/{ticket.correcciones_maximas ?? 5}
                  </p>
                </div>
                <CronometroDictamen
                  minutos={ticket.minutos_habiles_restantes_dictamen}
                  fechaAprobacion={ticket.fecha_aprobacion_automatica}
                />
                <Button
                  variante="secundario"
                  disabled={bloqueadoPorHorario}
                  title={bloqueadoPorHorario ? 'Los dictámenes solo se hacen en horario hábil.' : undefined}
                  onClick={() => setTicketDictamen(ticket)}
                >
                  Dictaminar
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-suave">Historial del área</h2>

        <Card className="mb-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-tinta-suave">
            Buscar
            <div className="relative mt-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
              <input
                className={`${CLASE_INPUT} w-56 pl-8`}
                placeholder="Código, tipo, diseñador, solicitante, estado"
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
                  {d}
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
                  <th className="px-4 py-2">Diseñador</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Fecha límite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-azul-niebla/60">
                {historial.map((ticket) => (
                  <tr key={ticket.ticket_id}>
                    <td className="whitespace-nowrap px-4 py-2">
                      <Link to={`/tickets/${ticket.ticket_id}`} className="font-mono text-azul-institucional hover:underline">
                        {ticket.codigo}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{ticket.tipo_solicitud}</td>
                    <td className="px-4 py-2">{ticket.disenador ?? 'Sin asignar'}</td>
                    <td className="px-4 py-2">
                      <EstadoChip estado={ticket.estado_real ?? ''} />
                    </td>
                    <td className="px-4 py-2">{formatFecha(ticket.fecha_limite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
