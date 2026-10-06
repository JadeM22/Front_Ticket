import { supabase } from '../lib/supabase'
import type { Perfil, RolNombre } from '../types/domain'

interface FilaPerfil {
  id: number
  nombre: string
  correo: string
  area_id: number | null
  debe_cambiar_password: boolean
  Areas: { nombre: string } | null
  UsuariosRoles: { Roles: { nombre: string } | null }[] | null
}

export async function obtenerPerfilActual(authId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .schema('Seguridad')
    .from('Usuarios')
    .select('id, nombre, correo, area_id, debe_cambiar_password, Areas(nombre), UsuariosRoles(Roles(nombre))')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const fila = data as unknown as FilaPerfil
  const roles = (fila.UsuariosRoles ?? [])
    .map((relacion) => relacion.Roles?.nombre)
    .filter((nombre): nombre is RolNombre => Boolean(nombre))

  return {
    id: fila.id,
    nombre: fila.nombre,
    correo: fila.correo,
    area_id: fila.area_id,
    area_nombre: fila.Areas?.nombre ?? null,
    debe_cambiar_password: fila.debe_cambiar_password,
    roles,
  }
}
