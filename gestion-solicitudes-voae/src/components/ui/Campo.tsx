import type { ReactNode } from 'react'

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-tinta">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-tinta-suave">{ayuda}</span>}
    </label>
  )
}

export const CLASE_INPUT =
  'w-full rounded-lg border border-azul-niebla px-3 py-2 text-sm outline-none focus:border-azul-institucional'
