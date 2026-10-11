import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { CLASE_INPUT } from './Campo'

/**
 * Campo de contraseña con su propio botón de mostrar/ocultar, siempre visible. El "ojito" nativo
 * de Edge se oculta en `index.css` porque desaparece solo (autocompletado, perder el foco) y
 * además se duplicaría con este.
 */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${CLASE_INPUT} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-tinta-suave transition-colors duration-150 hover:text-azul-institucional"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
