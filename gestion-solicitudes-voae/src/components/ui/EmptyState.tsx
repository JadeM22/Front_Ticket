import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  titulo: string
  descripcion?: string
  icono?: LucideIcon
  accion?: ReactNode
}

export function EmptyState({ titulo, descripcion, icono: Icono = Inbox, accion }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-azul-niebla bg-menta-bruma/40 px-6 py-12 text-center">
      <div className="rounded-full bg-white p-3 text-menta-profundo shadow-sm">
        <Icono size={22} />
      </div>
      <p className="font-semibold text-tinta">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-tinta-suave">{descripcion}</p>}
      {accion}
    </div>
  )
}
