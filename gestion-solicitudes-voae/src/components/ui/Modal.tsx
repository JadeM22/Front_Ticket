import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  children: ReactNode
  /** `amplio` para contenido con tablas o dos columnas (p. ej. el editor de campos). */
  ancho?: 'normal' | 'amplio'
}

export function Modal({ abierto, onCerrar, titulo, children, ancho = 'normal' }: ModalProps) {
  // Esc cierra igual que la X, en todos los modales (E-13). Los calendarios y selectores de hora cierran
  // primero su propio desplegable con `stopPropagation`, así que ese Esc no llega hasta aquí.
  const onCerrarRef = useRef(onCerrar)
  useEffect(() => {
    onCerrarRef.current = onCerrar
  })
  useEffect(() => {
    if (!abierto) return
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape' && !e.defaultPrevented) onCerrarRef.current()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierto])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-azul-noche/50 px-4" role="dialog" aria-modal="true">
      <div
        className={`w-full rounded-xl bg-white p-6 shadow-xl ${
          // Solo el amplio hace scroll interno: en los demás un `overflow` recortaría los calendarios desplegables.
          ancho === 'amplio' ? 'max-h-[90vh] max-w-3xl overflow-y-auto' : 'max-w-lg'
        }`}
      >
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
