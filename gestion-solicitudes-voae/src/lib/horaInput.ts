/** Conversión entre la hora que el usuario escribe (hh:mm + a. m./p. m.) y el 'HH:MM' de 24 h que guarda la base. */

const pad = (n: number) => String(n).padStart(2, '0')

export interface HoraInterpretada {
  /** 'HH:MM' en 24 horas. */
  valor: string
  /** 'hh:mm' en 12 horas, como se muestra en el campo. */
  texto: string
  pm: boolean
}

/** 'HH:MM' o 'HH:MM:SS' (24 h) → texto de 12 h + meridiano; `null` si no es una hora. */
export function hora24APartes(valor: string): HoraInterpretada | null {
  const partes = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(valor)
  if (!partes) return null
  const hora = Number(partes[1])
  const minuto = Number(partes[2])
  if (hora > 23 || minuto > 59) return null
  return { valor: `${partes[1]}:${partes[2]}`, texto: `${pad(hora % 12 || 12)}:${partes[2]}`, pm: hora >= 12 }
}

/**
 * Interpreta un 'hh:mm' completo. De 01 a 12 es hora de reloj y manda el meridiano elegido; 00 y de
 * 13 a 23 solo pueden ser formato de 24 h ("14:30"), así que se convierten y el meridiano se deduce.
 * Devuelve `null` si está incompleta o no existe (25:00, 10:75).
 */
export function interpretarHora(texto: string, pm: boolean): HoraInterpretada | null {
  const partes = /^(\d{2}):(\d{2})$/.exec(texto)
  if (!partes) return null
  const hora = Number(partes[1])
  const minuto = Number(partes[2])
  if (hora > 23 || minuto > 59) return null
  const hora24 = hora === 0 || hora > 12 ? hora : (hora % 12) + (pm ? 12 : 0)
  return hora24APartes(`${pad(hora24)}:${partes[2]}`)
}

/** Deja solo dígitos y pone los dos puntos solos: "0230" → "02:30"; "2:30" se completa a "02:30". */
export function enmascararHora(crudo: string): string {
  const partes = crudo.split(/\D+/)
  const digitos = partes
    .map((parte, i) => (i === 0 && partes.length > 1 && parte.length === 1 ? `0${parte}` : parte))
    .join('')
    .slice(0, 4)
  return [digitos.slice(0, 2), digitos.slice(2)].filter(Boolean).join(':')
}

/** 'HH:MM' (24 h) → "02:30 p. m.". */
export function etiquetaHora(valor: string): string {
  const partes = hora24APartes(valor)
  return partes ? `${partes.texto} ${partes.pm ? 'p. m.' : 'a. m.'}` : ''
}
