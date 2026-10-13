import { useQuery } from '@tanstack/react-query'
import { listarTicketsEstadoReal, obtenerTicketEstadoReal } from '../data/tickets'

/**
 * `refetchInterval` de 60 s: fuera de horario hábil el cronómetro del dictamen se detiene y lo
 * calcula la base, así que las pantallas que lo muestran (tableros, "Por dictaminar") necesitan
 * refrescar la vista con esa misma cadencia mientras estén abiertas.
 */
export function useTicketsEstadoReal() {
  return useQuery({ queryKey: ['tickets', 'estado-real'], queryFn: listarTicketsEstadoReal, refetchInterval: 60_000 })
}

export function useTicketEstadoReal(ticketId: number) {
  return useQuery({
    queryKey: ['tickets', 'estado-real', ticketId],
    queryFn: () => obtenerTicketEstadoReal(ticketId),
  })
}
