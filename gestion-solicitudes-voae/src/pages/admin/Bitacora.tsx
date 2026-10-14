import { useSearchParams } from 'react-router-dom'
import type { KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  listarBitacora,
  listarFeriadosLog,
  listarAsignacionLog,
  type EntradaBitacora,
  type FilaFeriadoLog,
  type FilaAsignacionLog,
} from '../../data/bitacora'
import { formatFechaHora, formatFecha } from '../../lib/date'
import { useNombresUsuarios } from '../../hooks/useNombresUsuarios'
import { BitacoraTabla, type BitacoraColumna, type BitacoraFiltroSelect } from '../../components/BitacoraTabla'

type Pestana = 'roles' | 'feriados' | 'asignaciones'

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'roles', etiqueta: 'Roles' },
  { clave: 'feriados', etiqueta: 'Feriados' },
  { clave: 'asignaciones', etiqueta: 'Asignaciones' },
]

const ACCION_FERIADO: Record<string, { etiqueta: string; clase: string }> = {
  CREADO: { etiqueta: 'Creado', clase: 'bg-menta-bruma text-menta-profundo' },
  EDITADO: { etiqueta: 'Editado', clase: 'bg-azul-niebla text-azul-institucional' },
  DESACTIVADO: { etiqueta: 'Desactivado', clase: 'bg-tinta-suave/15 text-tinta-suave' },
  REACTIVADO: { etiqueta: 'Reactivado', clase: 'bg-menta-bruma text-menta' },
  ELIMINADO: { etiqueta: 'Eliminado', clase: 'bg-coral-bruma text-coral' },
}

const ACCION_ASIGNACION: Record<string, { etiqueta: string; clase: string }> = {
  TOMADO: { etiqueta: 'Tomado', clase: 'bg-azul-niebla text-azul-institucional' },
  ASIGNADO: { etiqueta: 'Asignado', clase: 'bg-menta-bruma text-menta-profundo' },
  REASIGNADO: { etiqueta: 'Reasignado', clase: 'bg-indigo-bruma text-indigo-suave' },
  DESASIGNADO: { etiqueta: 'Desasignado', clase: 'bg-coral-bruma text-coral' },
  'EXCEPCIONAL ACEPTADA': { etiqueta: 'Excepcional aceptada', clase: 'bg-ambar-bruma text-ambar' },
}

