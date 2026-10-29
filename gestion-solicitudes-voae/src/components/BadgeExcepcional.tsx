import { Zap } from 'lucide-react'

interface BadgeExcepcionalProps {
  /** El ticket es un cambio urgente (`ticket_origen_id` no nulo): también es excepcional. */
  cambioUrgente?: boolean
}

/**
 * Insignia de solicitud excepcional, siempre junto al código del ticket. Un cambio urgente es una
 * excepcional ligada a otro ticket, así que usa la misma insignia con otro texto.
 */
export function BadgeExcepcional({ cambioUrgente = false }: BadgeExcepcionalProps) {
  return (
    <span
      title="Solicitud urgente: plazo corto."
      className="inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-full bg-ambar-bruma px-2 py-0.5 text-xs font-semibold text-ambar ring-1 ring-inset ring-ambar/30"
    >
      <Zap size={12} className="fill-current" aria-hidden />
      {cambioUrgente ? 'Cambio urgente' : 'Excepcional'}
    </span>
  )
}
