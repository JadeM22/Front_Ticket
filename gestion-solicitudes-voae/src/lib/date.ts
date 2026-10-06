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
