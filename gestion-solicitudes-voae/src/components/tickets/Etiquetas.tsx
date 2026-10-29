import { Undo2, UserCheck } from 'lucide-react'
import { formatFechaHora } from '../../lib/date'

interface TagAsignadoProps {
  por?: string | null
  fecha?: string | null
}

/** Solo se muestra cuando `asignado_por_asignador` es `true`: alguien más (el Asignador) le puso este ticket. */
export function TagAsignado({ por, fecha }: TagAsignadoProps) {
  return (
    <span
      title={por ? `Asignado por ${por}${fecha ? ` el ${formatFechaHora(fecha)}` : ''}` : 'Asignado'}
      className="inline-flex items-center gap-1 rounded-full bg-indigo-bruma px-2 py-0.5 text-xs font-semibold text-indigo-suave"
    >
      <UserCheck size={12} /> Asignado
    </span>
  )
}

/** Ticket que volvió a "Sin asignar" porque a su diseñador se le desactivó la cuenta o el rol. */
export function TagLiberado() {
  return (
    <span
      title="Volvió a Sin asignar porque su diseñador fue desactivado"
      className="inline-flex items-center gap-1 rounded-full bg-tinta-suave/15 px-2 py-0.5 text-xs font-semibold text-tinta-suave"
    >
      <Undo2 size={12} /> Liberado
    </span>
  )
}
