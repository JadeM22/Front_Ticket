import { es } from 'date-fns/locale'
import { formatDistanceToNowStrict } from 'date-fns'

const ZONA = 'America/Tegucigalpa'

const formateadorHora = new Intl.DateTimeFormat('es-HN', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const formateadorIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const formateadorFechaLarga = new Intl.DateTimeFormat('es-HN', {
  timeZone: ZONA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** "Hoy" en Honduras como YYYY-MM-DD, para el `min` de los `FechaInput` y validaciones. */
export function hoyTegucigalpaISO(): string {
  return formateadorIso.format(new Date())
}

const REGEX_FECHA_SOLO = /^\d{4}-\d{2}-\d{2}$/

/**
 * Columnas `date` (sin hora) como `fecha_evento`, `fecha_necesaria`, `Feriados.fecha_inicio`… llegan
 * como 'YYYY-MM-DD' puro. `new Date('YYYY-MM-DD')` lo interpreta como medianoche UTC, que al mostrarse
 * en hora de Honduras (UTC-6) cae en el día anterior — por eso una fecha-sin-hora nunca pasa por un
 * formateador con `timeZone`: al mediodía UTC se mantiene en el mismo día civil para cualquier zona
 * razonable, incluida Honduras.
 */
function comoFechaSegura(fecha: string | Date): Date {
  if (typeof fecha === 'string' && REGEX_FECHA_SOLO.test(fecha)) return new Date(`${fecha}T12:00:00Z`)
  return new Date(fecha)
}

const formateadorMes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit' })

/** "YYYY-MM" en hora de Honduras, para agrupar series por mes. */
export function mesTegucigalpa(fecha: string | Date): string {
  return formateadorMes.format(new Date(fecha))
}

/** Ej. "lunes 19 de octubre", en hora de Honduras. */
export function formatFechaLarga(fecha: string | Date): string {
  const partes = formateadorFechaLarga.formatToParts(comoFechaSegura(fecha))
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  return `${obtener('weekday')} ${obtener('day')} de ${obtener('month')}`
}

/** dd/MM/yyyy, en hora de Honduras. */
export function formatFecha(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—'
  const [anio, mes, dia] = formateadorIso.format(comoFechaSegura(fecha)).split('-')
  return `${dia}/${mes}/${anio}`
}

/** dd/MM/yyyy h:mm a. m./p. m., en hora de Honduras. */
export function formatFechaHora(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—'
  return `${formatFecha(fecha)} ${formatHora(fecha)}`
}

/** "5 horas y 20 minutos" / "20 minutos" / "5 horas" — nunca decimales. */
export function formatoHorasHabiles(minutos: number): string {
  const m = Math.max(0, Math.round(minutos))
  const h = Math.floor(m / 60)
  const resto = m % 60
  const horasTexto = `${h} ${h === 1 ? 'hora' : 'horas'}`
  const minutosTexto = `${resto} ${resto === 1 ? 'minuto' : 'minutos'}`
  if (h === 0) return minutosTexto
  if (resto === 0) return horasTexto
  return `${horasTexto} y ${minutosTexto}`
}

export function formatHora(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—'
  return formateadorHora.format(new Date(fecha))
}

export function formatRelativo(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—'
  return formatDistanceToNowStrict(new Date(fecha), { addSuffix: true, locale: es })
}

export function horasRestantes(fechaLimiteIso: string | null | undefined): number | null {
  if (!fechaLimiteIso) return null
  const diffMs = new Date(fechaLimiteIso).getTime() - Date.now()
  return diffMs / 1000 / 60 / 60
}
