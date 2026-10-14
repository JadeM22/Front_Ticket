import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Search, X } from 'lucide-react'
import { coincideCodigo, coincideTexto } from '../lib/buscar'
import { hoyTegucigalpaISO } from '../lib/date'
import { exportarCSV, type ColumnaExportar } from '../lib/exportar'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { CLASE_INPUT } from './ui/Campo'
import { FechaInput } from './ui/FechaInput'
import { EmptyState } from './ui/EmptyState'

const FILAS_POR_PAGINA = 20

const ATAJOS_FECHA = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: '7-dias', etiqueta: 'Últimos 7 días' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'personalizado', etiqueta: 'Personalizado' },
] as const

function calcularRango(atajo: string): { desde: string; hasta: string } | null {
  const hoy = hoyTegucigalpaISO()
  if (atajo === 'hoy') return { desde: hoy, hasta: hoy }
  if (atajo === '7-dias') {
    const fecha = new Date(`${hoy}T12:00:00Z`)
    fecha.setUTCDate(fecha.getUTCDate() - 6)
    return { desde: fecha.toISOString().slice(0, 10), hasta: hoy }
  }
  if (atajo === 'mes') return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy }
  return null
}

export interface BitacoraColumna<T> {
  clave: string
  etiqueta: string
  render: (fila: T) => ReactNode
}

export interface BitacoraFiltroSelect<T> {
  clave: string
  etiqueta: string
  opciones: string[]
  /** `true` si `fila` coincide con el valor elegido — permite comparar contra más de un campo (p. ej. "De" o "A"). */
  coincide: (fila: T, valorSeleccionado: string) => boolean
}

interface BitacoraTablaProps<T> {
  /** Namespacing de los parámetros en la URL (p. ej. "roles", "feriados", "asignaciones"). */
  prefijo: string
  filas: T[]
  isLoading: boolean
  obtenerClave: (fila: T) => number | string
  obtenerFecha: (fila: T) => string | null
  columnas: BitacoraColumna<T>[]
  camposBusqueda: (fila: T) => (string | null | undefined)[]
  placeholderBusqueda: string
  filtrosSelect: BitacoraFiltroSelect<T>[]
  columnasExportar: ColumnaExportar<T>[]
  /** Prefijo del archivo exportado; la fecha se agrega al momento de exportar, no en cada render. */
  nombreBaseArchivo: string
}

/**
 * Tabla reutilizable para las tres pestañas de Bitácoras: búsqueda sin tildes, rango de fechas con
 * atajos, filtros `select` configurables, paginación y exportar CSV. Todo el estado de filtros vive
 * en la URL, namespaced con `prefijo` para que cambiar de pestaña no arrastre los filtros de otra.
 */
