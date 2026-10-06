import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-ambar-bruma p-3 text-sm text-ambar">
      <AlertTriangle size={16} className="mt-0.5 flex-none" />
      <p>{children}</p>
    </div>
  )
}
