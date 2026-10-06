import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
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
import { obtenerEstadisticas, type FilaEstadistica } from '../../data/estadisticas'
import { listarAreas, listarTiposSolicitud } from '../../data/catalogos'
import { useAuth } from '../../auth/useAuth'
import { formatFecha, hoyTegucigalpaISO, mesTegucigalpa } from '../../lib/date'
import { descargarCsv } from '../../lib/csv'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { EstadoChip } from '../../components/EstadoChip'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonLista } from '../../components/ui/Skeleton'

const COLOR_POR_ESTADO: Record<string, string> = {
  Enviado: 'var(--color-azul-medio)',
  'En revisión': 'var(--color-indigo-suave)',
  'En proceso': 'var(--color-azul-institucional)',
  Finalizado: 'var(--color-menta)',
  Corrección: 'var(--color-ambar)',
  Aprobado: 'var(--color-menta-profundo)',
  'Aprobado (Automático)': 'var(--color-menta-profundo)',
  Retrasado: 'var(--color-coral)',
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
  const { tieneRol } = useAuth()
  const [params, setParams] = useSearchParams()
  const [pagina, setPagina] = useState(1)
  const [orden, setOrden] = useState<{ columna: keyof FilaEstadistica; asc: boolean }>({ columna: 'ticket_id', asc: false })

  const atajo = params.get('atajo') ?? 'este-mes'
  const rangoAtajo = atajo === 'personalizado' ? null : calcularRango(atajo)
  const desde = rangoAtajo?.desde ?? params.get('desde') ?? ''
  const hasta = rangoAtajo?.hasta ?? params.get('hasta') ?? hoyTegucigalpaISO()
  const areaId = params.get('area') ? Number(params.get('area')) : null
  const tipoId = params.get('tipo') ? Number(params.get('tipo')) : null
  const estadoFiltro = params.get('estado') ?? ''
  const disenadorFiltro = params.get('disenador') ?? ''

  function actualizarFiltro(clave: string, valor: string) {
    const siguiente = new URLSearchParams(params)
    if (valor) siguiente.set(clave, valor)
    else siguiente.delete(clave)
    setParams(siguiente, { replace: true })
    setPagina(1)
  }

  function limpiarFiltros() {
    setParams(new URLSearchParams(), { replace: true })
    setPagina(1)
  }

  const { data: areas = [] } = useQuery({ queryKey: ['catalogos', 'areas'], queryFn: listarAreas })
  const { data: tipos = [] } = useQuery({ queryKey: ['catalogos', 'tipos-solicitud'], queryFn: listarTiposSolicitud })

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ['estadisticas', desde, hasta, areaId, tipoId],
    queryFn: () => obtenerEstadisticas({ desde: desde || null, hasta: hasta || null, areaId, tipoSolicitudId: tipoId }),
  })

  const estadosDisponibles = useMemo(() => Array.from(new Set(filas.map((f) => f.estado_real))).sort(), [filas])
  const disenadoresDisponibles = useMemo(
    () => Array.from(new Set(filas.map((f) => f.disenador).filter(Boolean))).sort(),
    [filas],
  )

  const filasFiltradas = useMemo(
    () =>
      filas.filter(
        (f) => (!estadoFiltro || f.estado_real === estadoFiltro) && (!disenadorFiltro || f.disenador === disenadorFiltro),
      ),
    [filas, estadoFiltro, disenadorFiltro],
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
  const datosPorEstado = useMemo(() => contarPor(filasFiltradas, (f) => f.estado_real), [filasFiltradas])

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

  const totalPaginas = Math.max(1, Math.ceil(filasOrdenadas.length / FILAS_POR_PAGINA))
  const filasPagina = filasOrdenadas.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA)

  function alternarOrden(columna: keyof FilaEstadistica) {
    setOrden((prev) => (prev.columna === columna ? { columna, asc: !prev.asc } : { columna, asc: true }))
  }

  function exportarCsv() {
    descargarCsv(
      'estadisticas-voae.csv',
      [
        'ticket_id',
        'tipo_solicitud',
        'area',
        'estado_real',
        'disenador',
        'fecha_registro',
        'fecha_limite',
        'fecha_entrega_diseno',
        'dias_resolucion',
        'entregado_a_tiempo',
        'correcciones_usadas',
        'aprobado_automatico',
      ],
      filasOrdenadas.map((f) => [
        f.ticket_id,
        f.tipo_solicitud,
        f.area,
        f.estado_real,
        f.disenador,
        f.fecha_registro,
        f.fecha_limite,
        f.fecha_entrega_diseno,
        f.dias_resolucion,
        f.entregado_a_tiempo,
        f.correcciones_usadas,
        f.aprobado_automatico,
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Estadísticas</h1>
        <p className="text-sm text-tinta-suave">Estadísticas de todas las solicitudes, sin ver su contenido.</p>
      </div>

      <Card className="sticky top-0 z-10 flex flex-wrap items-end gap-3">
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
              <input
                type="date"
                className={`${CLASE_INPUT} mt-1 w-auto`}
                value={desde}
                onChange={(e) => actualizarFiltro('desde', e.target.value)}
              />
            </label>
            <label className="text-xs text-tinta-suave">
              Hasta
              <input
                type="date"
                className={`${CLASE_INPUT} mt-1 w-auto`}
                value={hasta}
                onChange={(e) => actualizarFiltro('hasta', e.target.value)}
              />
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
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
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
          Estado
          <select
            className={`${CLASE_INPUT} mt-1 w-auto`}
            value={estadoFiltro}
            onChange={(e) => actualizarFiltro('estado', e.target.value)}
          >
            <option value="">Todos</option>
            {estadosDisponibles.map((e) => (
              <option key={e} value={e ?? ''}>
                {e}
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

        <Button variante="fantasma" onClick={limpiarFiltros}>
          Limpiar filtros
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
            <Kpi etiqueta="Aprobadas" valor={`${kpis.aprobadas} (${kpis.automaticas} auto.)`} color="menta" />
            <Kpi etiqueta="% con corrección" valor={`${kpis.pctConCorreccion}%`} color="ambar" />
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
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={datosPorTipo} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-azul-niebla)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="etiqueta" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="valor" name="Solicitudes" fill="var(--color-azul-medio)" radius={4} />
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

            <GraficoCard titulo="Distribución por estado" vacio={datosPorEstado.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={datosPorEstado} dataKey="valor" nameKey="etiqueta" innerRadius={60} outerRadius={90}>
                    {datosPorEstado.map((dato, indice) => (
                      <Cell key={indice} fill={COLOR_POR_ESTADO[dato.etiqueta] ?? 'var(--color-tinta-suave)'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Cumplimiento a tiempo por tipo" vacio={cumplimientoPorTipo.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cumplimientoPorTipo} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-azul-niebla)" />
                  <XAxis type="number" unit="%" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="tipo" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="aTiempo" name="A tiempo" stackId="a" fill="var(--color-menta)" />
                  <Bar dataKey="tarde" name="Tarde" stackId="a" fill="var(--color-coral)" />
                </BarChart>
              </ResponsiveContainer>
            </GraficoCard>

            <GraficoCard titulo="Carga por diseñador" vacio={cargaPorDisenador.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cargaPorDisenador} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-azul-niebla)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="disenador" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="asignados" name="Asignados" fill="var(--color-azul-institucional)" radius={4} />
                  <Bar dataKey="aTiempo" name="A tiempo" fill="var(--color-menta)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </GraficoCard>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-azul-noche">Detalle ({filasOrdenadas.length})</h2>
              <Button variante="secundario" onClick={exportarCsv}>
                <Download size={14} /> Exportar CSV
              </Button>
            </div>

            {filasOrdenadas.length === 0 ? (
              <EmptyState titulo="No hay resultados con estos filtros" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
                      <tr>
                        {(
                          [
                            ['ticket_id', 'Ticket'],
                            ['tipo_solicitud', 'Tipo'],
                            ['area', 'Área'],
                            ['estado_real', 'Estado'],
                            ['disenador', 'Diseñador'],
                            ['fecha_registro', 'Registrado'],
                            ['dias_resolucion', 'Días resolución'],
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
                          <td className="px-3 py-2 font-mono">
                            {tieneRol('Administrador') ? (
                              <Link to={`/tickets/${fila.ticket_id}`} className="text-azul-institucional hover:underline">
                                #{fila.ticket_id}
                              </Link>
                            ) : (
                              <>#{fila.ticket_id}</>
                            )}
                          </td>
                          <td className="px-3 py-2">{fila.tipo_solicitud}</td>
                          <td className="px-3 py-2">{fila.area}</td>
                          <td className="px-3 py-2">
                            <EstadoChip estado={fila.estado_real ?? ''} />
                          </td>
                          <td className="px-3 py-2">{fila.disenador ?? '—'}</td>
                          <td className="px-3 py-2">{formatFecha(fila.fecha_registro)}</td>
                          <td className="px-3 py-2">{fila.dias_resolucion ?? '—'}</td>
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

function Kpi({ etiqueta, valor, color }: { etiqueta: string; valor: string | number; color: 'azul' | 'menta' | 'coral' | 'ambar' }) {
  const barra = { azul: 'bg-azul-medio', menta: 'bg-menta', coral: 'bg-coral', ambar: 'bg-ambar' }[color]
  return (
    <Card>
      <p className="text-xs uppercase text-tinta-suave">{etiqueta}</p>
      <p className="font-mono text-2xl font-bold text-azul-noche">{valor}</p>
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
