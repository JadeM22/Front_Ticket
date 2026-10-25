import { useQuery } from '@tanstack/react-query'
import { listarTicketsEstadoReal, obtenerTicketEstadoReal, contarTicketsSinAsignar } from '../data/tickets'

export const CLAVE_CONTEO_SIN_ASIGNAR = ['tickets', 'sin-asignar-count']

/**
 * `refetchInterval` de 60 s: fuera de horario hábil el cronómetro del dictamen se detiene y lo
 * calcula la base, así que las pantallas que lo muestran (tableros, "Por dictaminar") necesitan
 * refrescar la vista con esa misma cadencia mientras estén abiertas.
 */
export function useTicketsEstadoReal() {
  return useQuery({ queryKey: ['tickets', 'estado-real'], queryFn: listarTicketsEstadoReal, refetchInterval: 60_000 })
}

/**
 * Igual que `useTicketsEstadoReal` (misma consulta y caché) pero solo con los tickets de flujo DISENO:
 * los de APROBACION_IA y VALIDACION nunca tienen diseñador. RLS ya se los oculta a Asignador y
 * Diseñador; este filtro evita que alguien que además sea Administrador los vea en tableros o
 * contadores de diseño.
 */
export function useTicketsDiseno() {
  return useQuery({
    queryKey: ['tickets', 'estado-real'],
    queryFn: listarTicketsEstadoReal,
    refetchInterval: 60_000,
    select: (tickets) => tickets.filter((t) => (t.flujo ?? 'DISENO') === 'DISENO'),
  })
}

export function useTicketEstadoReal(ticketId: number) {
  return useQuery({
    queryKey: ['tickets', 'estado-real', ticketId],
    queryFn: () => obtenerTicketEstadoReal(ticketId),
  })
}

/**
 * Compartido entre el badge de "Mi tablero" (sidebar) y la pestaña "Tickets sin asignación": una
 * sola consulta liviana (`count`, sin filas) para que ambos muestren siempre el mismo número. Se
 * refresca cada 60 s; `tomarTicket` y las notificaciones nuevas la invalidan además explícitamente.
 */
export function useConteoSinAsignar(habilitado = true) {
  return useQuery({
    queryKey: CLAVE_CONTEO_SIN_ASIGNAR,
    queryFn: contarTicketsSinAsignar,
    refetchInterval: 60_000,
    enabled: habilitado,
  })
}
