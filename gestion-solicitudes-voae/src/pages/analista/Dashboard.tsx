import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronDown, Download, FileDown, Search, X } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { obtenerAlcancePorTicket, obtenerEstadisticas, type FilaEstadistica } from '../../data/estadisticas'
import { TEXTO_COBERTURA_NACIONAL } from '../../lib/campus'
import { etiquetaEstado } from '../../lib/estados'
import { listarAreas, listarTiposSolicitud } from '../../data/catalogos'
import { formatFecha, hoyTegucigalpaISO, mesTegucigalpa } from '../../lib/date'
import { coincideCodigo, coincideTexto } from '../../lib/buscar'
import { exportarCSV, exportarPDF, type ColumnaExportar } from '../../lib/exportar'
import { INTENTOS_MAXIMOS_IA } from '../../data/afichesIA'
import { ETIQUETA_FLUJO, TAG_FLUJO, type Flujo } from '../../types/domain'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { FechaInput } from '../../components/ui/FechaInput'
import { EstadoChip } from '../../components/EstadoChip'
import { BadgeExcepcional } from '../../components/BadgeExcepcional'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonLista } from '../../components/ui/Skeleton'

const COLOR_POR_ESTADO: Record<string, string> = {
  Enviado: 'var(--color-azul-medio)',
  'En revisión': 'var(--color-indigo-suave)',
  'En proceso': 'var(--color-azul-institucional)',
  Finalizado: 'var(--color-violeta)',
  Corrección: 'var(--color-ambar)',
  Aprobado: 'var(--color-menta-profundo)',
  'Aprobado (Automático)': 'var(--color-menta-profundo)',
  Retrasado: 'var(--color-coral)',
  Rechazado: 'var(--color-tinta-suave)',
}