function InsigniaAccion({ accion, mapa }: { accion: string; mapa: Record<string, { etiqueta: string; clase: string }> }) {
  const info = mapa[accion] ?? { etiqueta: accion, clase: 'bg-azul-niebla text-tinta-suave' }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${info.clase}`}>{info.etiqueta}</span>
}

function rangoFechas(desde: string | null, hasta: string | null): string {
  if (!desde && !hasta) return '—'
  return `${formatFecha(desde)} – ${formatFecha(hasta)}`
}

export function AdminBitacoraPage() {
  const [params, setParams] = useSearchParams()
  const pestanaActiva = ((params.get('tab') as Pestana | null) ?? 'roles') as Pestana
  const { nombreDe } = useNombresUsuarios()

  const { data: filasRoles = [], isLoading: cargandoRoles } = useQuery({ queryKey: ['admin', 'bitacora'], queryFn: listarBitacora })
  const { data: filasFeriados = [], isLoading: cargandoFeriados } = useQuery({
    queryKey: ['admin', 'bitacora-feriados'],
    queryFn: listarFeriadosLog,
  })
  const { data: filasAsignaciones = [], isLoading: cargandoAsignaciones } = useQuery({
    queryKey: ['admin', 'bitacora-asignaciones'],
    queryFn: listarAsignacionLog,
  })

  function cambiarPestana(clave: Pestana) {
    const siguiente = new URLSearchParams(params)
    siguiente.set('tab', clave)
    setParams(siguiente, { replace: true })
  }

  function manejarTeclado(e: KeyboardEvent<HTMLDivElement>) {
    const indice = PESTANAS.findIndex((p) => p.clave === pestanaActiva)
    if (e.key === 'ArrowRight') cambiarPestana(PESTANAS[(indice + 1) % PESTANAS.length].clave)
    else if (e.key === 'ArrowLeft') cambiarPestana(PESTANAS[(indice - 1 + PESTANAS.length) % PESTANAS.length].clave)
  }

  const conteos: Record<Pestana, number> = {
    roles: filasRoles.length,
    feriados: filasFeriados.length,
    asignaciones: filasAsignaciones.length,
  }

  // --- Roles (consulta y columnas tal como estaban: no se cambia su lógica) ---
  const columnasRoles: BitacoraColumna<EntradaBitacora>[] = [
    { clave: 'usuario', etiqueta: 'Usuario', render: (f) => <span className="text-tinta">{f.usuario_nombre ?? `#${f.usuario_id}`}</span> },
    { clave: 'rol', etiqueta: 'Rol', render: (f) => <span className="text-tinta-suave">{f.rol_nombre ?? `#${f.rol_id}`}</span> },
    {
      clave: 'accion',
      etiqueta: 'Acción',
      render: (f) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            f.accion === 'ASIGNADO' ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
          }`}
        >
          {f.accion}
        </span>
      ),
    },
    { clave: 'realizado_por', etiqueta: 'Realizado por', render: (f) => nombreDe(f.usuario_registro) },
    { clave: 'fecha', etiqueta: 'Fecha', render: (f) => <span className="font-mono text-xs">{formatFechaHora(f.fecha_registro)}</span> },
  ]
  const accionesRoles = Array.from(new Set(filasRoles.map((f) => f.accion)))
  const realizadoPorRoles = Array.from(new Set(filasRoles.map((f) => nombreDe(f.usuario_registro)))).sort()
  const filtrosRoles: BitacoraFiltroSelect<EntradaBitacora>[] = [
    { clave: 'accion', etiqueta: 'Acción', opciones: accionesRoles, coincide: (f, v) => f.accion === v },
    { clave: 'realizado', etiqueta: 'Realizado por', opciones: realizadoPorRoles, coincide: (f, v) => nombreDe(f.usuario_registro) === v },
  ]

  // --- Feriados ---
  const columnasFeriados: BitacoraColumna<FilaFeriadoLog>[] = [
    { clave: 'fecha', etiqueta: 'Fecha y hora', render: (f) => <span className="font-mono text-xs">{formatFechaHora(f.fecha_registro)}</span> },
    { clave: 'accion', etiqueta: 'Acción', render: (f) => <InsigniaAccion accion={f.accion ?? ''} mapa={ACCION_FERIADO} /> },
    { clave: 'feriado', etiqueta: 'Feriado', render: (f) => f.nombre },
    { clave: 'fechas_anteriores', etiqueta: 'Fechas anteriores', render: (f) => rangoFechas(f.fecha_inicio_anterior, f.fecha_fin_anterior) },
    { clave: 'fechas_nuevas', etiqueta: 'Fechas nuevas', render: (f) => rangoFechas(f.fecha_inicio_nueva, f.fecha_fin_nueva) },
    { clave: 'realizado_por', etiqueta: 'Realizado por', render: (f) => f.realizado_por ?? '(Sistema)' },
  ]
  const accionesFeriados = Array.from(new Set(filasFeriados.map((f) => f.accion).filter((a): a is string => Boolean(a))))
  const realizadoPorFeriados = Array.from(new Set(filasFeriados.map((f) => f.realizado_por).filter((n): n is string => Boolean(n)))).sort()
  const filtrosFeriados: BitacoraFiltroSelect<FilaFeriadoLog>[] = [
    { clave: 'accion', etiqueta: 'Acción', opciones: accionesFeriados, coincide: (f, v) => f.accion === v },
    { clave: 'realizado', etiqueta: 'Realizado por', opciones: realizadoPorFeriados, coincide: (f, v) => f.realizado_por === v },
  ]

  // --- Asignaciones ---
  const columnasAsignaciones: BitacoraColumna<FilaAsignacionLog>[] = [
    { clave: 'fecha', etiqueta: 'Fecha y hora', render: (f) => <span className="font-mono text-xs">{formatFechaHora(f.fecha_registro)}</span> },
    {
      clave: 'ticket',
      etiqueta: 'Ticket',
      render: (f) => <span className="whitespace-nowrap font-mono text-azul-institucional">{f.codigo}</span>,
    },
    { clave: 'tipo', etiqueta: 'Tipo', render: (f) => f.tipo_solicitud },
    { clave: 'area', etiqueta: 'Área', render: (f) => f.area },
    { clave: 'accion', etiqueta: 'Acción', render: (f) => <InsigniaAccion accion={f.accion ?? ''} mapa={ACCION_ASIGNACION} /> },
    { clave: 'de', etiqueta: 'De', render: (f) => f.disenador_anterior ?? 'Sin asignar' },
    { clave: 'a', etiqueta: 'A', render: (f) => f.disenador_nuevo ?? 'Sin asignar' },
    { clave: 'realizado_por', etiqueta: 'Realizado por', render: (f) => f.realizado_por ?? '(Sistema)' },
  ]
  const accionesAsignaciones = Array.from(new Set(filasAsignaciones.map((f) => f.accion).filter((a): a is string => Boolean(a))))
  const realizadoPorAsignaciones = Array.from(
    new Set(filasAsignaciones.map((f) => f.realizado_por).filter((n): n is string => Boolean(n))),
  ).sort()
  const disenadoresAsignaciones = Array.from(
    new Set(filasAsignaciones.flatMap((f) => [f.disenador_anterior, f.disenador_nuevo]).filter((n): n is string => Boolean(n))),
  ).sort()
  const areasAsignaciones = Array.from(new Set(filasAsignaciones.map((f) => f.area).filter((a): a is string => Boolean(a)))).sort()
  const filtrosAsignaciones: BitacoraFiltroSelect<FilaAsignacionLog>[] = [
    { clave: 'accion', etiqueta: 'Acción', opciones: accionesAsignaciones, coincide: (f, v) => f.accion === v },
    { clave: 'realizado', etiqueta: 'Realizado por', opciones: realizadoPorAsignaciones, coincide: (f, v) => f.realizado_por === v },
    {
      clave: 'disenador',
      etiqueta: 'Diseñador',
      opciones: disenadoresAsignaciones,
      coincide: (f, v) => f.disenador_anterior === v || f.disenador_nuevo === v,
    },
    { clave: 'area', etiqueta: 'Área', opciones: areasAsignaciones, coincide: (f, v) => f.area === v },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Bitácoras</h1>
        <p className="text-sm text-tinta-suave">Historial de roles, feriados y asignaciones de tickets.</p>
      </div>

      <div role="tablist" aria-label="Bitácoras" onKeyDown={manejarTeclado} className="flex gap-1 border-b border-azul-niebla">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            id={`tab-${p.clave}`}
            aria-selected={pestanaActiva === p.clave}
            aria-controls={`panel-${p.clave}`}
            tabIndex={pestanaActiva === p.clave ? 0 : -1}
            onClick={() => cambiarPestana(p.clave)}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
              pestanaActiva === p.clave
                ? 'border-b-2 border-azul-institucional text-azul-institucional'
                : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            {p.etiqueta}
            <span className="rounded-full bg-azul-niebla px-1.5 py-0.5 text-xs">{conteos[p.clave]}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id="panel-roles" aria-labelledby="tab-roles" hidden={pestanaActiva !== 'roles'}>
        {pestanaActiva === 'roles' && (
          <BitacoraTabla
            prefijo="roles"
            filas={filasRoles}
            isLoading={cargandoRoles}
            obtenerClave={(f) => f.id}
            obtenerFecha={(f) => f.fecha_registro}
            columnas={columnasRoles}
            camposBusqueda={(f) => [f.usuario_nombre, f.rol_nombre]}
            placeholderBusqueda="Buscar por usuario o rol"
            filtrosSelect={filtrosRoles}
            columnasExportar={[
              { etiqueta: 'Usuario', valor: (f) => f.usuario_nombre ?? `#${f.usuario_id}` },
              { etiqueta: 'Rol', valor: (f) => f.rol_nombre ?? `#${f.rol_id}` },
              { etiqueta: 'Acción', valor: (f) => f.accion },
              { etiqueta: 'Realizado por', valor: (f) => nombreDe(f.usuario_registro) },
              { etiqueta: 'Fecha', valor: (f) => formatFechaHora(f.fecha_registro) },
            ]}
            nombreBaseArchivo="bitacora_roles"
          />
        )}
      </div>

      <div role="tabpanel" id="panel-feriados" aria-labelledby="tab-feriados" hidden={pestanaActiva !== 'feriados'}>
        {pestanaActiva === 'feriados' && (
          <BitacoraTabla
            prefijo="feriados"
            filas={filasFeriados}
            isLoading={cargandoFeriados}
            obtenerClave={(f) => f.id ?? 0}
            obtenerFecha={(f) => f.fecha_registro}
            columnas={columnasFeriados}
            camposBusqueda={(f) => [f.nombre, f.realizado_por]}
            placeholderBusqueda="Buscar por feriado o realizado por"
            filtrosSelect={filtrosFeriados}
            columnasExportar={[
              { etiqueta: 'Fecha y hora', valor: (f) => formatFechaHora(f.fecha_registro) },
              { etiqueta: 'Acción', valor: (f) => ACCION_FERIADO[f.accion ?? '']?.etiqueta ?? f.accion },
              { etiqueta: 'Feriado', valor: (f) => f.nombre },
              { etiqueta: 'Fecha inicio anterior', valor: (f) => formatFecha(f.fecha_inicio_anterior) },
              { etiqueta: 'Fecha fin anterior', valor: (f) => formatFecha(f.fecha_fin_anterior) },
              { etiqueta: 'Fecha inicio nueva', valor: (f) => formatFecha(f.fecha_inicio_nueva) },
              { etiqueta: 'Fecha fin nueva', valor: (f) => formatFecha(f.fecha_fin_nueva) },
              { etiqueta: 'Realizado por', valor: (f) => f.realizado_por ?? '(Sistema)' },
            ]}
            nombreBaseArchivo="bitacora_feriados"
          />
        )}
      </div>

      <div role="tabpanel" id="panel-asignaciones" aria-labelledby="tab-asignaciones" hidden={pestanaActiva !== 'asignaciones'}>
        {pestanaActiva === 'asignaciones' && (
          <BitacoraTabla
            prefijo="asignaciones"
            filas={filasAsignaciones}
            isLoading={cargandoAsignaciones}
            obtenerClave={(f) => f.id ?? 0}
            obtenerFecha={(f) => f.fecha_registro}
            columnas={columnasAsignaciones}
            camposBusqueda={(f) => [f.codigo, f.disenador_anterior, f.disenador_nuevo, f.realizado_por]}
            placeholderBusqueda="Buscar por código o nombres"
            filtrosSelect={filtrosAsignaciones}
            columnasExportar={[
              { etiqueta: 'Fecha y hora', valor: (f) => formatFechaHora(f.fecha_registro) },
              { etiqueta: 'Ticket', valor: (f) => f.codigo },
              { etiqueta: 'Tipo', valor: (f) => f.tipo_solicitud },
              { etiqueta: 'Área', valor: (f) => f.area },
              { etiqueta: 'Acción', valor: (f) => ACCION_ASIGNACION[f.accion ?? '']?.etiqueta ?? f.accion },
              { etiqueta: 'De', valor: (f) => f.disenador_anterior ?? 'Sin asignar' },
              { etiqueta: 'A', valor: (f) => f.disenador_nuevo ?? 'Sin asignar' },
              { etiqueta: 'Realizado por', valor: (f) => f.realizado_por ?? '(Sistema)' },
            ]}
            nombreBaseArchivo="bitacora_asignaciones"
          />
        )}
      </div>
    </div>
  )
}
