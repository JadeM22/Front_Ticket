import { Campo, CLASE_INPUT } from '../ui/Campo'
import { FileDrop } from '../ui/FileDrop'
import { ACEPTAR_AFICHE, validarArchivoAfiche, type AficheSeleccionado } from '../../data/afichesIA'

interface SelectorAficheProps {
  valor: AficheSeleccionado
  onCambiar: (valor: AficheSeleccionado) => void
}

/** Archivo del archivo + comentario opcional. Se usa al crear la solicitud y al subir o reenviar desde el detalle. */
export function SelectorAfiche({ valor, onCambiar }: SelectorAficheProps) {
  const error = valor.archivo ? validarArchivoAfiche(valor.archivo) : null

  return (
    <div className="space-y-3">
      <FileDrop
        archivo={valor.archivo}
        onArchivo={(archivo) => onCambiar({ ...valor, archivo })}
        aceptar={ACEPTAR_AFICHE}
        error={error}
        indicacion="Haz clic o arrastra el archivo (PNG, JPG, WEBP o PDF, máx. 10 MB)"
      />
      <Campo etiqueta="Comentario para quien revisa (opcional)">
        <textarea
          className={CLASE_INPUT}
          rows={2}
          value={valor.comentario}
          onChange={(e) => onCambiar({ ...valor, comentario: e.target.value })}
        />
      </Campo>
    </div>
  )
}
