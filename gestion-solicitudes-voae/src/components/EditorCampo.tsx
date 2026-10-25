import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { FormularioDinamico } from './formularios/FormularioDinamico'
import { actualizarCampo, crearCampo, type CampoFormulario } from '../data/camposFormulario'
import { claveDesdeEtiqueta, REGEX_CLAVE_CAMPO } from '../lib/claveCampo'
import { mensajeError } from '../lib/errors'
import { estaVacio, normalizarCampo, validarCampo } from '../lib/validacionFormularios'
import type { Json } from '../types/database'
import { TIPOS_CAMPO, type DefinicionCampo, type TipoCampo, type ValidacionesCampo, type ValorCampo } from '../types/domain'

interface EditorCampoProps {
  tipoSolicitudId: number
  /** `null` = crear uno nuevo. */
  campo: CampoFormulario | null
  /** Todos los campos del tipo (activos e inactivos), para validar la clave y calcular el orden. */
  existentes: CampoFormulario[]
  onGuardado: () => void
  onCancelar: () => void
}

const CON_OPCIONES = new Set<TipoCampo>(['SELECCION', 'SELECCION_MULTIPLE', 'ETIQUETAS'])
const CON_LONGITUD = new Set<TipoCampo>(['TEXTO', 'TEXTO_LARGO', 'URL', 'ETIQUETAS'])

function etiquetaTipo(tipo: string): string {
  return TIPOS_CAMPO.find((t) => t.valor === tipo)?.etiqueta ?? tipo
}

function numeroOVacio(valor: unknown): string {
  return typeof valor === 'number' ? String(valor) : ''
}

/** `valor_defecto` tal como lo guarda la base (jsonb): vacío → null, números como número. */
function defectoParaGuardar(tipo: TipoCampo, valor: ValorCampo): Json {
  if (estaVacio(valor)) return null
  if (tipo === 'BOOLEANO') return valor === true ? true : null
  if (tipo === 'NUMERO') return Number(valor)
  if (typeof valor === 'string') return valor.trim()
  return valor as Json
}

/**
 * Formulario para crear o editar un `CampoFormulario`. Al editar, `clave` y `tipo_campo` se muestran
 * pero no se pueden cambiar (la base lo rechazaría). Al crear, la clave se genera desde la etiqueta
 * hasta que el Administrador la escribe a mano.
 */
