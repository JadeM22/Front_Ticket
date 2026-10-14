import { UserCheck, Zap } from 'lucide-react'
import { formatFechaHora } from '../../lib/date'

interface TagExcepcionalProps {
  /** Versión reducida (sin el texto "Excepcional" en algunos contextos muy angostos). */
  compacto?: boolean
}

export function TagExcepcional({ compacto = false }: TagExcepcionalProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ambar-bruma px-2 py-0.5 text-xs font-semibold text-ambar">
      <Zap size={12} /> {!compacto && 'Excepcional'}
    </span>
  )
}

interface TagAsignadoProps {
  por?: string | null
  fecha?: string | null
}

/** Solo se muestra cuando `asignado_por_asignador` es `true`: alguien más (el Asignador) le puso este ticket. */
export function TagAsignado({ por, fecha }: TagAsignadoProps) {
  return (
    <span
      title={por ? `Asignado por ${por}${fecha ? ` el ${formatFechaHora(fecha)}` : ''}` : 'Asignado por el Asignador'}
      className="inline-flex items-center gap-1 rounded-full bg-indigo-bruma px-2 py-0.5 text-xs font-semibold text-indigo-suave"
    >
      <UserCheck size={12} /> Asignado
    </span>
  )
}
