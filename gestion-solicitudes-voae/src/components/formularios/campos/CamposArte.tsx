import { Campo, CLASE_INPUT } from '../../ui/Campo'
import { EtiquetasInput } from '../EtiquetasInput'
import { hoyTegucigalpaISO } from '../../../lib/date'
import type { DetalleArte } from '../../../types/domain'

interface Props {
  valor: DetalleArte
  onCambiar: (valor: DetalleArte) => void
}

export function CamposArte({ valor, onCambiar }: Props) {
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo etiqueta="Fecha (opcional)">
          <input
            type="date"
            min={hoyTegucigalpaISO()}
            className={CLASE_INPUT}
            value={valor.fecha ?? ''}
            onChange={(e) => onCambiar({ ...valor, fecha: e.target.value || null })}
          />
        </Campo>
        <Campo etiqueta="Hora de inicio">
          <input
            type="time"
            className={CLASE_INPUT}
            value={valor.hora_inicio ?? ''}
            onChange={(e) => onCambiar({ ...valor, hora_inicio: e.target.value || null })}
          />
        </Campo>
        <Campo etiqueta="Hora de fin">
          <input
            type="time"
            className={CLASE_INPUT}
            value={valor.hora_fin ?? ''}
            onChange={(e) => onCambiar({ ...valor, hora_fin: e.target.value || null })}
          />
        </Campo>
      </div>

      <Campo etiqueta="Lugar (opcional)">
        <input
          className={CLASE_INPUT}
          value={valor.lugar ?? ''}
          onChange={(e) => onCambiar({ ...valor, lugar: e.target.value || null })}
        />
      </Campo>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Modalidad">
          <select
            className={CLASE_INPUT}
            value={valor.modalidad ?? ''}
            onChange={(e) => onCambiar({ ...valor, modalidad: (e.target.value || null) as DetalleArte['modalidad'] })}
          >
            <option value="">Sin especificar</option>
            <option value="Presencial">Presencial</option>
            <option value="No presencial">No presencial</option>
          </select>
        </Campo>
        <Campo etiqueta="Alcance">
          <select
            className={CLASE_INPUT}
            value={valor.alcance ?? ''}
            onChange={(e) => onCambiar({ ...valor, alcance: (e.target.value || null) as DetalleArte['alcance'] })}
          >
            <option value="">Sin especificar</option>
            <option value="Todos los centros regionales">Todos los centros regionales</option>
            <option value="Solo Ciudad Universitaria">Solo Ciudad Universitaria</option>
          </select>
        </Campo>
      </div>

      <label className="flex items-center gap-2 text-sm text-tinta">
        <input
          type="checkbox"
          checked={valor.aplica_articulo_140}
          onChange={(e) => onCambiar({ ...valor, aplica_articulo_140: e.target.checked })}
        />
        Aplica Artículo 140
      </label>

      <Campo etiqueta="Enlace del QR (si la pieza lleva uno)">
        <input
          type="url"
          className={CLASE_INPUT}
          placeholder="https://…"
          value={valor.enlace_qr ?? ''}
          onChange={(e) => onCambiar({ ...valor, enlace_qr: e.target.value || null })}
        />
      </Campo>

      <Campo etiqueta="Información adicional">
        <textarea
          className={CLASE_INPUT}
          rows={3}
          value={valor.informacion_adicional ?? ''}
          onChange={(e) => onCambiar({ ...valor, informacion_adicional: e.target.value || null })}
        />
      </Campo>

      <Campo etiqueta="Logotipos">
        <EtiquetasInput valores={valor.logotipos} onCambiar={(logotipos) => onCambiar({ ...valor, logotipos })} />
      </Campo>
    </div>
  )
}