export function EditorCampo({ tipoSolicitudId, campo, existentes, onGuardado, onCancelar }: EditorCampoProps) {
  const esNuevo = campo === null
  const inicial = campo ? normalizarCampo(campo) : null

  const [etiqueta, setEtiqueta] = useState(campo?.etiqueta ?? '')
  const [clave, setClave] = useState(campo?.clave ?? '')
  const [claveManual, setClaveManual] = useState(!esNuevo)
  const [tipoCampo, setTipoCampo] = useState<TipoCampo>(inicial?.tipo_campo ?? 'TEXTO')
  const [placeholder, setPlaceholder] = useState(campo?.placeholder ?? '')
  const [ayuda, setAyuda] = useState(campo?.ayuda ?? '')
  const [obligatorio, setObligatorio] = useState(campo?.obligatorio ?? false)
  const [opcionesTexto, setOpcionesTexto] = useState((inicial?.opciones ?? []).join('\n'))
  const [min, setMin] = useState(numeroOVacio(inicial?.validaciones.min))
  const [max, setMax] = useState(numeroOVacio(inicial?.validaciones.max))
  const [maxLongitud, setMaxLongitud] = useState(numeroOVacio(inicial?.validaciones.max_longitud))
  const [valorDefecto, setValorDefecto] = useState<ValorCampo>(inicial?.valor_defecto ?? null)
  const [guardando, setGuardando] = useState(false)

  const opciones = opcionesTexto
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean)

  const validaciones: ValidacionesCampo = {}
  if (tipoCampo === 'NUMERO') {
    if (min.trim() !== '') validaciones.min = Number(min)
    if (max.trim() !== '') validaciones.max = Number(max)
  }
  // En ETIQUETAS, `max` es la cantidad máxima de elementos.
  if (tipoCampo === 'ETIQUETAS' && max.trim() !== '') validaciones.max = Number(max)
  if (CON_LONGITUD.has(tipoCampo) && maxLongitud.trim() !== '') validaciones.max_longitud = Number(maxLongitud)

  // Definición "en vivo" para el control del valor por defecto: el mismo control que verá el solicitante.
  const definicionDefecto: DefinicionCampo = {
    clave: 'valor_defecto',
    etiqueta: 'Valor por defecto (opcional)',
    tipo_campo: tipoCampo,
    placeholder: null,
    ayuda: tipoCampo === 'BOOLEANO' ? 'Marcado = el campo inicia en "Sí".' : null,
    opciones,
    valor_defecto: null,
    validaciones,
    obligatorio: false,
    orden: 0,
  }

  function cambiarEtiqueta(valor: string) {
    setEtiqueta(valor)
    if (esNuevo && !claveManual) setClave(claveDesdeEtiqueta(valor))
  }

  function cambiarTipo(valor: TipoCampo) {
    setTipoCampo(valor)
    // El valor por defecto de un tipo no sirve para otro (p. ej. un texto en un BOOLEANO).
    setValorDefecto(null)
  }

  function validar(): string | null {
    if (!etiqueta.trim()) return 'Escribe la etiqueta del campo.'
    if (esNuevo) {
      if (!REGEX_CLAVE_CAMPO.test(clave)) {
        return 'La clave debe iniciar con una letra minúscula y solo llevar minúsculas, números y guiones bajos.'
      }
      if (existentes.some((c) => c.clave === clave)) return `Ya existe un campo con la clave "${clave}" en este tipo.`
    }
    if (CON_OPCIONES.has(tipoCampo)) {
      // En ETIQUETAS las opciones son solo sugerencias, así que pueden faltar.
      if (opciones.length === 0 && tipoCampo !== 'ETIQUETAS') return 'Agrega al menos una opción.'
      if (new Set(opciones).size !== opciones.length) return 'Hay opciones repetidas.'
    }
    for (const [nombre, valor] of [
      ['mínimo', min],
      ['máximo', max],
      ['longitud máxima', maxLongitud],
    ] as const) {
      if (valor.trim() !== '' && !Number.isFinite(Number(valor))) return `El ${nombre} debe ser un número.`
    }
    // La base no admite mínimos ni máximos negativos (Parte 31).
    if ((validaciones.min ?? 0) < 0 || (validaciones.max ?? 0) < 0) {
      return 'El mínimo y el máximo no pueden ser negativos.'
    }
    if (validaciones.min !== undefined && validaciones.max !== undefined && validaciones.min > validaciones.max) {
      return 'El mínimo no puede ser mayor que el máximo.'
    }
    if (tipoCampo === 'ETIQUETAS' && validaciones.max !== undefined && (!Number.isInteger(validaciones.max) || validaciones.max < 1)) {
      return 'La cantidad máxima de elementos debe ser un número entero mayor o igual a 1.'
    }
    // La base la convierte a `int` al validar: un decimal haría fallar todos los envíos de este tipo.
    if (validaciones.max_longitud !== undefined && (!Number.isInteger(validaciones.max_longitud) || validaciones.max_longitud < 1)) {
      return 'La longitud máxima debe ser un número entero mayor o igual a 1.'
    }
    const errorDefecto = validarCampo(definicionDefecto, valorDefecto)
    if (errorDefecto) return errorDefecto
    return null
  }

  async function guardar() {
    const error = validar()
    if (error) {
      toast.error(error)
      return
    }
    setGuardando(true)
    const comunes = {
      etiqueta: etiqueta.trim(),
      placeholder: placeholder.trim() || null,
      ayuda: ayuda.trim() || null,
      obligatorio: tipoCampo === 'BOOLEANO' ? false : obligatorio,
      opciones: CON_OPCIONES.has(tipoCampo) ? opciones : null,
      valor_defecto: defectoParaGuardar(tipoCampo, valorDefecto),
      validaciones: Object.keys(validaciones).length > 0 ? (validaciones as Json) : null,
    }
    try {
      if (campo) {
        await actualizarCampo(campo.id, comunes)
      } else {
        await crearCampo({
          ...comunes,
          tipo_solicitud_id: tipoSolicitudId,
          clave,
          tipo_campo: tipoCampo,
          orden: existentes.reduce((maximo, c) => Math.max(maximo, c.orden), 0) + 1,
          estado: true,
        })
      }
      toast.success(campo ? 'Campo actualizado.' : 'Campo creado.')
      onGuardado()
    } catch (err) {
      toast.error(await mensajeError(err, 'No se pudo guardar el campo.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Etiqueta *" ayuda="Lo que ve el solicitante.">
          <input className={CLASE_INPUT} value={etiqueta} onChange={(e) => cambiarEtiqueta(e.target.value)} />
        </Campo>

        {esNuevo ? (
          <Campo etiqueta="Clave *" ayuda="Se genera desde la etiqueta. No se puede cambiar después de guardar.">
            <input
              className={`${CLASE_INPUT} font-mono`}
              value={clave}
              onChange={(e) => {
                setClaveManual(true)
                setClave(e.target.value)
              }}
            />
          </Campo>
        ) : (
          <SoloLectura etiqueta="Clave" valor={clave} mono />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {esNuevo ? (
          <Campo etiqueta="Tipo de campo *" ayuda="No se puede cambiar después de guardar.">
            <select className={CLASE_INPUT} value={tipoCampo} onChange={(e) => cambiarTipo(e.target.value as TipoCampo)}>
              {TIPOS_CAMPO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        ) : (
          <SoloLectura etiqueta="Tipo de campo" valor={etiquetaTipo(tipoCampo)} />
        )}

        {tipoCampo !== 'BOOLEANO' && (
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-tinta">
            <input type="checkbox" checked={obligatorio} onChange={(e) => setObligatorio(e.target.checked)} />
            Obligatorio
          </label>
        )}
      </div>

      {tipoCampo !== 'BOOLEANO' && (
        <Campo etiqueta="Texto de ejemplo (placeholder)">
          <input className={CLASE_INPUT} value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
        </Campo>
      )}

      <Campo etiqueta="Ayuda" ayuda="Texto pequeño que aparece debajo del campo.">
        <input className={CLASE_INPUT} value={ayuda} onChange={(e) => setAyuda(e.target.value)} />
      </Campo>

      {CON_OPCIONES.has(tipoCampo) && (
        <Campo
          etiqueta={tipoCampo === 'ETIQUETAS' ? 'Sugerencias (opcional)' : 'Opciones *'}
          ayuda={
            tipoCampo === 'ETIQUETAS'
              ? 'Una por línea. Se ofrecen como atajos; el solicitante puede escribir otras.'
              : 'Una opción por línea, en el orden en que se mostrarán.'
          }
        >
          <textarea className={CLASE_INPUT} rows={4} value={opcionesTexto} onChange={(e) => setOpcionesTexto(e.target.value)} />
        </Campo>
      )}

      {tipoCampo === 'NUMERO' && (
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Mínimo">
            <input type="number" min={0} className={CLASE_INPUT} value={min} onChange={(e) => setMin(e.target.value)} />
          </Campo>
          <Campo etiqueta="Máximo">
            <input type="number" min={0} className={CLASE_INPUT} value={max} onChange={(e) => setMax(e.target.value)} />
          </Campo>
        </div>
      )}

      {tipoCampo === 'ETIQUETAS' && (
        <Campo etiqueta="Cantidad máxima de elementos (opcional)">
          <input type="number" min={1} className={CLASE_INPUT} value={max} onChange={(e) => setMax(e.target.value)} />
        </Campo>
      )}

      {CON_LONGITUD.has(tipoCampo) && (
        <Campo
          etiqueta={tipoCampo === 'ETIQUETAS' ? 'Longitud máxima de cada elemento' : 'Longitud máxima (caracteres)'}
          ayuda={tipoCampo === 'ETIQUETAS' ? 'Si se deja vacía, 100 caracteres.' : undefined}
        >
          <input
            type="number"
            min={1}
            className={CLASE_INPUT}
            value={maxLongitud}
            onChange={(e) => setMaxLongitud(e.target.value)}
          />
        </Campo>
      )}

      <div className="rounded-lg bg-azul-niebla/30 p-3">
        <FormularioDinamico
          campos={[definicionDefecto]}
          respuestas={{ valor_defecto: valorDefecto }}
          onCambiar={(r) => setValorDefecto(r.valor_defecto ?? null)}
          mostrarErrores
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button onClick={guardar} cargando={guardando}>
          {esNuevo ? 'Crear campo' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}

function SoloLectura({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-tinta">{etiqueta}</p>
      <p className={`rounded-lg bg-azul-niebla/50 px-3 py-2 text-sm text-tinta-suave ${mono ? 'font-mono' : ''}`}>{valor}</p>
      <p className="mt-1 text-xs text-tinta-suave">No se puede cambiar.</p>
    </div>
  )
}
