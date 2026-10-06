import { Campo, CLASE_INPUT } from '../../ui/Campo'
import { EtiquetasInput } from '../EtiquetasInput'
import { hoyTegucigalpaISO } from '../../../lib/date'
import type { DetalleGenerico } from '../../../types/domain'

interface Props {
  valor: DetalleGenerico
  onCambiar: (valor: DetalleGenerico) => void
}

export function CamposGenerico({ valor, onCambiar }: Props) {
  return (
    <div className="space-y-4">
      <Campo etiqueta="Título">
        <input
          className={CLASE_INPUT}
          required
          value={valor.titulo}
          onChange={(e) => onCambiar({ ...valor, titulo: e.target.value })}
        />
      </Campo>

      <Campo etiqueta="Descripción">
        <textarea
          className={CLASE_INPUT}
          required
          rows={4}
          value={valor.descripcion}
          onChange={(e) => onCambiar({ ...valor, descripcion: e.target.value })}
        />
      </Campo>

      <Campo etiqueta="Fecha requerida (opcional)">
        <input
          type="date"
          min={hoyTegucigalpaISO()}
          className={CLASE_INPUT}
          value={valor.fecha_requerida ?? ''}
          onChange={(e) => onCambiar({ ...valor, fecha_requerida: e.target.value || null })}
        />
      </Campo>

      <Campo etiqueta="Información del producto">
        <textarea
          className={CLASE_INPUT}
          rows={3}
          value={valor.informacion_producto ?? ''}
          onChange={(e) => onCambiar({ ...valor, informacion_producto: e.target.value || null })}
        />
      </Campo>

      <Campo etiqueta="Logotipos">
        <EtiquetasInput valores={valor.logotipos} onCambiar={(logotipos) => onCambiar({ ...valor, logotipos })} />
      </Campo>

      <Campo etiqueta="Observaciones">
        <textarea
          className={CLASE_INPUT}
          rows={2}
          value={valor.observaciones ?? ''}
          onChange={(e) => onCambiar({ ...valor, observaciones: e.target.value || null })}
        />
      </Campo>
    </div>
  )
}
