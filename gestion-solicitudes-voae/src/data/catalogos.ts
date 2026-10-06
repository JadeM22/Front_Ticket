import { supabase } from '../lib/supabase'
import type { Tables, TablesUpdate } from '../types/database'

export type Area = Tables<{ schema: 'Seguridad' }, 'Areas'>
export type TipoSolicitud = Tables<{ schema: 'Solicitudes' }, 'TipoSolicitud'>
export type Estado = Tables<{ schema: 'Solicitudes' }, 'Estado'>

export async function listarAreas(): Promise<Area[]> {
  const { data, error } = await supabase.schema('Seguridad').from('Areas').select('*').order('nombre')
  if (error) throw error
  return data ?? []
}

export async function listarTiposSolicitud(): Promise<TipoSolicitud[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('TipoSolicitud')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data ?? []
}

export async function listarEstados(): Promise<Estado[]> {
  const { data, error } = await supabase.schema('Solicitudes').from('Estado').select('*').order('id')
  if (error) throw error
  return data ?? []
}

let cacheEstados: Estado[] | null = null

export async function obtenerIdEstadoPorNombre(nombre: string): Promise<number> {
  if (!cacheEstados) cacheEstados = await listarEstados()
  const estado = cacheEstados.find((e) => e.nombre === nombre)
  if (!estado) throw new Error(`El estado "${nombre}" no existe.`)
  return estado.id
}

export async function actualizarArea(id: number, cambios: TablesUpdate<{ schema: 'Seguridad' }, 'Areas'>) {
  const { error } = await supabase.schema('Seguridad').from('Areas').update(cambios).eq('id', id)
  if (error) throw error
}

export async function actualizarTipoSolicitud(
  id: number,
  cambios: TablesUpdate<{ schema: 'Solicitudes' }, 'TipoSolicitud'>,
) {
  const { error } = await supabase.schema('Solicitudes').from('TipoSolicitud').update(cambios).eq('id', id)
  if (error) throw error
}
