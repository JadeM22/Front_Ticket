import type { Tables } from './database'

export type RolNombre = 'Administrador' | 'Jefe de Área' | 'Diseñador' | 'Empleado'

export const JERARQUIA_ROLES: RolNombre[] = [
  'Administrador',
  'Jefe de Área',
  'Diseñador',
  'Empleado',
]

export const RUTA_POR_ROL: Record<RolNombre, string> = {
  Administrador: '/admin',
  'Jefe de Área': '/jefe',
  Diseñador: '/disenador',
  Empleado: '/empleado',
}

export interface Perfil {
  id: number
  nombre: string
  correo: string
  area_id: number | null
  area_nombre: string | null
  debe_cambiar_password: boolean
  roles: RolNombre[]
}

export type TipoSolicitudNombre =
  | 'Afiche'
  | 'Edición fotográfica'
  | 'Cobertura de eventos'
  | 'Comunicado'
  | 'Publicación en redes sociales'
  | 'Aviso'

export type EstadoRegistrado =
  | 'Enviado'
  | 'En revisión'
  | 'En proceso'
  | 'Finalizado'
  | 'Corrección'
  | 'Aprobado'
  | 'Retrasado'

export type EstadoReal = EstadoRegistrado | 'Aprobado (Automático)'

export type TicketEstadoReal = Tables<{ schema: 'Solicitudes' }, 'vw_TicketsEstadoReal'>

export type TipoEntregable = 'LINK' | 'PDF' | 'IMAGEN' | 'VIDEO' | 'OTRO'

export type DecisionJefe = 'APROBADO' | 'CORRECCION'

export interface DetalleFormularioAfiche {
  dimensiones: string
  orientacion: 'Vertical' | 'Horizontal'
  texto_principal: string
}

export interface DetalleFormularioComunicado {
  titulo: string
  contenido_comunicado: string
  dirigido_a: string
}

export interface DetalleFormularioAviso {
  titulo_aviso: string
  urgencia: 'Baja' | 'Media' | 'Alta'
  medio_difusion: string
}

export interface DetalleFormularioCoberturaEventos {
  nombre_evento: string
  lugar: string
  fecha_inicio: string
  fecha_fin: string
}

export interface DetalleFormularioEdicionFotografica {
  cantidad_fotos: number
  estilo_edicion: string
  enlace_drive: string
}

export interface DetalleFormularioPublicacionRedesSociales {
  plataformas: string[]
  texto_copy: string
  hora_sugerida: string | null
}

export type DetalleFormulario =
  | DetalleFormularioAfiche
  | DetalleFormularioComunicado
  | DetalleFormularioAviso
  | DetalleFormularioCoberturaEventos
  | DetalleFormularioEdicionFotografica
  | DetalleFormularioPublicacionRedesSociales
