import { hoyTegucigalpaISO } from './date'
import { esUrlHttp } from './archivos'
import type { Json } from '../types/database'
import type {
  DefinicionCampo,
  DetalleSolicitud,
  EtiquetasGenerales,
  Respuestas,
  TipoCampo,
  ValidacionesCampo,
  ValorCampo,
} from '../types/domain'

/**
 * Validación del lado del cliente solo para dar feedback inmediato: replica las reglas de
 * `fnSolicitudCrearEscalar`, pero el mensaje de la base es siempre el definitivo.
 */

const TIPOS_CAMPO = new Set<TipoCampo>([
  'TEXTO',
  'TEXTO_LARGO',
  'NUMERO',
  'FECHA',
  'HORA',
  'BOOLEANO',
  'SELECCION',
  'SELECCION_MULTIPLE',
  'URL',
  'ETIQUETAS',
])

/** Tipos cuyo valor es una lista de textos. */
const TIPOS_LISTA = new Set<TipoCampo>(['SELECCION_MULTIPLE', 'ETIQUETAS'])

/** Largo máximo de cada elemento de un campo ETIQUETAS cuando no trae `max_longitud` (igual que la base). */
export const MAX_LONGITUD_ETIQUETA = 100

const ETIQUETAS_GENERALES_POR_DEFECTO: EtiquetasGenerales = {
  titulo: 'Título',
  fecha_evento: 'Fecha del evento',
  dirigido_a: 'Dirigido a',
  alcance: 'Alcance',
}

/**
 * Nombres visibles de las generalidades de un tipo (`TipoSolicitud.etiquetas_generales`, p. ej.
 * "Fecha de entrega" en lugar de "Fecha del evento"); lo que no esté definido usa el nombre de siempre.
 */
export function etiquetasGenerales(json: Json | null | undefined): EtiquetasGenerales {
  const crudo: Record<string, Json | undefined> = json && typeof json === 'object' && !Array.isArray(json) ? json : {}
  const resultado = { ...ETIQUETAS_GENERALES_POR_DEFECTO }
  for (const clave of Object.keys(resultado) as (keyof EtiquetasGenerales)[]) {
    const valor = crudo[clave]
    if (typeof valor === 'string' && valor.trim()) resultado[clave] = valor.trim()
  }
  return resultado
}

interface CampoCrudo {
  clave?: unknown
  etiqueta?: unknown
  tipo_campo?: unknown
  placeholder?: unknown
  ayuda?: unknown
  opciones?: unknown
  valor_defecto?: unknown
  validaciones?: unknown
  obligatorio?: unknown
  orden?: unknown
}

function comoNumero(valor: unknown): number | undefined {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim() !== '' && Number.isFinite(Number(valor))) return Number(valor)
  return undefined
}

function comoValor(valor: unknown): ValorCampo {
  if (valor == null) return null
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') return valor
  if (Array.isArray(valor)) return valor.map(String)
  return null
}

/**
 * Normaliza una fila de `CampoFormulario` o un elemento de `Formularios.campos_snapshot` (jsonb sin
 * tipo) a `DefinicionCampo`. Devuelve `null` si el elemento no trae lo mínimo para dibujarse.
 */
export function normalizarCampo(crudo: unknown): DefinicionCampo | null {
  if (!crudo || typeof crudo !== 'object') return null
  const c = crudo as CampoCrudo
  if (typeof c.clave !== 'string' || !TIPOS_CAMPO.has(c.tipo_campo as TipoCampo)) return null

  const v = (c.validaciones && typeof c.validaciones === 'object' ? c.validaciones : {}) as Record<string, unknown>
  const validaciones: ValidacionesCampo = {}
  const min = comoNumero(v.min)
  const max = comoNumero(v.max)
  const maxLongitud = comoNumero(v.max_longitud)
  if (min !== undefined) validaciones.min = min
  if (max !== undefined) validaciones.max = max
  if (maxLongitud !== undefined) validaciones.max_longitud = maxLongitud

  return {
    clave: c.clave,
    etiqueta: typeof c.etiqueta === 'string' && c.etiqueta ? c.etiqueta : c.clave,
    tipo_campo: c.tipo_campo as TipoCampo,
    placeholder: typeof c.placeholder === 'string' && c.placeholder ? c.placeholder : null,
    ayuda: typeof c.ayuda === 'string' && c.ayuda ? c.ayuda : null,
    opciones: Array.isArray(c.opciones) ? c.opciones.map(String) : [],
    valor_defecto: comoValor(c.valor_defecto),
    validaciones,
    obligatorio: c.obligatorio === true,
    orden: comoNumero(c.orden) ?? 0,
  }
}

