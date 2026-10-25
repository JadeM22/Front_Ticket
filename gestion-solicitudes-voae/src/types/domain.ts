import type { Tables } from './database'

export type RolNombre =
  | 'Administrador'
  | 'Jefe de Área'
  | 'Asignador'
  | 'Validador'
  | 'Diseñador'
  | 'Analista'
  | 'Empleado'

export const JERARQUIA_ROLES: RolNombre[] = [
  'Administrador',
  'Jefe de Área',
  'Asignador',
  'Validador',
  'Diseñador',
  'Analista',
  'Empleado',
]

export const RUTA_POR_ROL: Record<RolNombre, string> = {
  Administrador: '/admin',
  'Jefe de Área': '/jefe',
  Asignador: '/asignador',
  Validador: '/validador',
  Diseñador: '/disenador',
  Analista: '/analista',
  Empleado: '/empleado',
}

export interface Perfil {
  id: number
  /** Nombre completo (`Usuarios.nombre_completo`, calculado por la base). */
  nombre: string
  correo: string
  area_id: number | null
  area_nombre: string | null
  debe_cambiar_password: boolean
  roles: RolNombre[]
}

/**
 * Cómo se atiende un tipo de solicitud: por el equipo de diseño, subiendo un afiche que revisa un
 * Validador (IA), o con una sola decisión del Validador (Cobertura de evento).
 */
export type Flujo = 'DISENO' | 'APROBACION_IA' | 'VALIDACION'

export const ETIQUETA_FLUJO: Record<Flujo, string> = {
  DISENO: 'Diseño',
  APROBACION_IA: 'Aprobación con IA',
  VALIDACION: 'Validación',
}

/** Etiqueta corta para distinguir en listas los tickets que no son de diseño. */
export const TAG_FLUJO: Record<Flujo, string | null> = {
  DISENO: null,
  APROBACION_IA: 'IA',
  VALIDACION: 'Validación',
}

/** Agrupación visual de los tipos en "Nueva solicitud" (`TipoSolicitud.categoria`). */
export type CategoriaTipo = 'ARTE' | 'VIDEO' | 'DIRCOM' | 'PROTOCOLO' | 'OTROS'

export const CATEGORIAS_TIPO: { valor: CategoriaTipo; etiqueta: string }[] = [
  { valor: 'ARTE', etiqueta: 'Arte' },
  { valor: 'VIDEO', etiqueta: 'Video' },
  { valor: 'DIRCOM', etiqueta: 'DIRCOM' },
  { valor: 'PROTOCOLO', etiqueta: 'Protocolo' },
  { valor: 'OTROS', etiqueta: 'Otros' },
]

/** Nombres visibles de las generalidades (`TipoSolicitud.etiquetas_generales`, todos opcionales). */
export interface EtiquetasGenerales {
  titulo: string
  fecha_evento: string
  dirigido_a: string
  alcance: string
}

export type EstadoRegistrado =
  | 'Enviado'
  | 'En revisión'
  | 'En proceso'
  | 'Finalizado'
  | 'Corrección'
  | 'Aprobado'
  | 'Retrasado'
  | 'Rechazado'

export type EstadoReal = EstadoRegistrado | 'Aprobado (Automático)'

export type EstadoExcepcional = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA'

export type TicketEstadoReal = Tables<{ schema: 'Solicitudes' }, 'vw_TicketsEstadoReal'>

export type TipoEntregable = 'LINK' | 'PDF' | 'IMAGEN' | 'VIDEO' | 'OTRO'

export type TipoAdjunto = 'ARCHIVO' | 'LINK'

export type DecisionJefe = 'APROBADO' | 'CORRECCION'

export type DecisionIA = 'APROBADO' | 'RECHAZADO'

/** Decisión única del Validador en el flujo VALIDACION (`DecisionValidacion`). */
export type DecisionValidacion = 'APROBADO' | 'RECHAZADO'

export type TipoCampo =
  | 'TEXTO'
  | 'TEXTO_LARGO'
  | 'NUMERO'
  | 'FECHA'
  | 'HORA'
  | 'BOOLEANO'
  | 'SELECCION'
  | 'SELECCION_MULTIPLE'
  | 'URL'
  | 'ETIQUETAS'

export const TIPOS_CAMPO: { valor: TipoCampo; etiqueta: string }[] = [
  { valor: 'TEXTO', etiqueta: 'Texto corto' },
  { valor: 'TEXTO_LARGO', etiqueta: 'Texto largo' },
  { valor: 'NUMERO', etiqueta: 'Número' },
  { valor: 'FECHA', etiqueta: 'Fecha' },
  { valor: 'HORA', etiqueta: 'Hora' },
  { valor: 'BOOLEANO', etiqueta: 'Sí / No' },
  { valor: 'SELECCION', etiqueta: 'Selección (una opción)' },
  { valor: 'SELECCION_MULTIPLE', etiqueta: 'Selección múltiple' },
  { valor: 'URL', etiqueta: 'Enlace (URL)' },
  { valor: 'ETIQUETAS', etiqueta: 'Etiquetas libres' },
]

/**
 * `min`/`max`: rango de un NUMERO; en ETIQUETAS, `max` es la cantidad máxima de elementos.
 * `max_longitud`: caracteres de un texto; en ETIQUETAS, de cada elemento (100 si no se indica).
 */
export interface ValidacionesCampo {
  min?: number
  max?: number
  max_longitud?: number
}

/** Valor de una respuesta tal como viaja en `respuestas` (jsonb). */
export type ValorCampo = string | number | boolean | string[] | null

export type Respuestas = Record<string, ValorCampo>

/**
 * Definición de un campo ya normalizada (los jsonb `opciones`/`validaciones`/`valor_defecto` con su
 * forma real). Es lo que usa el formulario dinámico, venga de `CampoFormulario` (al llenar) o de
 * `Formularios.campos_snapshot` (al ver un ticket ya enviado).
 */
export interface DefinicionCampo {
  clave: string
  etiqueta: string
  tipo_campo: TipoCampo
  placeholder: string | null
  ayuda: string | null
  opciones: string[]
  valor_defecto: ValorCampo
  validaciones: ValidacionesCampo
  obligatorio: boolean
  orden: number
}

/** Forma de `p_detalle` de `fnSolicitudCrearEscalar`. */
export interface DetalleSolicitud {
  titulo: string
  fecha_evento: string
  dirigido_a: string
  campus_ids: number[]
  respuestas: Respuestas
}

/** Generalidades de una solicitud ya enviada + sus respuestas, para mostrarla. */
export interface DetalleFormulario {
  titulo: string
  dirigido_a: string
  fecha_evento: string
  campus: string[]
  campos: DefinicionCampo[]
  respuestas: Respuestas
}
