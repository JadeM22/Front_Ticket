import { Campo, CLASE_INPUT } from '../../ui/Campo'
import { EtiquetasInput } from '../EtiquetasInput'
import { Aviso } from '../Aviso'
import { hoyTegucigalpaISO } from '../../../lib/date'
import type { DetalleDircom } from '../../../types/domain'

interface Props {
  valor: DetalleDircom
  onCambiar: (valor: DetalleDircom) => void
}

export function CamposDircom({ valor, onCambiar }: Props) {
  return (
    <div className="space-y-4">
      <Campo
        etiqueta="Tipo de material"
        ayuda="Ej. campaña publicitaria, cruza-calles, banner volador, medallas, trofeos, trifolios, logos, línea gráfica."
      >
        <input
          className={CLASE_INPUT}
          required
          value={valor.tipo_material}
          onChange={(e) => onCambiar({ ...valor, tipo_material: e.target.value })}
        />
      </Campo>

      <Campo etiqueta="Fecha en que lo necesitas">
        <input
          type="date"
          min={hoyTegucigalpaISO()}
          className={CLASE_INPUT}
          required
          value={valor.fecha_necesaria}
          onChange={(e) => onCambiar({ ...valor, fecha_necesaria: e.target.value })}
        />
      </Campo>
      <Aviso>Depende de la cantidad de trabajo y disposición del equipo de diseño en DIRCOM.</Aviso>

      <Campo etiqueta="Contexto y valor del requerimiento" ayuda="Da contexto sobre el requerimiento y lo que buscas priorizar.">
        <textarea
          className={CLASE_INPUT}
          required
          rows={4}
          value={valor.informacion_valor}
          onChange={(e) => onCambiar({ ...valor, informacion_valor: e.target.value })}
        />
      </Campo>

      <label className="flex items-center gap-2 text-sm text-tinta">
        <input
          type="checkbox"
          checked={valor.necesita_dictamen}
          onChange={(e) => onCambiar({ ...valor, necesita_dictamen: e.target.checked })}
        />
        Necesita dictamen
      </label>

      <Campo etiqueta="Logotipos">
        <EtiquetasInput valores={valor.logotipos} onCambiar={(logotipos) => onCambiar({ ...valor, logotipos })} />
      </Campo>
    </div>
  )
}