export function BitacoraTabla<T>({
  prefijo,
  filas,
  isLoading,
  obtenerClave,
  obtenerFecha,
  columnas,
  camposBusqueda,
  placeholderBusqueda,
  filtrosSelect,
  columnasExportar,
  nombreBaseArchivo,
}: BitacoraTablaProps<T>) {
  const [params, setParams] = useSearchParams()
  const [pagina, setPagina] = useState(1)

  const clave = (sufijo: string) => `${prefijo}_${sufijo}`

  const busqueda = params.get(clave('q')) ?? ''
  const atajo = params.get(clave('atajo')) ?? ''
  const rangoAtajo = atajo ? calcularRango(atajo) : null
  const desde = rangoAtajo?.desde ?? params.get(clave('desde')) ?? ''
  const hasta = rangoAtajo?.hasta ?? params.get(clave('hasta')) ?? ''

  function actualizar(sufijo: string, valor: string) {
    const siguiente = new URLSearchParams(params)
    if (valor) siguiente.set(clave(sufijo), valor)
    else siguiente.delete(clave(sufijo))
    setParams(siguiente, { replace: true })
    setPagina(1)
  }

  const hayFiltrosActivos =
    Boolean(busqueda || atajo || desde || hasta) || filtrosSelect.some((f) => params.get(clave(f.clave)))

  function limpiarFiltros() {
    const siguiente = new URLSearchParams(params)
    for (const sufijo of ['q', 'atajo', 'desde', 'hasta', ...filtrosSelect.map((f) => f.clave)]) {
      siguiente.delete(clave(sufijo))
    }
    setParams(siguiente, { replace: true })
    setPagina(1)
  }

  const filasFiltradas = useMemo(
    () =>
      filas.filter((fila) => {
        if (
          busqueda &&
          !camposBusqueda(fila).some((campo) => coincideTexto(campo, busqueda) || coincideCodigo(campo, busqueda))
        )
          return false
        const fecha = (obtenerFecha(fila) ?? '').slice(0, 10)
        if (desde && fecha < desde) return false
        if (hasta && fecha > hasta) return false
        for (const filtro of filtrosSelect) {
          const seleccionado = params.get(clave(filtro.clave))
          if (seleccionado && !filtro.coincide(fila, seleccionado)) return false
        }
        return true
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filas, busqueda, desde, hasta, params, filtrosSelect],
  )

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / FILAS_POR_PAGINA))
  const filasPagina = filasFiltradas.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA)

  function exportar() {
    exportarCSV(filasFiltradas, columnasExportar, `${nombreBaseArchivo}_${hoyTegucigalpaISO()}.csv`)
  }

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-end gap-3 border border-azul-niebla shadow-sm">
        <label className="text-xs text-tinta-suave">
          Buscar
          <div className="relative mt-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
            <input
              className={`${CLASE_INPUT} w-56 pl-8`}
              placeholder={placeholderBusqueda}
              value={busqueda}
              onChange={(e) => actualizar('q', e.target.value)}
            />
          </div>
        </label>

        <label className="text-xs text-tinta-suave">
          Rango
          <select className={`${CLASE_INPUT} mt-1 w-auto`} value={atajo} onChange={(e) => actualizar('atajo', e.target.value)}>
            <option value="">Todo</option>
            {ATAJOS_FECHA.map((a) => (
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
              <FechaInput className="mt-1 w-40" valor={desde} onCambiar={(fecha) => actualizar('desde', fecha)} />
            </label>
            <label className="text-xs text-tinta-suave">
              Hasta
              <FechaInput className="mt-1 w-40" valor={hasta} onCambiar={(fecha) => actualizar('hasta', fecha)} />
            </label>
          </>
        )}

        {filtrosSelect.map((filtro) => (
          <label key={filtro.clave} className="text-xs text-tinta-suave">
            {filtro.etiqueta}
            <select
              className={`${CLASE_INPUT} mt-1 w-auto`}
              value={params.get(clave(filtro.clave)) ?? ''}
              onChange={(e) => actualizar(filtro.clave, e.target.value)}
            >
              <option value="">Todos</option>
              {filtro.opciones.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </label>
        ))}

        <Button
          variante="secundario"
          className="border border-azul-niebla shadow-sm hover:bg-azul-niebla/60"
          disabled={!hayFiltrosActivos}
          onClick={limpiarFiltros}
        >
          <X size={14} /> Limpiar filtros
        </Button>

        <Button variante="secundario" className="ml-auto" onClick={exportar}>
          <Download size={14} /> Exportar CSV
        </Button>
      </Card>

      {isLoading ? (
        <p className="text-sm text-tinta-suave">Cargando…</p>
      ) : filasFiltradas.length === 0 ? (
        <EmptyState titulo="No hay registros con estos filtros" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-azul-niebla bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
                <tr>
                  {columnas.map((c) => (
                    <th key={c.clave} className="px-4 py-2">
                      {c.etiqueta}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-azul-niebla/60">
                {filasPagina.map((fila) => (
                  <tr key={obtenerClave(fila)}>
                    {columnas.map((c) => (
                      <td key={c.clave} className="px-4 py-2">
                        {c.render(fila)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-tinta-suave">
            <span>
              Página {pagina} de {totalPaginas} ({filasFiltradas.length} registro(s))
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
    </div>
  )
}
