import { Campo, CLASE_INPUT } from '../../ui/Campo'
import { Aviso } from '../Aviso'
import { hoyTegucigalpaISO } from '../../../lib/date'
import type { DetalleProtocolo } from '../../../types/domain'

interface Props {
  valor: DetalleProtocolo
  onCambiar: (valor: DetalleProtocolo) => void
}

export function CamposProtocolo({ valor, onCambiar }: Props) {
  return (
    <div className="space-y-4">
      <Campo etiqueta="Nombre de la actividad">
        <input
          className={CLASE_INPUT}
          required
          value={valor.nombre_actividad}
          onChange={(e) => onCambiar({ ...valor, nombre_actividad: e.target.value })}
        />
      </Campo>

      <Campo etiqueta="Lugar propuesto" ayuda="Propuesta de lugares según la cantidad de invitados.">
        <input
          className={CLASE_INPUT}
          required
          value={valor.lugar_propuesto}
          onChange={(e) => onCambiar({ ...valor, lugar_propuesto: e.target.value })}
        />
      </Campo>

      <Campo etiqueta="Cantidad de invitados (opcional)">
        <input
          type="number"
          min={1}
          className={CLASE_INPUT}
          value={valor.cantidad_invitados ?? ''}
          onChange={(e) => onCambiar({ ...valor, cantidad_invitados: e.target.value ? Number(e.target.value) : null })}
        />
      </Campo>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Fecha">
          <input
            type="date"
            min={hoyTegucigalpaISO()}
            className={CLASE_INPUT}
            required
            value={valor.fecha}
            onChange={(e) => onCambiar({ ...valor, fecha: e.target.value })}
          />
        </Campo>
        <Campo etiqueta="Hora">
          <input
            type="time"
            className={CLASE_INPUT}
            required
            value={valor.hora}
            onChange={(e) => onCambiar({ ...valor, hora: e.target.value })}
          />
        </Campo>
      </div>

      <label className="flex items-center gap-2 text-sm text-tinta">
        <input
          type="checkbox"
          checked={valor.elaborar_invitacion}
          onChange={(e) => onCambiar({ ...valor, elaborar_invitacion: e.target.checked })}
        />
        Elaborar invitación
      </label>

      <Campo etiqueta="Información del programa">
        <textarea
          className={CLASE_INPUT}
          rows={3}
          value={valor.informacion_programa ?? ''}
          onChange={(e) => onCambiar({ ...valor, informacion_programa: e.target.value || null })}
        />
      </Campo>

      <label className="flex items-center gap-2 text-sm text-tinta">
        <input
          type="checkbox"
          checked={valor.necesita_maestro_ceremonia}
          onChange={(e) => onCambiar({ ...valor, necesita_maestro_ceremonia: e.target.checked })}
        />
        Necesita maestro de ceremonia
      </label>
      {valor.necesita_maestro_ceremonia && (
        <Campo etiqueta="Maestro de ceremonia preferido">
          <input
            className={CLASE_INPUT}
            required
            value={valor.maestro_ceremonia_preferido ?? ''}
            onChange={(e) => onCambiar({ ...valor, maestro_ceremonia_preferido: e.target.value || null })}
          />
        </Campo>
      )}

      <Campo etiqueta="Equipo requerido" ayuda="Micrófonos, parlantes, manteles…">
        <textarea
          className={CLASE_INPUT}
          rows={2}
          value={valor.equipo_requerido ?? ''}
          onChange={(e) => onCambiar({ ...valor, equipo_requerido: e.target.value || null })}
        />
      </Campo>
      {valor.equipo_requerido?.trim() && <Aviso>Llene también la solicitud de préstamo de equipo.</Aviso>}

      <label className="flex items-center gap-2 text-sm text-tinta">
        <input
          type="checkbox"
          checked={valor.necesita_edecanes}
          onChange={(e) => onCambiar({ ...valor, necesita_edecanes: e.target.checked })}
        />
        Necesita edecanes
      </label>
      {valor.necesita_edecanes && (
        <Aviso>Haga la solicitud al programa PASEE (Xenia Galeas y Allan Villacorta).</Aviso>
      )}

      <label className="flex items-center gap-2 text-sm text-tinta">
        <input
          type="checkbox"
          checked={valor.necesita_pumas}
          onChange={(e) => onCambiar({ ...valor, necesita_pumas: e.target.checked })}
        />
        Necesita Pumas
      </label>
      {valor.necesita_pumas && (
        <Aviso>
          Debe hacer la solicitud a Odalis Sánchez en Mercadeo DIRCOM y gestionar con el programa PASEE los
          estudiantes que usarán los trajes.
        </Aviso>
      )}
    </div>
  )
}
