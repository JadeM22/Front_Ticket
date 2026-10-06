import { Campo, CLASE_INPUT } from '../../ui/Campo'
import { EtiquetasInput } from '../EtiquetasInput'
import { Aviso } from '../Aviso'
import { hoyTegucigalpaISO } from '../../../lib/date'
import type { DetalleVideo } from '../../../types/domain'

interface Props {
  valor: DetalleVideo
  onCambiar: (valor: DetalleVideo) => void
}

export function CamposVideo({ valor, onCambiar }: Props) {
  return (
    <div className="space-y-4">
      <Campo etiqueta="Objetivo">
        <textarea
          className={CLASE_INPUT}
          required
          rows={3}
          value={valor.objetivo}
          onChange={(e) => onCambiar({ ...valor, objetivo: e.target.value })}
        />
      </Campo>

      <Campo etiqueta="Fecha de entrega/publicación">
        <input
          type="date"
          min={hoyTegucigalpaISO()}
          className={CLASE_INPUT}
          required
          value={valor.fecha_entrega_publicacion}
          onChange={(e) => onCambiar({ ...valor, fecha_entrega_publicacion: e.target.value })}
        />
      </Campo>

      <Campo etiqueta="Encargado de la actividad">
        <input
          className={CLASE_INPUT}
          required
          value={valor.encargado_actividad}
          onChange={(e) => onCambiar({ ...valor, encargado_actividad: e.target.value })}
        />
      </Campo>

      <Campo etiqueta="Participación de estudiantes">
        <select
          className={CLASE_INPUT}
          value={valor.participacion_estudiantes}
          onChange={(e) =>
            onCambiar({ ...valor, participacion_estudiantes: e.target.value as DetalleVideo['participacion_estudiantes'] })
          }
        >
          <option value="No aplica">No aplica</option>
          <option value="Artículo 140">Artículo 140</option>
          <option value="Horas beca">Horas beca</option>
        </select>
      </Campo>

      {valor.participacion_estudiantes !== 'No aplica' && (
        <Aviso>
          El área o unidad solicitante se hace responsable de llenar la ficha para hacer valer las horas de
          Artículo 140; en el caso de horas beca, los solicitantes harán la comunicación correspondiente para
          validar el trámite.
        </Aviso>
      )}

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
    </div>
  )
}
