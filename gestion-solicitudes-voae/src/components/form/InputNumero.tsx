import { useEffect, useRef } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { errorRangoNumero } from '../../lib/inputNumero'

interface InputNumeroProps {
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  /** Si el campo admite decimales (p. ej. un NUMERO del formulario dinámico). Por defecto, solo enteros. */
  permiteDecimales?: boolean
  placeholder?: string
  className?: string
  id?: string
  required?: boolean
  /**
   * Muestra bajo el campo el error de rango ("El mínimo es 10"). Se apaga cuando quien lo usa ya pinta
   * su propio error para ese campo, para no repetirlo.
   */
  mostrarError?: boolean
}

const TECLAS_BLOQUEADAS_ENTERO = new Set(['-', '+', 'e', 'E', '.', ','])
const TECLAS_BLOQUEADAS_DECIMAL = new Set(['-', '+', 'e', 'E'])

/**
 * `<input type="number">` sin sus problemas de siempre:
 * - la rueda del ratón nunca cambia el valor (listener nativo `wheel` con `{ passive: false }`,
 *   porque el `onWheel` sintético de React no alcanza a bloquearla en todos los navegadores);
 * - el teclado bloquea signos y notación científica (`-`, `+`, `e`, `E`, y `.`/`,` si no se permiten
 *   decimales);
 * - escribir o pegar deja solo dígitos (y el separador decimal si `permiteDecimales`) — un valor
 *   vacío se queda vacío, nunca se convierte en 0;
 * - un valor fuera de `min`/`max` nunca se ajusta en silencio: se avisa en rojo bajo el campo y quien lo
 *   usa bloquea el guardado con `errorRangoNumero` (E-03). Solo las flechas del input respetan el rango.
 */
export function InputNumero({
  value,
  onChange,
  min = 0,
  max,
  permiteDecimales = false,
  placeholder,
  className,
  id,
  required,
  mostrarError = true,
}: InputNumeroProps) {
  const ref = useRef<HTMLInputElement>(null)
  const enfocadoRef = useRef(false)

  useEffect(() => {
    const input = ref.current
    if (!input) return
    function alMoverRueda(evento: WheelEvent) {
      if (enfocadoRef.current) evento.preventDefault()
    }
    input.addEventListener('wheel', alMoverRueda, { passive: false })
    return () => input.removeEventListener('wheel', alMoverRueda)
  }, [])

  function sanear(texto: string): string {
    if (!permiteDecimales) return texto.replace(/[^0-9]/g, '')
    return texto.replace(/[^0-9.,]/g, '').replace(',', '.')
  }

  function manejarCambio(evento: ChangeEvent<HTMLInputElement>) {
    onChange(sanear(evento.target.value))
  }

  function manejarTeclado(evento: KeyboardEvent<HTMLInputElement>) {
    const bloqueadas = permiteDecimales ? TECLAS_BLOQUEADAS_DECIMAL : TECLAS_BLOQUEADAS_ENTERO
    if (bloqueadas.has(evento.key)) evento.preventDefault()
  }

  const error = mostrarError ? errorRangoNumero(value, min, max) : null

  return (
    <>
      <input
        ref={ref}
        id={id}
        type="number"
        inputMode={permiteDecimales ? 'decimal' : 'numeric'}
        min={min}
        max={max}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={manejarCambio}
        onKeyDown={manejarTeclado}
        onFocus={() => (enfocadoRef.current = true)}
        onBlur={() => (enfocadoRef.current = false)}
        aria-invalid={error ? true : undefined}
        className={`${className ?? ''} ${error ? 'border-coral' : ''}`}
      />
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </>
  )
}
