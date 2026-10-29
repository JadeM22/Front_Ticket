import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarCambiosUrgentes, listarCambiosUrgentesDe, type CambioUrgente } from '../data/cambiosUrgentes'
import { listarJefaturasDeUsuario } from '../data/usuarios'
import { useAuth } from '../auth/useAuth'

/**
 * Todos los cambios urgentes que RLS deja ver, en una sola consulta compartida por cada insignia y
 * tarjeta. Cuelga de `['tickets', 'estado-real']`, así que cualquier cambio en un ticket la refresca.
 */
export function useCambiosUrgentes() {
  const { data } = useQuery({
    queryKey: ['tickets', 'estado-real', 'cambios-urgentes'],
    queryFn: listarCambiosUrgentes,
    refetchInterval: 60_000,
  })
  return useMemo(() => {
    const porId = new Map<number, CambioUrgente>((data ?? []).map((c) => [c.id, c]))
    return {
      cambios: data ?? [],
      /** El cambio urgente que es este ticket, si lo es. */
      cambioDe: (ticketId: number | null | undefined) => (ticketId == null ? undefined : porId.get(ticketId)),
    }
  }, [data])
}

/** Cambios urgentes ligados a un ticket original, con su estado real. */
export function useCambiosUrgentesDe(ticketOrigenId: number, habilitado: boolean) {
  return useQuery({
    queryKey: ['tickets', 'estado-real', 'cambios-urgentes', ticketOrigenId],
    queryFn: () => listarCambiosUrgentesDe(ticketOrigenId),
    enabled: habilitado,
  })
}

/** Áreas/coordinaciones que dirige el usuario: la suya (si es Jefe de Área) más sus jefaturas (Parte 39). */
export function useAreasQueDirige(): Set<number> {
  const { perfil, tieneRol } = useAuth()
  const esJefe = tieneRol('Jefe de Área')
  const { data: jefaturas = [] } = useQuery({
    queryKey: ['jefaturas', perfil?.id],
    queryFn: () => listarJefaturasDeUsuario(perfil!.id),
    enabled: perfil != null && esJefe,
  })
  const areaPropia = perfil?.area_id ?? null
  return useMemo(() => {
    if (!esJefe) return new Set<number>()
    const ids = jefaturas.map((j) => j.area_id)
    if (areaPropia != null) ids.push(areaPropia)
    return new Set(ids)
  }, [esJefe, jefaturas, areaPropia])
}