export function normalizarCampos(crudos: readonly unknown[]): DefinicionCampo[] {
  return crudos
    .map(normalizarCampo)
    .filter((c): c is DefinicionCampo => c !== null)
    .sort((a, b) => a.orden - b.orden)
}

/** Valor "vacío" del control de cada tipo, para cuando el campo no tiene `valor_defecto`. */
function valorVacio(tipo: TipoCampo): ValorCampo {
  if (tipo === 'BOOLEANO') return false
  if (TIPOS_LISTA.has(tipo)) return []
  return ''
}

/** Respuestas iniciales del formulario: `valor_defecto` de cada campo, o el vacío de su control. */
export function respuestasIniciales(campos: DefinicionCampo[]): Respuestas {
  const respuestas: Respuestas = {}
  for (const campo of campos) {
    const defecto = campo.valor_defecto
    if (defecto == null) {
      respuestas[campo.clave] = valorVacio(campo.tipo_campo)
    } else if (TIPOS_LISTA.has(campo.tipo_campo)) {
      respuestas[campo.clave] = Array.isArray(defecto) ? defecto : [String(defecto)]
    } else if (campo.tipo_campo === 'BOOLEANO') {
      respuestas[campo.clave] = defecto === true || defecto === 'true'
    } else {
      respuestas[campo.clave] = Array.isArray(defecto) ? defecto.join(', ') : String(defecto)
    }
  }
  return respuestas
}

export function estaVacio(valor: ValorCampo | undefined): boolean {
  if (valor == null) return true
  if (typeof valor === 'string') return valor.trim() === ''
  if (Array.isArray(valor)) return valor.length === 0
  return false
}

/**
 * Lo que se envía en `p_detalle.respuestas`: solo las claves de los campos de este tipo, sin los
 * vacíos (la base aplica el `valor_defecto` a lo que no llega), con los números como número.
 */
export function respuestasParaEnviar(campos: DefinicionCampo[], respuestas: Respuestas): Record<string, Json> {
  const salida: Record<string, Json> = {}
  for (const campo of campos) {
    const valor = respuestas[campo.clave]
    if (estaVacio(valor)) continue
    if (campo.tipo_campo === 'NUMERO') {
      salida[campo.clave] = Number(valor)
    } else if (typeof valor === 'string') {
      salida[campo.clave] = valor.trim()
    } else {
      salida[campo.clave] = valor as Json
    }
  }
  return salida
}

/** Primer error de un campo, o `null`. Mismas reglas que la base, en el mismo orden. */
export function validarCampo(campo: DefinicionCampo, valor: ValorCampo | undefined): string | null {
  const etiqueta = campo.etiqueta
  if (estaVacio(valor)) {
    // Un BOOLEANO nunca está "vacío" (false es una respuesta), así que esto solo aplica al resto.
    return campo.obligatorio ? `Completa "${etiqueta}".` : null
  }

  const { min, max, max_longitud } = campo.validaciones

  switch (campo.tipo_campo) {
    case 'TEXTO':
    case 'TEXTO_LARGO':
    case 'URL': {
      const texto = String(valor).trim()
      if (max_longitud !== undefined && texto.length > max_longitud) {
        return `"${etiqueta}" admite como máximo ${max_longitud} caracteres.`
      }
      if (campo.tipo_campo === 'URL' && !esUrlHttp(texto)) {
        return `"${etiqueta}" debe ser un enlace que inicie con http:// o https://.`
      }
      return null
    }
    case 'NUMERO': {
      const numero = Number(valor)
      if (!Number.isFinite(numero)) return `"${etiqueta}" debe ser un número.`
      if (min !== undefined && numero < min) return `"${etiqueta}" debe ser al menos ${min}.`
      if (max !== undefined && numero > max) return `"${etiqueta}" debe ser como máximo ${max}.`
      return null
    }
    case 'FECHA':
      return String(valor) < hoyTegucigalpaISO() ? `"${etiqueta}" no puede ser una fecha pasada.` : null
    case 'SELECCION':
      return campo.opciones.includes(String(valor)) ? null : `Elige una opción válida en "${etiqueta}".`
    case 'SELECCION_MULTIPLE':
      return (valor as string[]).every((v) => campo.opciones.includes(v))
        ? null
        : `Hay opciones no válidas en "${etiqueta}".`
    case 'ETIQUETAS': {
      // Las opciones son solo sugerencias: se admite cualquier texto.
      const lista = valor as string[]
      const largo = max_longitud ?? MAX_LONGITUD_ETIQUETA
      if (lista.some((v) => v.trim().length > largo)) {
        return `Cada elemento de "${etiqueta}" puede tener como máximo ${largo} caracteres.`
      }
      if (max !== undefined && lista.length > max) return `"${etiqueta}" admite como máximo ${max} elementos.`
      return null
    }
    default:
      return null
  }
}

