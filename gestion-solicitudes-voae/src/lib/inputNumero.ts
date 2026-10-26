/** El mismo texto que se muestra bajo el campo, para que el formulario que lo usa bloquee "Guardar". */
export function errorRangoNumero(valor: string, min = 0, max?: number): string | null {
  if (valor.trim() === '') return null
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return null
  if (numero < min) return `El mínimo es ${min}`
  if (max !== undefined && numero > max) return `El máximo es ${max}`
  return null
}
