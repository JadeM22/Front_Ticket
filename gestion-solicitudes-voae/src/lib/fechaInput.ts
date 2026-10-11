/** Conversión entre el texto que el usuario escribe (DD/MM/AAAA) y el 'YYYY-MM-DD' que guarda la base. */

const ANIO_MINIMO = 1900
const ANIO_MAXIMO = 2100

/** 'YYYY-MM-DD' → 'DD/MM/AAAA'; cadena vacía si no es una fecha ISO. */
export function isoATextoFecha(iso: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : ''
}

/** 'DD/MM/AAAA' → 'YYYY-MM-DD', o `null` si está incompleta o el día no existe (31/02, 29/02 en año no bisiesto…). */
export function textoFechaAIso(texto: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  if (!partes) return null
  const dia = Number(partes[1])
  const mes = Number(partes[2])
  const anio = Number(partes[3])
  if (anio < ANIO_MINIMO || anio > ANIO_MAXIMO) return null
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null
  return `${partes[3]}-${partes[2]}-${partes[1]}`
}

/**
 * Deja solo dígitos y pone las barras solas: "12102026" → "12/10/2026". Si el usuario escribe su
 * propio separador tras un solo dígito ("5/3/2026") se completa con cero, y una fecha pegada en
 * formato ISO ("2026-10-12") se da vuelta.
 */
export function enmascararFecha(crudo: string): string {
  const iso = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/.exec(crudo)
  let digitos: string
  if (iso) {
    digitos = iso[3].padStart(2, '0') + iso[2].padStart(2, '0') + iso[1]
  } else {
    const partes = crudo.split(/\D+/)
    digitos = partes
      .map((parte, i) => (i < 2 && i < partes.length - 1 && parte.length === 1 ? `0${parte}` : parte))
      .join('')
  }
  digitos = digitos.slice(0, 8)
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('/')
}