/** Límite de `titulo` y `dirigido_a` en `fnSolicitudCrearEscalar`. */
export const MAX_LONGITUD_GENERALIDAD = 200

export interface Generalidades {
  titulo: string
  fecha_evento: string
  dirigido_a: string
  campus_ids: number[]
}

export function generalidadesIniciales(): Generalidades {
  return { titulo: '', fecha_evento: '', dirigido_a: '', campus_ids: [] }
}

export function validarGeneralidades(
  g: Generalidades,
  etiquetas: EtiquetasGenerales = ETIQUETAS_GENERALES_POR_DEFECTO,
): string | null {
  if (!g.titulo.trim()) return `Completa "${etiquetas.titulo}".`
  if (g.titulo.trim().length > MAX_LONGITUD_GENERALIDAD) {
    return `"${etiquetas.titulo}" no puede tener más de ${MAX_LONGITUD_GENERALIDAD} caracteres.`
  }
  if (!g.fecha_evento) return `Elige la ${etiquetas.fecha_evento.toLowerCase()}.`
  if (g.fecha_evento < hoyTegucigalpaISO()) return `"${etiquetas.fecha_evento}" no puede ser una fecha pasada.`
  if (!g.dirigido_a.trim()) return `Completa "${etiquetas.dirigido_a}".`
  if (g.dirigido_a.trim().length > MAX_LONGITUD_GENERALIDAD) {
    return `"${etiquetas.dirigido_a}" no puede tener más de ${MAX_LONGITUD_GENERALIDAD} caracteres.`
  }
  if (g.campus_ids.length === 0) return `Elige al menos un campus en "${etiquetas.alcance}".`
  return null
}

/** Primer error de las generalidades o de los campos configurables, o `null`. */
export function validarSolicitud(
  g: Generalidades,
  campos: DefinicionCampo[],
  respuestas: Respuestas,
  etiquetas?: EtiquetasGenerales,
): string | null {
  const errorGeneral = validarGeneralidades(g, etiquetas)
  if (errorGeneral) return errorGeneral

  for (const campo of campos) {
    const error = validarCampo(campo, respuestas[campo.clave])
    if (error) return error
  }

  // Única regla entre dos campos que aplica la base: la hora de fin no antes de la de inicio.
  const inicio = respuestas.hora_inicio
  const fin = respuestas.hora_fin
  const hayHoras = campos.some((c) => c.clave === 'hora_inicio' && c.tipo_campo === 'HORA') &&
    campos.some((c) => c.clave === 'hora_fin' && c.tipo_campo === 'HORA')
  if (hayHoras && typeof inicio === 'string' && typeof fin === 'string' && inicio && fin && fin < inicio) {
    return 'La hora de fin no puede ser anterior a la hora de inicio.'
  }

  return null
}

export function armarDetalle(g: Generalidades, campos: DefinicionCampo[], respuestas: Respuestas): DetalleSolicitud {
  return {
    titulo: g.titulo.trim(),
    fecha_evento: g.fecha_evento,
    dirigido_a: g.dirigido_a.trim(),
    campus_ids: g.campus_ids,
    respuestas: respuestasParaEnviar(campos, respuestas) as Respuestas,
  }
}
