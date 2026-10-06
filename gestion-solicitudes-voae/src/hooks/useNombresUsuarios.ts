import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface FilaNombreUsuario {
  id: number
  nombre: string
}

async function obtenerNombresUsuarios(): Promise<Map<number, string>> {
  const { data, error } = await supabase.schema('Seguridad').rpc('fnUsuariosNombresTabla')
  if (error) throw error
  return new Map(((data ?? []) as FilaNombreUsuario[]).map((fila) => [fila.id, fila.nombre]))
}

export const SISTEMA = 'Sistema'

/** usuario_id null (tareas automáticas) siempre se muestra como "Sistema". */
export function useNombresUsuarios() {
  const { data, ...resto } = useQuery({
    queryKey: ['nombres-usuarios'],
    queryFn: obtenerNombresUsuarios,
    staleTime: 10 * 60 * 1000,
  })

  function nombreDe(usuarioId: number | null | undefined): string {
    if (usuarioId == null) return SISTEMA
    return data?.get(usuarioId) ?? `#${usuarioId}`
  }

  return { nombreDe, nombres: data, ...resto }
}
