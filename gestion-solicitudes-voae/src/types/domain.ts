import type { Tables } from './database'

export type RolNombre = 'Administrador' | 'Jefe de Área' | 'Diseñador' | 'Analista' | 'Empleado'

export const JERARQUIA_ROLES: RolNombre[] = [
  'Administrador',
  'Jefe de Área',
  'Diseñador',
  'Analista',
  'Empleado',
]

export const RUTA_POR_ROL: Record<RolNombre, string> = {
  Administrador: '/admin',
  'Jefe de Área': '/jefe',
  Diseñador: '/disenador',
  Analista: '/analista',
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

/** Qué formulario mostrar para un tipo de solicitud — se elige por esta columna, nunca por el nombre. */
export type FormularioCodigo = 'ARTE' | 'VIDEO' | 'DIRCOM' | 'PROTOCOLO' | 'GENERICO'

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

export type TipoAdjunto = 'ARCHIVO' | 'LINK'

export type DecisionJefe = 'APROBADO' | 'CORRECCION'

export interface DetalleArte {
  titulo: string
  fecha: string | null
  hora_inicio: string | null
  hora_fin: string | null
  lugar: string | null
  modalidad: 'Presencial' | 'No presencial' | null
  aplica_articulo_140: boolean
  enlace_qr: string | null
  alcance: 'Todos los centros regionales' | 'Solo Ciudad Universitaria' | null
  informacion_adicional: string | null
  logotipos: string[]
}

export interface DetalleVideo {
  objetivo: string
  fecha_entrega_publicacion: string
  participacion_estudiantes: 'No aplica' | 'Artículo 140' | 'Horas beca'
  informacion_producto: string | null
  encargado_actividad: string
  logotipos: string[]
}

export interface DetalleDircom {
  tipo_material: string
  fecha_necesaria: string
  informacion_valor: string
  necesita_dictamen: boolean
  logotipos: string[]
}

export interface DetalleProtocolo {
  nombre_actividad: string
  lugar_propuesto: string
  cantidad_invitados: number | null
  fecha: string
  hora: string
  elaborar_invitacion: boolean
  informacion_programa: string | null
  necesita_maestro_ceremonia: boolean
  maestro_ceremonia_preferido: string | null
  equipo_requerido: string | null
  necesita_edecanes: boolean
  necesita_pumas: boolean
}

export interface DetalleGenerico {
  titulo: string
  descripcion: string
  fecha_requerida: string | null
  informacion_producto: string | null
  logotipos: string[]
  observaciones: string | null
}

export type DetalleFormulario = DetalleArte | DetalleVideo | DetalleDircom | DetalleProtocolo | DetalleGenerico
