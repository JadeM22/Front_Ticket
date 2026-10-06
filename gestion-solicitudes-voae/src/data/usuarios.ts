import { supabase } from '../lib/supabase'
import type { Tables, TablesUpdate } from '../types/database'

export type Rol = Tables<{ schema: 'Seguridad' }, 'Roles'>

export interface UsuarioAdmin {
  id: number
  nombre: string
  correo: string
  estado: boolean
  area_id: number | null
  area_nombre: string | null
  roles: { id: number; nombre: string }[]
}

interface FilaUsuarioAdmin {
  id: number
  nombre: string
  correo: string
  estado: boolean
  area_id: number | null
  Areas: { nombre: string } | null
  UsuariosRoles: { Roles: { id: number; nombre: string } | null }[] | null
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const { data, error } = await supabase
    .schema('Seguridad')
    .from('Usuarios')
    .select('id, nombre, correo, estado, area_id, Areas(nombre), UsuariosRoles(Roles(id, nombre))')
    .order('nombre')

  if (error) throw error

  return ((data ?? []) as unknown as FilaUsuarioAdmin[]).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    correo: fila.correo,
    estado: fila.estado,
    area_id: fila.area_id,
    area_nombre: fila.Areas?.nombre ?? null,
    roles: (fila.UsuariosRoles ?? []).flatMap((relacion) => (relacion.Roles ? [relacion.Roles] : [])),
  }))
}

export async function listarRoles(): Promise<Rol[]> {
  const { data, error } = await supabase.schema('Seguridad').from('Roles').select('*').order('nombre')
  if (error) throw error
  return data ?? []
}

export async function actualizarUsuario(id: number, cambios: TablesUpdate<{ schema: 'Seguridad' }, 'Usuarios'>) {
  const { error } = await supabase.schema('Seguridad').from('Usuarios').update(cambios).eq('id', id)
  if (error) throw error
}

export async function asignarRol(usuarioId: number, rolId: number) {
  const { error } = await supabase.schema('Seguridad').from('UsuariosRoles').insert({ usuario_id: usuarioId, rol_id: rolId })
  if (error) throw error
}

export async function revocarRol(usuarioId: number, rolId: number) {
  const { error } = await supabase
    .schema('Seguridad')
    .from('UsuariosRoles')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('rol_id', rolId)
  if (error) throw error
}

export interface CrearUsuarioInput {
  correo: string
  nombre: string
  area_id: number
  rol_id: number
}

export interface CrearUsuarioResultado {
  id: number
  password_temporal: string
}

export async function crearUsuario(input: CrearUsuarioInput): Promise<CrearUsuarioResultado> {
  const { data, error } = await supabase.functions.invoke<CrearUsuarioResultado>('crear-usuario', { body: input })
  if (error) throw error
  if (!data) throw new Error('La Edge Function no devolvió datos.')
  return data
}
