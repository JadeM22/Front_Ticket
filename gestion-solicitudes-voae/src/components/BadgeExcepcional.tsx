import { Zap } from 'lucide-react'
import { useCambiosUrgentes } from '../hooks/useCambiosUrgentes'

interface BadgeExcepcionalProps {
  ticketId: number | null | undefined
}

/**
 * Insignia de solicitud excepcional, siempre junto al código del ticket. Un cambio urgente
 * (`ticket_origen_id` no nulo) es una excepcional ligada a otro ticket: misma insignia, otro texto.
 * La vista no trae `ticket_origen_id`, así que se consulta con `useCambiosUrgentes` (una sola vez).
 */
export function BadgeExcepcional({ ticketId }: BadgeExcepcionalProps) {
  const { cambioDe } = useCambiosUrgentes()
  return (
    <span
      title="Solicitud urgente: plazo corto."
      className="inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-full bg-ambar-bruma px-2 py-0.5 text-xs font-semibold text-ambar ring-1 ring-inset ring-ambar/30"
    >
      <Zap size={12} className="fill-current" aria-hidden />
      {cambioDe(ticketId) ? 'Cambio urgente' : 'Excepcional'}
    </span>
  )
}
