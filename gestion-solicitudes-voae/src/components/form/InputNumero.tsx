import { useEffect, useRef } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'

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
 * - al salir del campo, un valor por debajo de `min` se ajusta a `min`.
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

  function manejarSalir() {
    enfocadoRef.current = false
    if (value.trim() === '') return
    const numero = Number(value)
    if (Number.isFinite(numero) && numero < min) onChange(String(min))
  }

  return (
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
      onBlur={manejarSalir}
      className={className}
    />
  )
}
