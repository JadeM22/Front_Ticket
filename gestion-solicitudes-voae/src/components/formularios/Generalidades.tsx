import { useQuery } from '@tanstack/react-query'
import { listarCampus } from '../../data/catalogos'
import { Campo, CLASE_INPUT } from '../ui/Campo'
import { FechaEventoPicker } from '../ui/FechaEventoPicker'
import { Skeleton } from '../ui/Skeleton'
import { MAX_LONGITUD_GENERALIDAD, type Generalidades } from '../../lib/validacionFormularios'
import type { EtiquetasGenerales } from '../../types/domain'

interface GeneralidadesCamposProps {
  valor: Generalidades
  onCambiar: (valor: Generalidades) => void
  tipoId: number
  excepcional: boolean
  diasProduccion: number
  /** Nombres visibles del tipo (`etiquetasGenerales()`). */
  etiquetas: EtiquetasGenerales
}

/** Lo que toda solicitud lleva arriba, sea del tipo que sea. Solo sus nombres visibles cambian por tipo. */
export function GeneralidadesCampos({
  valor,
  onCambiar,
  tipoId,
  excepcional,
  diasProduccion,
  etiquetas,
}: GeneralidadesCamposProps) {
  const { data: campus = [], isLoading } = useQuery({ queryKey: ['catalogos', 'campus'], queryFn: listarCampus })
  const activos = campus.filter((c) => c.estado)
  const todosMarcados = activos.length > 0 && activos.every((c) => valor.campus_ids.includes(c.id))

  function alternarCampus(id: number, marcado: boolean) {
    // Se guardan en el orden del catálogo, no en el orden en que se marcaron.
    const ids = activos.filter((c) => (c.id === id ? marcado : valor.campus_ids.includes(c.id))).map((c) => c.id)
    onCambiar({ ...valor, campus_ids: ids })
  }

  return (
    <div className="space-y-4">
      <Campo etiqueta={`${etiquetas.titulo} *`}>
        <input
          className={CLASE_INPUT}
          maxLength={MAX_LONGITUD_GENERALIDAD}
          value={valor.titulo}
          onChange={(e) => onCambiar({ ...valor, titulo: e.target.value })}
        />
      </Campo>

      <Campo etiqueta={`${etiquetas.fecha_evento} *`}>
        <FechaEventoPicker
          tipoId={tipoId}
          excepcional={excepcional}
          diasProduccion={diasProduccion}
          value={valor.fecha_evento}
          onChange={(fecha_evento) => onCambiar({ ...valor, fecha_evento })}
        />
      </Campo>

      <Campo etiqueta={`${etiquetas.dirigido_a} *`}>
        <input
          className={CLASE_INPUT}
          placeholder="Estudiante, docente, personal administrativo"
          maxLength={MAX_LONGITUD_GENERALIDAD}
          value={valor.dirigido_a}
          onChange={(e) => onCambiar({ ...valor, dirigido_a: e.target.value })}
        />
      </Campo>

      <fieldset>
        <div className="mb-1 flex items-center justify-between gap-2">
          <legend className="text-sm font-medium text-tinta">{etiquetas.alcance} *</legend>
          {activos.length > 1 && (
            <button
              type="button"
              className="text-xs font-medium text-azul-institucional hover:underline"
              onClick={() => onCambiar({ ...valor, campus_ids: todosMarcados ? [] : activos.map((c) => c.id) })}
            >
              {todosMarcados ? 'Quitar todos' : 'Seleccionar todos'}
            </button>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : activos.length === 0 ? (
          <p className="text-sm text-tinta-suave">No hay campus activos. Pide a un administrador que los registre.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {activos.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-tinta">
                <input
                  type="checkbox"
                  checked={valor.campus_ids.includes(c.id)}
                  onChange={(e) => alternarCampus(c.id, e.target.checked)}
                />
                {c.nombre}
                {c.siglas && <span className="text-xs text-tinta-suave">({c.siglas})</span>}
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </div>
  )
}
