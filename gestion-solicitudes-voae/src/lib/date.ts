import { es } from 'date-fns/locale'
import { formatDistanceToNowStrict } from 'date-fns'

const ZONA = 'America/Tegucigalpa'

const formateadorFecha = new Intl.DateTimeFormat('es-HN', {
  timeZone: ZONA,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const formateadorFechaHora = new Intl.DateTimeFormat('es-HN', {
  timeZone: ZONA,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const formateadorHora = new Intl.DateTimeFormat('es-HN', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
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

/** "Hoy" en Honduras como YYYY-MM-DD, para el `min` de los <input type="date"> y validaciones. */
export function hoyTegucigalpaISO(): string {
  return formateadorIso.format(new Date())
}

const formateadorMes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit' })

/** "YYYY-MM" en hora de Honduras, para agrupar series por mes. */
export function mesTegucigalpa(fecha: string | Date): string {
  return formateadorMes.format(new Date(fecha))
}

/** Ej. "lunes 19 de octubre", en hora de Honduras. */
export function formatFechaLarga(fecha: string | Date): string {
  const partes = formateadorFechaLarga.formatToParts(new Date(fecha))
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  return `${obtener('weekday')} ${obtener('day')} de ${obtener('month')}`
}

export function formatFecha(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—'
  return formateadorFecha.format(new Date(fecha))
}

export function formatFechaHora(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—'
  return formateadorFechaHora.format(new Date(fecha))
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
