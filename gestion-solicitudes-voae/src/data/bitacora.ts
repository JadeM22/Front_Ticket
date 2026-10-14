import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type FilaFeriadoLog = Tables<{ schema: 'Seguridad' }, 'vw_FeriadosLog'>
export type FilaAsignacionLog = Tables<{ schema: 'Solicitudes' }, 'vw_AsignacionLog'>

export async function listarFeriadosLog(): Promise<FilaFeriadoLog[]> {
  const { data, error } = await supabase
    .schema('Seguridad')
    .from('vw_FeriadosLog')
    .select('*')
    .order('fecha_registro', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listarAsignacionLog(): Promise<FilaAsignacionLog[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('vw_AsignacionLog')
    .select('*')
    .order('fecha_registro', { ascending: false })
  if (error) throw error
  return data ?? []
}

export interface EntradaBitacora {
  id: number
  usuario_id: number
  usuario_nombre: string | null
  rol_id: number
  rol_nombre: string | null
  accion: string
  fecha_registro: string
  usuario_registro: number | null
}

interface FilaBitacora {
  id: number
  usuario_id: number
  rol_id: number
  accion: string
  fecha_registro: string
  usuario_registro: number | null
  Usuarios: { nombre: string } | null
  Roles: { nombre: string } | null
}

export async function listarBitacora(): Promise<EntradaBitacora[]> {
  // Hay dos relaciones de esta tabla hacia Usuarios (usuario_id y usuario_registro); se
  // desambigua el embed con el nombre exacto de la FK. usuario_registro se resuelve en la UI
  // con el mapa de fnUsuariosNombresTabla, igual que en el resto de la app.
  const { data, error } = await supabase
    .schema('Seguridad')
    .from('UsuariosRolesLog')
    .select('id, usuario_id, rol_id, accion, fecha_registro, usuario_registro, Usuarios!fkUsuarioRolLog_Usuario(nombre), Roles(nombre)')
    .order('fecha_registro', { ascending: false })
    .limit(200)

  if (error) throw error

  return ((data ?? []) as unknown as FilaBitacora[]).map((fila) => ({
    id: fila.id,
    usuario_id: fila.usuario_id,
    usuario_nombre: fila.Usuarios?.nombre ?? null,
    rol_id: fila.rol_id,
    rol_nombre: fila.Roles?.nombre ?? null,
    accion: fila.accion,
    fecha_registro: fila.fecha_registro,
    usuario_registro: fila.usuario_registro,
  }))
}
