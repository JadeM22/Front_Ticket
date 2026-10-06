import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  cargando?: boolean
}

const CLASES_VARIANTE: Record<Variante, string> = {
  primario: 'bg-azul-institucional text-white hover:bg-azul-medio',
  secundario: 'bg-azul-niebla text-azul-institucional hover:bg-azul-niebla/70',
  fantasma: 'bg-transparent text-tinta hover:bg-azul-niebla',
  peligro: 'bg-coral text-white hover:bg-coral/90',
}

export function Button({ variante = 'primario', cargando = false, className = '', children, disabled, ...props }: BotonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${CLASES_VARIANTE[variante]} ${className}`}
      disabled={disabled || cargando}
      {...props}
    >
      {cargando && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {children}
    </button>
  )
}