const ATAJOS = [
  { clave: 'este-mes', etiqueta: 'Este mes' },
  { clave: 'mes-anterior', etiqueta: 'Mes anterior' },
  { clave: 'ultimos-3-meses', etiqueta: 'Últimos 3 meses' },
  { clave: 'este-anio', etiqueta: 'Este año' },
  { clave: 'personalizado', etiqueta: 'Personalizado' },
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function calcularRango(atajo: string): { desde: string; hasta: string } {
  const [anio, mes] = hoyTegucigalpaISO().split('-').map(Number)
  const hoy = hoyTegucigalpaISO()

  if (atajo === 'mes-anterior') {
    const mesAnterior = mes === 1 ? 12 : mes - 1
    const anioAnterior = mes === 1 ? anio - 1 : anio
    const ultimoDia = new Date(anioAnterior, mesAnterior, 0).getDate()
    return { desde: `${anioAnterior}-${pad(mesAnterior)}-01`, hasta: `${anioAnterior}-${pad(mesAnterior)}-${pad(ultimoDia)}` }
  }
  if (atajo === 'ultimos-3-meses') {
    let m = mes - 3
    let a = anio
    if (m <= 0) {
      m += 12
      a -= 1
    }
    return { desde: `${a}-${pad(m)}-01`, hasta: hoy }
  }
  if (atajo === 'este-anio') {
    return { desde: `${anio}-01-01`, hasta: hoy }
  }
  // este-mes (por defecto)
  return { desde: `${anio}-${pad(mes)}-01`, hasta: hoy }
}

const FILAS_POR_PAGINA = 20

export function AnalistaDashboard() {
  const [params, setParams] = useSearchParams()
  const [pagina, setPagina] = useState(1)
  const [orden, setOrden] = useState<{ columna: keyof FilaEstadistica; asc: boolean }>({ columna: 'ticket_id', asc: false })
  const [busqueda, setBusqueda] = useState('')
  const [exportarAbierto, setExportarAbierto] = useState(false)
  const esMovil = useEsMovil()
  const anchoEjeY = esMovil ? 130 : 250
  const anchoTick = esMovil ? 120 : 240
  const exportarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportarAbierto) return
    function alHacerClicFuera(evento: MouseEvent) {
      if (exportarRef.current && !exportarRef.current.contains(evento.target as Node)) setExportarAbierto(false)
    }
    document.addEventListener('mousedown', alHacerClicFuera)
    return () => document.removeEventListener('mousedown', alHacerClicFuera)
  }, [exportarAbierto])

  const atajo = params.get('atajo') ?? 'este-mes'
  const rangoAtajo = atajo === 'personalizado' ? null : calcularRango(atajo)
  const desde = rangoAtajo?.desde ?? params.get('desde') ?? ''
  const hasta = rangoAtajo?.hasta ?? params.get('hasta') ?? hoyTegucigalpaISO()
  const areaId = params.get('area') ? Number(params.get('area')) : null
  const tipoId = params.get('tipo') ? Number(params.get('tipo')) : null
  const estadoFiltro = params.get('estado') ?? ''
  const disenadorFiltro = params.get('disenador') ?? ''
  // La RPC no filtra por flujo: se filtra en el cliente, igual que estado y diseñador.
  const flujoFiltro = params.get('flujo') ?? ''
  // El alcance tampoco viene en la RPC: se lee aparte por ticket y se filtra en el cliente.
  const alcanceFiltro = params.get('alcance') ?? ''

  function actualizarFiltro(clave: string, valor: string) {
    const siguiente = new URLSearchParams(params)
    if (valor) siguiente.set(clave, valor)
    else siguiente.delete(clave)
    setParams(siguiente, { replace: true })
    setPagina(1)
  }

  const hayFiltrosActivos = params.size > 0 || busqueda.trim() !== ''

  function limpiarFiltros() {
    setParams(new URLSearchParams(), { replace: true })
    setBusqueda('')
    setPagina(1)
  }

  const { data: areas = [] } = useQuery({ queryKey: ['catalogos', 'areas'], queryFn: listarAreas })
  const { data: tipos = [] } = useQuery({ queryKey: ['catalogos', 'tipos-solicitud'], queryFn: listarTiposSolicitud })

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ['estadisticas', desde, hasta, areaId, tipoId],
    queryFn: () => obtenerEstadisticas({ desde: desde || null, hasta: hasta || null, areaId, tipoSolicitudId: tipoId }),
  })

  const { data: alcancePorTicket } = useQuery({
    queryKey: ['estadisticas', 'alcance', desde, hasta, areaId, tipoId],
    queryFn: () => obtenerAlcancePorTicket(filas.map((f) => f.ticket_id)),
    enabled: filas.length > 0,
  })
  const alcancesDisponibles = useMemo(() => {
    const nombres = Array.from(new Set(Array.from(alcancePorTicket?.values() ?? []).flat()))
    // "Cobertura nacional" primero, como en el formulario.
    return nombres.sort((a, b) =>
      a === TEXTO_COBERTURA_NACIONAL ? -1 : b === TEXTO_COBERTURA_NACIONAL ? 1 : a.localeCompare(b),
    )
  }, [alcancePorTicket])

  const estadosDisponibles = useMemo(() => Array.from(new Set(filas.map((f) => f.estado_real))).sort(), [filas])
  const disenadoresDisponibles = useMemo(
    () => Array.from(new Set(filas.map((f) => f.disenador).filter(Boolean))).sort(),
    [filas],
  )

  const filasFiltradas = useMemo(
    () =>
      filas.filter(
        (f) =>
          (!estadoFiltro || f.estado_real === estadoFiltro) &&
          (!disenadorFiltro || f.disenador === disenadorFiltro) &&
          (!flujoFiltro || f.flujo === flujoFiltro) &&
          (!alcanceFiltro || (alcancePorTicket?.get(f.ticket_id) ?? []).includes(alcanceFiltro)),
      ),
    [filas, estadoFiltro, disenadorFiltro, flujoFiltro, alcanceFiltro, alcancePorTicket],
  )

  const kpis = useMemo(() => {
    const total = filasFiltradas.length
    const conEntrega = filasFiltradas.filter((f) => f.entregado_a_tiempo != null)
    const aTiempo = conEntrega.filter((f) => f.entregado_a_tiempo)
    const conDiasResolucion = filasFiltradas.filter((f) => f.dias_resolucion != null)
    const retrasadas = filasFiltradas.filter((f) => f.estado_real === 'Retrasado').length
    const enCurso = filasFiltradas.filter((f) =>
      ['Enviado', 'En revisión', 'En proceso', 'Corrección'].includes(f.estado_real ?? ''),
    ).length
    const aprobadas = filasFiltradas.filter((f) => f.estado_real === 'Aprobado' || f.estado_real === 'Aprobado (Automático)')
    const automaticas = filasFiltradas.filter((f) => f.aprobado_automatico).length
    const conCorreccion = filasFiltradas.filter((f) => (f.correcciones_usadas ?? 0) > 0).length

    const excepcionales = filasFiltradas.filter((f) => f.es_excepcional)
    const excepcionalesRechazadas = excepcionales.filter((f) => f.estado_real === 'Rechazado').length
    const excepcionalesPendientes = excepcionales.filter((f) => f.estado_real === 'Enviado').length
    const excepcionalesResueltas = excepcionales.length - excepcionalesPendientes
    const excepcionalesAceptadas = excepcionalesResueltas - excepcionalesRechazadas

    return {
      total,
      pctATiempo: conEntrega.length > 0 ? Math.round((aTiempo.length / conEntrega.length) * 100) : null,
      promedioDias:
        conDiasResolucion.length > 0
          ? (conDiasResolucion.reduce((acc, f) => acc + (f.dias_resolucion ?? 0), 0) / conDiasResolucion.length).toFixed(1)
          : null,
      retrasadas,
      enCurso,
      aprobadas: aprobadas.length,
      automaticas,
      pctConCorreccion: total > 0 ? Math.round((conCorreccion / total) * 100) : 0,
      excepcionales: excepcionales.length,
      pctExcepcionalesAceptadas:
        excepcionalesResueltas > 0 ? Math.round((excepcionalesAceptadas / excepcionalesResueltas) * 100) : null,
    }
  }, [filasFiltradas])

  const datosPorMes = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const f of filasFiltradas) {
      const mes = mesTegucigalpa(f.fecha_registro)
      conteo.set(mes, (conteo.get(mes) ?? 0) + 1)
    }
    return Array.from(conteo.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({ mes, total }))
  }, [filasFiltradas])

  const datosPorTipo = useMemo(() => contarPor(filasFiltradas, (f) => f.tipo_solicitud), [filasFiltradas])
  const datosPorArea = useMemo(() => contarPor(filasFiltradas, (f) => f.area), [filasFiltradas])
  // Un ticket con varios campus suma en cada uno; "Cobertura nacional" es una sola barra.
  const datosPorAlcance = useMemo(() => {
    const conteos = new Map<string, number>()
    for (const f of filasFiltradas) {
      for (const nombre of alcancePorTicket?.get(f.ticket_id) ?? []) conteos.set(nombre, (conteos.get(nombre) ?? 0) + 1)
    }
    return Array.from(conteos.entries())
      .map(([etiqueta, valor]) => ({ etiqueta, valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [filasFiltradas, alcancePorTicket])
  // Se cuenta por estado real (el color sale de ahí) y se muestra con la etiqueta de administración.
  const datosPorEstado = useMemo(
    () =>
      contarPor(filasFiltradas, (f) => f.estado_real).map((d) => ({
        ...d,
        estado: d.etiqueta,
        etiqueta: etiquetaEstado(d.etiqueta, 'admin'),
      })),
    [filasFiltradas],
  )

  const cumplimientoPorTipo = useMemo(() => {
    const grupos = new Map<string, { aTiempo: number; tarde: number }>()
    for (const f of filasFiltradas) {
      if (f.entregado_a_tiempo == null) continue
      const clave = f.tipo_solicitud ?? '—'
      const actual = grupos.get(clave) ?? { aTiempo: 0, tarde: 0 }
      if (f.entregado_a_tiempo) actual.aTiempo++
      else actual.tarde++
      grupos.set(clave, actual)
    }
    return Array.from(grupos.entries()).map(([tipo, { aTiempo, tarde }]) => {
      const total = aTiempo + tarde
      return {
        tipo,
        aTiempo: total > 0 ? Math.round((aTiempo / total) * 100) : 0,
        tarde: total > 0 ? Math.round((tarde / total) * 100) : 0,
      }
    })
  }, [filasFiltradas])

  const cargaPorDisenador = useMemo(() => {
    const grupos = new Map<string, { asignados: number; aTiempo: number; sumaDias: number; conDias: number }>()
    for (const f of filasFiltradas) {
      if (!f.disenador) continue
      const actual = grupos.get(f.disenador) ?? { asignados: 0, aTiempo: 0, sumaDias: 0, conDias: 0 }
      actual.asignados++
      if (f.entregado_a_tiempo) actual.aTiempo++
      if (f.dias_resolucion != null) {
        actual.sumaDias += f.dias_resolucion
        actual.conDias++
      }
      grupos.set(f.disenador, actual)
    }
    return Array.from(grupos.entries()).map(([disenador, g]) => ({
      disenador,
      asignados: g.asignados,
      aTiempo: g.aTiempo,
      promedioDias: g.conDias > 0 ? Number((g.sumaDias / g.conDias).toFixed(1)) : 0,
    }))
  }, [filasFiltradas])

  const filasOrdenadas = useMemo(() => {
    const copia = [...filasFiltradas]
    copia.sort((a, b) => {
      const va = a[orden.columna]
      const vb = b[orden.columna]
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === 'number' ? va - (vb as number) : String(va).localeCompare(String(vb))
      return orden.asc ? cmp : -cmp
    })
    return copia
  }, [filasFiltradas, orden])

  const filasDetalle = useMemo(() => {
    if (!busqueda.trim()) return filasOrdenadas
    return filasOrdenadas.filter(
      (f) =>
        coincideCodigo(f.codigo, busqueda) ||
        [f.tipo_solicitud, f.area, f.disenador].some((v) => coincideTexto(v, busqueda)),
    )
  }, [filasOrdenadas, busqueda])

  const totalPaginas = Math.max(1, Math.ceil(filasDetalle.length / FILAS_POR_PAGINA))
  const filasPagina = filasDetalle.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA)

  function alternarOrden(columna: keyof FilaEstadistica) {
    setOrden((prev) => (prev.columna === columna ? { columna, asc: !prev.asc } : { columna, asc: true }))
  }

  function filtrosAplicadosTexto(): string {
    const partes = [
      areaId ? `Área: ${areas.find((a) => a.id === areaId)?.nombre ?? areaId}` : null,
      tipoId ? `Tipo: ${tipos.find((t) => t.id === tipoId)?.nombre ?? tipoId}` : null,
      estadoFiltro ? `Estado: ${etiquetaEstado(estadoFiltro, 'admin')}` : null,
      disenadorFiltro ? `Diseñador: ${disenadorFiltro}` : null,
      alcanceFiltro ? `Alcance: ${alcanceFiltro}` : null,
      flujoFiltro ? `Flujo: ${ETIQUETA_FLUJO[flujoFiltro as Flujo] ?? flujoFiltro}` : null,
      busqueda ? `Búsqueda: "${busqueda}"` : null,
    ].filter(Boolean)
    return partes.length > 0 ? partes.join(' · ') : 'Sin filtros adicionales'
  }

  const columnasExportar: ColumnaExportar<FilaEstadistica>[] = [
    { etiqueta: 'Código', valor: (f) => f.codigo },
    { etiqueta: 'Tipo', valor: (f) => f.tipo_solicitud },
    { etiqueta: 'Flujo', valor: (f) => ETIQUETA_FLUJO[f.flujo as Flujo] ?? f.flujo },
    { etiqueta: 'Área', valor: (f) => f.area },
    { etiqueta: 'Alcance', valor: (f) => (alcancePorTicket?.get(f.ticket_id) ?? []).join(', ') || '—' },
    { etiqueta: 'Estado', valor: (f) => etiquetaEstado(f.estado_real, 'admin') },
    { etiqueta: 'Diseñador', valor: (f) => f.disenador ?? '—' },
    { etiqueta: 'Registrado', valor: (f) => formatFecha(f.fecha_registro) },
    { etiqueta: 'Límite', valor: (f) => formatFecha(f.fecha_limite) },
    { etiqueta: 'Entrega', valor: (f) => formatFecha(f.fecha_entrega_diseno) },
    { etiqueta: 'Evento', valor: (f) => formatFecha(f.fecha_evento) },
    { etiqueta: 'Días resolución', valor: (f) => f.dias_resolucion ?? '—' },
    { etiqueta: 'A tiempo', valor: (f) => (f.entregado_a_tiempo == null ? '—' : f.entregado_a_tiempo ? 'Sí' : 'No') },
    { etiqueta: 'Correcciones', valor: (f) => f.correcciones_usadas ?? 0 },
    { etiqueta: 'Intentos IA', valor: (f) => (f.flujo === 'APROBACION_IA' ? `${f.intentos_usados ?? 0}/${INTENTOS_MAXIMOS_IA}` : '—') },
    { etiqueta: 'Automático', valor: (f) => (f.aprobado_automatico ? 'Sí' : 'No') },
    { etiqueta: 'Excepcional', valor: (f) => (f.es_excepcional ? 'Sí' : 'No') },
  ]

  function exportarCsv() {
    setExportarAbierto(false)
    exportarCSV(filasDetalle, columnasExportar, `estadisticas_voae_${hoyTegucigalpaISO()}.csv`)
  }

  function exportarPdf() {
    setExportarAbierto(false)
    exportarPDF({
      titulo: 'Estadísticas de solicitudes VOAE',
      subtitulo: [
        `Rango: ${desde || '—'} a ${hasta || '—'}`,
        `Filtros: ${filtrosAplicadosTexto()}`,
        `Total: ${kpis.total}  ·  % a tiempo: ${kpis.pctATiempo ?? '—'}  ·  Promedio días: ${kpis.promedioDias ?? '—'}  ·  ` +
          `Retrasadas: ${kpis.retrasadas}  ·  En curso: ${kpis.enCurso}  ·  Aprobadas: ${kpis.aprobadas} (${kpis.automaticas} auto.)  ·  ` +
          `% con corrección: ${kpis.pctConCorreccion}%  ·  Excepcionales: ${kpis.excepcionales} (${kpis.pctExcepcionalesAceptadas ?? '—'}% aceptadas)`,
      ],
      columnas: columnasExportar,
      filas: filasDetalle,
      nombreArchivo: `estadisticas_voae_${hoyTegucigalpaISO()}.pdf`,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Estadísticas</h1>
        <p className="text-sm text-tinta-suave">Estadísticas de todas las solicitudes, sin ver su contenido.</p>
      </div>

      <Card className="sticky top-0 z-20 flex flex-wrap items-end gap-3 border border-azul-niebla shadow-md">
        <label className="text-xs text-tinta-suave">
          Rango
          <select
            className={`${CLASE_INPUT} mt-1 w-auto`}
            value={atajo}
            onChange={(e) => actualizarFiltro('atajo', e.target.value)}
          >
            {ATAJOS.map((a) => (
              <option key={a.clave} value={a.clave}>
                {a.etiqueta}
              </option>
            ))}
          </select>
        </label>

        {atajo === 'personalizado' && (
          <>
            <label className="text-xs text-tinta-suave">
              Desde
              <FechaInput className="mt-1 w-40" valor={desde} onCambiar={(fecha) => actualizarFiltro('desde', fecha)} />
            </label>
            <label className="text-xs text-tinta-suave">
              Hasta
              <FechaInput className="mt-1 w-40" valor={hasta} onCambiar={(fecha) => actualizarFiltro('hasta', fecha)} />
            </label>
          </>
        )}

        <label className="text-xs text-tinta-suave">
          Área
          <select
            className={`${CLASE_INPUT} mt-1 w-auto`}
            value={areaId ?? ''}
            onChange={(e) => actualizarFiltro('area', e.target.value)}
          >
            <option value="">Todas</option>
            {/* Las inactivas sí se ofrecen (tienen tickets históricos), pero marcadas. */}
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
                {a.estado ? '' : ' (inactiva)'}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-tinta-suave">
          Tipo
          <select
            className={`${CLASE_INPUT} mt-1 w-auto`}
            value={tipoId ?? ''}
            onChange={(e) => actualizarFiltro('tipo', e.target.value)}
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-tinta-suave">
          Flujo
          <select
            className={`${CLASE_INPUT} mt-1 w-auto`}
            value={flujoFiltro}
            onChange={(e) => actualizarFiltro('flujo', e.target.value)}
          >
            <option value="">Todos</option>
            {(Object.keys(ETIQUETA_FLUJO) as Flujo[]).map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETA_FLUJO[valor]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-tinta-suave">
          Alcance
          <select
            className={`${CLASE_INPUT} mt-1 w-auto`}
            value={alcanceFiltro}
            onChange={(e) => actualizarFiltro('alcance', e.target.value)}
          >
            <option value="">Todos</option>
            {alcancesDisponibles.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-tinta-suave">
          Estado
          <select
            className={`${CLASE_INPUT} mt-1 w-auto`}
            value={estadoFiltro}
            onChange={(e) => actualizarFiltro('estado', e.target.value)}
          >
            <option value="">Todos</option>
            {estadosDisponibles.map((e) => (
              <option key={e} value={e ?? ''}>
                {etiquetaEstado(e, 'admin')}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-tinta-suave">
          Diseñador
          <select
            className={`${CLASE_INPUT} mt-1 w-auto`}
            value={disenadorFiltro}
            onChange={(e) => actualizarFiltro('disenador', e.target.value)}
          >
            <option value="">Todos</option>
            {disenadoresDisponibles.map((d) => (
              <option key={d} value={d ?? ''}>
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
      </Card>

      {isLoading ? (
        <SkeletonLista filas={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Kpi etiqueta="Total" valor={kpis.total} color="azul" />
            <Kpi etiqueta="% a tiempo" valor={kpis.pctATiempo != null ? `${kpis.pctATiempo}%` : '—'} color="menta" />
            <Kpi etiqueta="Promedio días resolución" valor={kpis.promedioDias ?? '—'} color="azul" />
            <Kpi etiqueta="Retrasadas" valor={kpis.retrasadas} color="coral" />
            <Kpi etiqueta="En curso" valor={kpis.enCurso} color="azul" />
            <Kpi etiqueta="Aprobadas" valor={kpis.aprobadas} detalle={`${kpis.automaticas} auto.`} color="menta" />
            <Kpi etiqueta="% con corrección" valor={`${kpis.pctConCorreccion}%`} color="ambar" />
            <Kpi
              etiqueta="Excepcionales"
              valor={kpis.excepcionales}
              detalle={`${kpis.pctExcepcionalesAceptadas ?? '—'}% aceptadas`}
              color="ambar"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GraficoCard titulo="Solicitudes por mes" vacio={datosPorMes.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={datosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-azul-niebla)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" name="Solicitudes" stroke="var(--color-azul-institucional)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Por tipo de solicitud" vacio={datosPorTipo.length === 0}>
              <ResponsiveContainer width="100%" height={altoBarrasHorizontal(datosPorTipo.length)}>
                <BarChart
                  data={datosPorTipo}
                  layout="vertical"
                  margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-azul-niebla)" />
                  <XAxis type="number" allowDecimals={false} tickMargin={8} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="etiqueta"
                    width={anchoEjeY}
                    interval={0}
                    tickLine={false}
                    tick={<TickEnvuelto ancho={anchoTick} />}
                  />
                  <Tooltip />
                  <Bar dataKey="valor" name="Solicitudes" fill="var(--color-azul-medio)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Por área" vacio={datosPorArea.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={datosPorArea} dataKey="valor" nameKey="etiqueta" innerRadius={60} outerRadius={90}>
                    {datosPorArea.map((_, indice) => (
                      <Cell key={indice} fill={PALETA_DONA[indice % PALETA_DONA.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Por alcance" vacio={datosPorAlcance.length === 0}>
              <ResponsiveContainer width="100%" height={altoBarrasHorizontal(datosPorAlcance.length)}>
                <BarChart
                  data={datosPorAlcance}
                  layout="vertical"
                  margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-azul-niebla)" />
                  <XAxis type="number" allowDecimals={false} tickMargin={8} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="etiqueta"
                    width={anchoEjeY}
                    interval={0}
                    tickLine={false}
                    tick={<TickEnvuelto ancho={anchoTick} />}
                  />
                  <Tooltip />
                  <Bar dataKey="valor" name="Solicitudes" fill="var(--color-menta-profundo)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Distribución por estado" vacio={datosPorEstado.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={datosPorEstado} dataKey="valor" nameKey="etiqueta" innerRadius={60} outerRadius={90}>
                    {datosPorEstado.map((dato, indice) => (
                      <Cell key={indice} fill={COLOR_POR_ESTADO[dato.estado] ?? 'var(--color-tinta-suave)'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Cumplimiento a tiempo por tipo" vacio={cumplimientoPorTipo.length === 0}>
              <ResponsiveContainer width="100%" height={altoBarrasHorizontal(cumplimientoPorTipo.length)}>
                <BarChart
                  data={cumplimientoPorTipo}
                  layout="vertical"
                  margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-azul-niebla)" />
                  <XAxis type="number" unit="%" tickMargin={8} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="tipo"
                    width={anchoEjeY}
                    interval={0}
                    tickLine={false}
                    tick={<TickEnvuelto ancho={anchoTick} />}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="aTiempo" name="A tiempo" stackId="a" fill="var(--color-menta)" />
                  <Bar dataKey="tarde" name="Tarde" stackId="a" fill="var(--color-coral)" />
                </BarChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Carga por diseñador" vacio={cargaPorDisenador.length === 0}>
              <ResponsiveContainer width="100%" height={altoBarrasHorizontal(cargaPorDisenador.length)}>
                <BarChart
                  data={cargaPorDisenador}
                  layout="vertical"
                  margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-azul-niebla)" />
                  <XAxis type="number" allowDecimals={false} tickMargin={8} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="disenador"
                    width={anchoEjeY}
                    interval={0}
                    tickLine={false}
                    tick={<TickEnvuelto ancho={anchoTick} />}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="asignados" name="Asignados" fill="var(--color-azul-institucional)" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="aTiempo" name="A tiempo" fill="var(--color-menta)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GraficoCard>
          </div>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-azul-noche">
                Detalle ({filasDetalle.length} de {filasOrdenadas.length} tickets)
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
                  <input
                    className={`${CLASE_INPUT} w-56 pl-8`}
                    placeholder="Buscar por código (ej. ADH-0001), tipo, área o diseñador"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value)
                      setPagina(1)
                    }}
                  />
                </div>
                <div className="relative" ref={exportarRef}>
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
              </div>
            </div>

            {filasDetalle.length === 0 ? (
              <EmptyState titulo="No hay resultados con estos filtros" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
                      <tr>
                        {(
                          [
                            ['ticket_id', 'Código'],
                            ['tipo_solicitud', 'Tipo'],
                            ['area', 'Área'],
                            ['estado_real', 'Estado'],
                            ['disenador', 'Diseñador'],
                            ['fecha_registro', 'Registrado'],
                            ['fecha_evento', 'Evento'],
                            ['dias_resolucion', 'Días resolución'],
                            ['intentos_usados', 'Intentos IA'],
                          ] as [keyof FilaEstadistica, string][]
                        ).map(([columna, etiqueta]) => (
                          <th key={columna} className="cursor-pointer px-3 py-2" onClick={() => alternarOrden(columna)}>
                            {etiqueta} {orden.columna === columna ? (orden.asc ? '↑' : '↓') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-azul-niebla/60">
                      {filasPagina.map((fila) => (
                        <tr key={fila.ticket_id}>
                          <td className="whitespace-nowrap px-3 py-2 font-mono">
                            <Link to={`/tickets/${fila.ticket_id}`} className="text-azul-institucional hover:underline">
                              {fila.codigo}
                            </Link>
                            {fila.es_excepcional && (
                              <span className="ml-1.5 font-sans">
                                <BadgeExcepcional ticketId={fila.ticket_id} />
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {fila.tipo_solicitud}
                            {TAG_FLUJO[fila.flujo as Flujo] && (
                              <span className="ml-1.5 rounded-full bg-indigo-bruma px-2 py-0.5 text-xs text-indigo-suave">
                                {TAG_FLUJO[fila.flujo as Flujo]}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">{fila.area}</td>
                          <td className="px-3 py-2">
                            <EstadoChip estado={fila.estado_real ?? ''} perspectiva="admin" />
                          </td>
                          <td className="px-3 py-2">{fila.disenador ?? '—'}</td>
                          <td className="px-3 py-2">{formatFecha(fila.fecha_registro)}</td>
                          <td className="px-3 py-2">{formatFecha(fila.fecha_evento)}</td>
                          <td className="px-3 py-2">{fila.dias_resolucion ?? '—'}</td>
                          <td className="px-3 py-2">
                            {fila.flujo === 'APROBACION_IA' ? `${fila.intentos_usados ?? 0}/${INTENTOS_MAXIMOS_IA}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-tinta-suave">
                  <span>
                    Página {pagina} de {totalPaginas}
                  </span>
                  <div className="flex gap-2">
                    <Button variante="fantasma" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button variante="fantasma" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

const PALETA_DONA = [
  'var(--color-azul-institucional)',
  'var(--color-menta)',
  'var(--color-azul-medio)',
  'var(--color-ambar)',
  'var(--color-indigo-suave)',
  'var(--color-coral)',
]

function contarPor<T>(lista: T[], claveFn: (item: T) => string | null | undefined) {
  const conteos = new Map<string, number>()
  for (const item of lista) {
    const clave = claveFn(item) ?? 'Sin dato'
    conteos.set(clave, (conteos.get(clave) ?? 0) + 1)
  }
  return Array.from(conteos.entries())
    .map(([etiqueta, valor]) => ({ etiqueta, valor }))
    .sort((a, b) => b.valor - a.valor)
}

/** `true` por debajo del breakpoint `sm` de Tailwind (640px), para achicar las gráficas en móvil. */
function useEsMovil(): boolean {
  const [esMovil, setEsMovil] = useState(() => window.matchMedia('(max-width: 639px)').matches)
  useEffect(() => {
    const medios = window.matchMedia('(max-width: 639px)')
    const manejar = () => setEsMovil(medios.matches)
    medios.addEventListener('change', manejar)
    return () => medios.removeEventListener('change', manejar)
  }, [])
  return esMovil
}

const PIXELES_POR_BARRA = 44
const ALTO_MINIMO_GRAFICA = 260

/** Altura dinámica para una gráfica de barras horizontales: crece con la cantidad de categorías. */
function altoBarrasHorizontal(cantidad: number): number {
  return Math.max(ALTO_MINIMO_GRAFICA, cantidad * PIXELES_POR_BARRA)
}

const MAX_LINEAS_TICK = 3

interface TickEnvueltoProps {
  x?: number
  y?: number
  payload?: { value: string }
  ancho?: number
}

/** Tick del eje Y que parte una etiqueta larga en hasta 2 líneas (con "…" si no alcanza), para que
 * los nombres de tipo/área/diseñador no se amontonen en las gráficas de barras horizontales. */
function TickEnvuelto({ x = 0, y = 0, payload, ancho = 180 }: TickEnvueltoProps) {
  const valor = String(payload?.value ?? '')
  const palabras = valor.split(' ')
  const lineas: string[] = []
  let actual = ''
  const maxCar = Math.floor(ancho / 7)
  for (const palabra of palabras) {
    if ((actual + ' ' + palabra).trim().length > maxCar) {
      lineas.push(actual.trim())
      actual = palabra
    } else {
      actual += ' ' + palabra
    }
  }
  lineas.push(actual.trim())
  // Hasta 3 líneas (caben en los 44 px de cada barra) para que los nombres largos se lean completos (E-16);
  // solo uno excepcionalmente largo se corta, y el nombre entero sigue en el `<title>` y en el tooltip.
  const visibles = lineas.slice(0, MAX_LINEAS_TICK)
  if (lineas.length > MAX_LINEAS_TICK) visibles[MAX_LINEAS_TICK - 1] += '…'
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{valor}</title>
      {visibles.map((linea, indice) => (
        <text
          key={indice}
          x={-8}
          y={(indice - (visibles.length - 1) / 2) * 14}
          dy={4}
          textAnchor="end"
          className="fill-tinta-suave text-[12px]"
        >
          {linea}
        </text>
      ))}
    </g>
  )
}

/**
 * `detalle` va aparte y en pequeño ("12% aceptadas"): así el número principal tiene el mismo tamaño en
 * todas las tarjetas, sin que un texto largo lo haga saltar de línea.
 */
function Kpi({
  etiqueta,
  valor,
  detalle,
  color,
}: {
  etiqueta: string
  valor: string | number
  detalle?: string
  color: 'azul' | 'menta' | 'coral' | 'ambar'
}) {
  const barra = { azul: 'bg-azul-medio', menta: 'bg-menta', coral: 'bg-coral', ambar: 'bg-ambar' }[color]
  return (
    <Card>
      <p className="text-xs uppercase text-tinta-suave">{etiqueta}</p>
      <p className="font-mono text-2xl font-bold text-azul-noche">
        {valor}
        {detalle && <span className="ml-1.5 font-sans text-xs font-medium text-tinta-suave">({detalle})</span>}
      </p>
      <span className={`mt-1 block h-1 w-8 rounded-full ${barra}`} />
    </Card>
  )
}

function GraficoCard({ titulo, vacio, children }: { titulo: string; vacio: boolean; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-azul-noche">{titulo}</h2>
      {vacio ? <EmptyState titulo="Sin datos para este filtro" /> : children}
    </Card>
  )
}
