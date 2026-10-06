import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  children: ReactNode
}

export function Modal({ abierto, onCerrar, titulo, children }: ModalProps) {
  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-azul-noche/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-azul-noche">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1 text-tinta-suave transition-colors duration-150 hover:bg-azul-niebla"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
