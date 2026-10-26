import { supabase } from '../lib/supabase'
import type { Tables, TablesUpdate } from '../types/database'

export type Rol = Tables<{ schema: 'Seguridad' }, 'Roles'>

export interface DisenadorAsignable {
  id: number
  nombre: string
  es_asignador: boolean
}

/** Diseñadores activos, visible solo para Asignador o Administrador (lo exige la base). */
export async function listarDisenadoresAsignables(): Promise<DisenadorAsignable[]> {
  const { data, error } = await supabase.schema('Seguridad').rpc('fnDisenadoresTabla')
  if (error) throw error
  return data ?? []
}

export interface UsuarioAdmin {
  id: number
  nombre_completo: string
  primer_apellido: string | null
  segundo_apellido: string | null
  correo: string
  estado: boolean
  area_id: number | null
  area_nombre: string | null
  /** 'AREA' | 'COORDINACION' del área propia; decide si se le pueden asignar jefaturas adicionales. */
  area_tipo: string | null
  roles: { id: number; nombre: string }[]
}

interface FilaUsuarioAdmin {
  id: number
  nombre: string
  nombre_completo: string | null
  primer_apellido: string | null
  segundo_apellido: string | null
  correo: string
  estado: boolean
  area_id: number | null
  Areas: { nombre: string; tipo: string } | null
  UsuariosRoles: { Roles: { id: number; nombre: string } | null }[] | null
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const { data, error } = await supabase
    .schema('Seguridad')
    .from('Usuarios')
    .select(
      'id, nombre, nombre_completo, primer_apellido, segundo_apellido, correo, estado, area_id, Areas!fkUsuario_Area(nombre, tipo), UsuariosRoles(Roles(id, nombre))',
    )
    .order('nombre')

  if (error) throw error

  return ((data ?? []) as unknown as FilaUsuarioAdmin[]).map((fila) => ({
    id: fila.id,
    nombre_completo: fila.nombre_completo ?? fila.nombre,
    primer_apellido: fila.primer_apellido,
    segundo_apellido: fila.segundo_apellido,
    correo: fila.correo,
    estado: fila.estado,
    area_id: fila.area_id,
    area_nombre: fila.Areas?.nombre ?? null,
    area_tipo: fila.Areas?.tipo ?? null,
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
  primer_apellido: string
  segundo_apellido: string
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

export type JefaturaArea = Tables<{ schema: 'Seguridad' }, 'JefaturasArea'>

/** Coordinaciones adicionales que dirige este usuario, aparte de la suya (Parte 39). */
export async function listarJefaturasDeUsuario(usuarioId: number): Promise<JefaturaArea[]> {
  const { data, error } = await supabase.schema('Seguridad').from('JefaturasArea').select('*').eq('usuario_id', usuarioId)
  if (error) throw error
  return data ?? []
}

/** Todas las jefaturas adicionales, para la columna "Jefaturas" de la tabla de usuarios (Administrador). */
export async function listarTodasLasJefaturas(): Promise<JefaturaArea[]> {
  const { data, error } = await supabase.schema('Seguridad').from('JefaturasArea').select('*')
  if (error) throw error
  return data ?? []
}

/** Solo Administrador; la base rechaza áreas normales, la coordinación propia del usuario, y usuarios que no son de una coordinación. */
export async function agregarJefatura(usuarioId: number, areaId: number) {
  const { error } = await supabase.schema('Seguridad').from('JefaturasArea').insert({ usuario_id: usuarioId, area_id: areaId })
  if (error) throw error
}

export async function quitarJefatura(usuarioId: number, areaId: number) {
  const { error } = await supabase
    .schema('Seguridad')
    .from('JefaturasArea')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('area_id', areaId)
  if (error) throw error
}
