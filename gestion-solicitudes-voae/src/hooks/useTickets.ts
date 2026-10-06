import { useQuery } from '@tanstack/react-query'
import { listarTicketsEstadoReal, obtenerTicketEstadoReal } from '../data/tickets'

export function useTicketsEstadoReal() {
  return useQuery({ queryKey: ['tickets', 'estado-real'], queryFn: listarTicketsEstadoReal })
}

export function useTicketEstadoReal(ticketId: number) {
  return useQuery({
    queryKey: ['tickets', 'estado-real', ticketId],
    queryFn: () => obtenerTicketEstadoReal(ticketId),
  })
}
