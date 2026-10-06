import { supabase } from '../lib/supabase'

export interface EntradaBitacora {
  id: number
  usuario_id: number
  usuario_nombre: string | null
  rol_id: number
  rol_nombre: string | null
  accion: string
  fecha_registro: string
}

interface FilaBitacora {
  id: number
  usuario_id: number
  rol_id: number
  accion: string
  fecha_registro: string
  Usuarios: { nombre: string } | null
  Roles: { nombre: string } | null
}

export async function listarBitacora(): Promise<EntradaBitacora[]> {
  const { data, error } = await supabase
    .schema('Seguridad')
    .from('UsuariosRolesLog')
    .select('id, usuario_id, rol_id, accion, fecha_registro, Usuarios(nombre), Roles(nombre)')
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
  }))
}
