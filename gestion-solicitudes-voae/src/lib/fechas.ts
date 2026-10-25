import type { Feriado } from '../data/catalogos'

/** Mensaje de la base para fechas que no son día hábil (`fecha_evento`, campos `FECHA`). */
export const MENSAJE_DIA_NO_HABIL = 'Elige un día hábil (lunes a viernes, sin feriados).'

/** Feriado activo que cubre `fecha` ('YYYY-MM-DD'), si hay alguno. */
export function feriadoEn(fecha: string, feriados: readonly Feriado[]): Feriado | undefined {
  return feriados.find((f) => f.estado && f.fecha_inicio <= fecha && fecha <= f.fecha_fin)
}

/** `true` si `fecha` es de lunes a viernes y no cae dentro de un feriado activo. */
export function esDiaHabil(fecha: string, feriados: readonly Feriado[]): boolean {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay()
  if (dia === 0 || dia === 6) return false
  return feriadoEn(fecha, feriados) === undefined
}

/**
 * `true` si un calendario de solicitud debe deshabilitar `fecha`: antes de `minimo` (si se da), fin
 * de semana o feriado activo. La base vuelve a validar esto mismo al enviar.
 */
export function deshabilitarDia(fecha: string, { minimo, feriados }: { minimo?: string; feriados: readonly Feriado[] }): boolean {
  if (minimo !== undefined && fecha < minimo) return true
  return !esDiaHabil(fecha, feriados)
}
