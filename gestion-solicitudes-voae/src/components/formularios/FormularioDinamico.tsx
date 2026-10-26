import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Campo, CLASE_INPUT } from '../ui/Campo'
import { FechaInput } from '../ui/FechaInput'
import { HoraInput } from '../ui/HoraInput'
import { EtiquetasInput } from './EtiquetasInput'
import { InputNumero } from '../form/InputNumero'
import { VistaPreviaEnlace } from '../ui/VistaPreviaEnlace'
import { hoyTegucigalpaISO } from '../../lib/date'
import { esDiaHabil } from '../../lib/fechas'
import { MAX_LONGITUD_ETIQUETA, validarCampo } from '../../lib/validacionFormularios'
import { listarFeriados, type Feriado } from '../../data/catalogos'
import type { DefinicionCampo, Respuestas, ValorCampo } from '../../types/domain'

interface FormularioDinamicoProps {
  campos: DefinicionCampo[]
  respuestas: Respuestas
  onCambiar: (respuestas: Respuestas) => void
  /** Se activa tras el primer intento de continuar, para no marcar en rojo un formulario recién abierto. */
  mostrarErrores?: boolean
}

/**
 * Dibuja cualquier formulario a partir de su lista de campos (`CampoFormulario` o
 * `campos_snapshot`). Ningún campo de solicitud se escribe a mano en el código: todo sale de aquí.
 */
export function FormularioDinamico({ campos, respuestas, onCambiar, mostrarErrores = false }: FormularioDinamicoProps) {
  // Para que los campos FECHA deshabiliten fines de semana y feriados, igual que la fecha del evento.
  const { data: feriados = [] } = useQuery({ queryKey: ['catalogos', 'feriados'], queryFn: listarFeriados })

  if (campos.length === 0) return null

  return (
    <div className="space-y-4">
      {campos.map((campo) => (
        <CampoDinamico
          key={campo.clave}
          campo={campo}
          valor={respuestas[campo.clave] ?? null}
          error={mostrarErrores ? validarCampo(campo, respuestas[campo.clave]) : null}
          feriados={feriados}
          onCambiar={(valor) => onCambiar({ ...respuestas, [campo.clave]: valor })}
        />
      ))}
    </div>
  )
}

interface CampoDinamicoProps {
  campo: DefinicionCampo
  valor: ValorCampo
  error: string | null
  feriados: Feriado[]
  onCambiar: (valor: ValorCampo) => void
}

function etiquetaDe(campo: DefinicionCampo): string {
  return campo.obligatorio ? `${campo.etiqueta} *` : campo.etiqueta
}

function ayudaDe(campo: DefinicionCampo, texto: string): string | undefined {
  const { max_longitud } = campo.validaciones
  const partes = [campo.ayuda]
  if (max_longitud !== undefined && (campo.tipo_campo === 'TEXTO' || campo.tipo_campo === 'TEXTO_LARGO')) {
    partes.push(`${texto.length} / ${max_longitud}`)
  }
  const ayuda = partes.filter(Boolean).join(' · ')
  return ayuda || undefined
}

/** Para controles con varios inputs (checkboxes): un `<label>` envolvente activaría solo el primero. */
function Grupo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string | null; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-tinta">{etiqueta}</legend>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-tinta-suave">{ayuda}</span>}
    </fieldset>
  )
}

