import { Campo, CLASE_INPUT } from '../ui/Campo'
import type {
  DetalleFormularioAfiche,
  DetalleFormularioAviso,
  DetalleFormularioComunicado,
  DetalleFormularioCoberturaEventos,
  DetalleFormularioEdicionFotografica,
  DetalleFormularioPublicacionRedesSociales,
} from '../../types/domain'

const PLATAFORMAS_DISPONIBLES = ['Facebook', 'Instagram', 'X', 'TikTok', 'LinkedIn', 'YouTube', 'Web']

interface PropsCampos<T> {
  valor: T
  onCambiar: (valor: T) => void
}

export function CamposAfiche({ valor, onCambiar }: PropsCampos<DetalleFormularioAfiche>) {
  return (
    <div className="space-y-4">
      <Campo etiqueta="Dimensiones" ayuda="Ej. 60x90 cm, A3">
        <input
          className={CLASE_INPUT}
          required
          value={valor.dimensiones}
          onChange={(e) => onCambiar({ ...valor, dimensiones: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Orientación">
        <select
          className={CLASE_INPUT}
          value={valor.orientacion}
          onChange={(e) => onCambiar({ ...valor, orientacion: e.target.value as DetalleFormularioAfiche['orientacion'] })}
        >
          <option value="Vertical">Vertical</option>
          <option value="Horizontal">Horizontal</option>
        </select>
      </Campo>
      <Campo etiqueta="Texto principal">
        <textarea
          className={CLASE_INPUT}
          required
          rows={4}
          value={valor.texto_principal}
          onChange={(e) => onCambiar({ ...valor, texto_principal: e.target.value })}
        />
      </Campo>
    </div>
  )
}

export function CamposComunicado({ valor, onCambiar }: PropsCampos<DetalleFormularioComunicado>) {
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
      <Campo etiqueta="Contenido del comunicado">
        <textarea
          className={CLASE_INPUT}
          required
          rows={5}
          value={valor.contenido_comunicado}
          onChange={(e) => onCambiar({ ...valor, contenido_comunicado: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Dirigido a" ayuda="Ej. Estudiantes, Docentes">
        <input
          className={CLASE_INPUT}
          required
          value={valor.dirigido_a}
          onChange={(e) => onCambiar({ ...valor, dirigido_a: e.target.value })}
        />
      </Campo>
    </div>
  )
}

export function CamposAviso({ valor, onCambiar }: PropsCampos<DetalleFormularioAviso>) {
  return (
    <div className="space-y-4">
      <Campo etiqueta="Título del aviso">
        <input
          className={CLASE_INPUT}
          required
          value={valor.titulo_aviso}
          onChange={(e) => onCambiar({ ...valor, titulo_aviso: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Urgencia">
        <select
          className={CLASE_INPUT}
          value={valor.urgencia}
          onChange={(e) => onCambiar({ ...valor, urgencia: e.target.value as DetalleFormularioAviso['urgencia'] })}
        >
          <option value="Baja">Baja</option>
          <option value="Media">Media</option>
          <option value="Alta">Alta</option>
        </select>
      </Campo>
      <Campo etiqueta="Medio de difusión" ayuda="Ej. Correo, Pantallas, Web">
        <input
          className={CLASE_INPUT}
          required
          value={valor.medio_difusion}
          onChange={(e) => onCambiar({ ...valor, medio_difusion: e.target.value })}
        />
      </Campo>
    </div>
  )
}

export function CamposCoberturaEventos({ valor, onCambiar }: PropsCampos<DetalleFormularioCoberturaEventos>) {
  return (
    <div className="space-y-4">
      <Campo etiqueta="Nombre del evento">
        <input
          className={CLASE_INPUT}
          required
          value={valor.nombre_evento}
          onChange={(e) => onCambiar({ ...valor, nombre_evento: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Lugar">
        <input
          className={CLASE_INPUT}
          required
          value={valor.lugar}
          onChange={(e) => onCambiar({ ...valor, lugar: e.target.value })}
        />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Fecha y hora de inicio">
          <input
            type="datetime-local"
            className={CLASE_INPUT}
            required
            value={valor.fecha_inicio}
            onChange={(e) => onCambiar({ ...valor, fecha_inicio: e.target.value })}
          />
        </Campo>
        <Campo etiqueta="Fecha y hora de fin">
          <input
            type="datetime-local"
            className={CLASE_INPUT}
            required
            value={valor.fecha_fin}
            onChange={(e) => onCambiar({ ...valor, fecha_fin: e.target.value })}
          />
        </Campo>
      </div>
    </div>
  )
}

export function CamposEdicionFotografica({ valor, onCambiar }: PropsCampos<DetalleFormularioEdicionFotografica>) {
  return (
    <div className="space-y-4">
      <Campo etiqueta="Cantidad de fotos">
        <input
          type="number"
          min={1}
          className={CLASE_INPUT}
          required
          value={valor.cantidad_fotos}
          onChange={(e) => onCambiar({ ...valor, cantidad_fotos: Number(e.target.value) })}
        />
      </Campo>
      <Campo etiqueta="Estilo de edición" ayuda="Ej. Natural, Blanco y negro">
        <input
          className={CLASE_INPUT}
          required
          value={valor.estilo_edicion}
          onChange={(e) => onCambiar({ ...valor, estilo_edicion: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Enlace de Drive con las fotos">
        <input
          type="url"
          className={CLASE_INPUT}
          required
          placeholder="https://drive.google.com/..."
          value={valor.enlace_drive}
          onChange={(e) => onCambiar({ ...valor, enlace_drive: e.target.value })}
        />
      </Campo>
    </div>
  )
}

export function CamposPublicacionRedesSociales({
  valor,
  onCambiar,
}: PropsCampos<DetalleFormularioPublicacionRedesSociales>) {
  function alternarPlataforma(plataforma: string) {
    const yaIncluida = valor.plataformas.includes(plataforma)
    onCambiar({
      ...valor,
      plataformas: yaIncluida ? valor.plataformas.filter((p) => p !== plataforma) : [...valor.plataformas, plataforma],
    })
  }

  return (
    <div className="space-y-4">
      <Campo etiqueta="Plataformas">
        <div className="flex flex-wrap gap-2">
          {PLATAFORMAS_DISPONIBLES.map((plataforma) => {
            const activa = valor.plataformas.includes(plataforma)
            return (
              <button
                key={plataforma}
                type="button"
                onClick={() => alternarPlataforma(plataforma)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors duration-150 ${
                  activa
                    ? 'border-menta-profundo bg-menta-bruma text-menta-profundo'
                    : 'border-azul-niebla text-tinta-suave hover:bg-azul-niebla/40'
                }`}
              >
                {plataforma}
              </button>
            )
          })}
        </div>
      </Campo>
      <Campo etiqueta="Texto / copy">
        <textarea
          className={CLASE_INPUT}
          required
          rows={4}
          value={valor.texto_copy}
          onChange={(e) => onCambiar({ ...valor, texto_copy: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Hora sugerida de publicación (opcional)">
        <input
          type="time"
          className={CLASE_INPUT}
          value={valor.hora_sugerida ?? ''}
          onChange={(e) => onCambiar({ ...valor, hora_sugerida: e.target.value || null })}
        />
      </Campo>
    </div>
  )
}