function CampoDinamico({ campo, valor, error, feriados, onCambiar }: CampoDinamicoProps) {
  const claseInput = `${CLASE_INPUT} ${error ? 'border-coral' : ''}`
  const texto = typeof valor === 'string' || typeof valor === 'number' ? String(valor) : ''
  const placeholder = campo.placeholder ?? undefined
  const { min, max, max_longitud } = campo.validaciones

  let control: ReactNode

  switch (campo.tipo_campo) {
    case 'TEXTO':
      control = (
        <Campo etiqueta={etiquetaDe(campo)} ayuda={ayudaDe(campo, texto)}>
          <input
            className={claseInput}
            value={texto}
            placeholder={placeholder}
            maxLength={max_longitud}
            onChange={(e) => onCambiar(e.target.value)}
          />
        </Campo>
      )
      break
    case 'TEXTO_LARGO':
      control = (
        <Campo etiqueta={etiquetaDe(campo)} ayuda={ayudaDe(campo, texto)}>
          <textarea
            className={claseInput}
            rows={3}
            value={texto}
            placeholder={placeholder}
            maxLength={max_longitud}
            onChange={(e) => onCambiar(e.target.value)}
          />
        </Campo>
      )
      break
    case 'URL':
      control = (
        <Campo etiqueta={etiquetaDe(campo)} ayuda={ayudaDe(campo, texto)}>
          <input
            type="text"
            inputMode="url"
            className={claseInput}
            value={texto}
            placeholder={placeholder ?? 'drive.google.com/…'}
            maxLength={max_longitud}
            onChange={(e) => onCambiar(e.target.value)}
          />
          <VistaPreviaEnlace valor={texto} />
        </Campo>
      )
      break
    case 'NUMERO':
      control = (
        <Campo etiqueta={etiquetaDe(campo)} ayuda={ayudaDe(campo, texto)}>
          <InputNumero
            permiteDecimales
            className={claseInput}
            value={texto}
            placeholder={placeholder}
            min={min}
            max={max}
            mostrarError={!error}
            onChange={onCambiar}
          />
        </Campo>
      )
      break
    case 'FECHA':
      control = (
        <Campo etiqueta={etiquetaDe(campo)} ayuda={ayudaDe(campo, texto)}>
          <FechaInput
            valor={texto}
            onCambiar={onCambiar}
            min={hoyTegucigalpaISO()}
            diaInhabilitado={(iso) => !esDiaHabil(iso, feriados)}
          />
        </Campo>
      )
      break
    case 'HORA':
      control = (
        <Campo etiqueta={etiquetaDe(campo)} ayuda={ayudaDe(campo, texto)}>
          <HoraInput valor={texto} onCambiar={onCambiar} />
        </Campo>
      )
      break
    case 'BOOLEANO':
      control = (
        <div>
          <label className="flex items-center gap-2 text-sm text-tinta">
            <input type="checkbox" checked={valor === true} onChange={(e) => onCambiar(e.target.checked)} />
            {campo.etiqueta}
          </label>
          {campo.ayuda && <span className="mt-1 block text-xs text-tinta-suave">{campo.ayuda}</span>}
        </div>
      )
      break
    case 'SELECCION':
      control = (
        <Campo etiqueta={etiquetaDe(campo)} ayuda={campo.ayuda ?? undefined}>
          <select className={claseInput} value={texto} onChange={(e) => onCambiar(e.target.value)}>
            <option value="">{placeholder ?? (campo.obligatorio ? 'Elige una opción' : 'Sin especificar')}</option>
            {campo.opciones.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </Campo>
      )
      break
    case 'SELECCION_MULTIPLE': {
      const seleccion = Array.isArray(valor) ? valor : []
      control = (
        <Grupo etiqueta={etiquetaDe(campo)} ayuda={campo.ayuda}>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {campo.opciones.map((opcion) => (
              <label key={opcion} className="flex items-center gap-2 text-sm text-tinta">
                <input
                  type="checkbox"
                  checked={seleccion.includes(opcion)}
                  onChange={(e) =>
                    // Se conserva el orden de `opciones`, no el orden en que se marcaron.
                    onCambiar(
                      campo.opciones.filter((o) => (o === opcion ? e.target.checked : seleccion.includes(o))),
                    )
                  }
                />
                {opcion}
              </label>
            ))}
          </div>
        </Grupo>
      )
      break
    }
    case 'ETIQUETAS': {
      const lista = Array.isArray(valor) ? valor : []
      control = (
        <Grupo etiqueta={etiquetaDe(campo)} ayuda={campo.ayuda}>
          <EtiquetasInput
            valores={lista}
            onCambiar={onCambiar}
            sugerencias={campo.opciones}
            placeholder={placeholder}
            maxLongitud={max_longitud ?? MAX_LONGITUD_ETIQUETA}
            maximo={max}
            invalido={Boolean(error)}
          />
        </Grupo>
      )
      break
    }
  }

  return (
    <div>
      {control}
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </div>
  )
}
