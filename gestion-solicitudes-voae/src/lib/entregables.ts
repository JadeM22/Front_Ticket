import type { TipoEntregable } from '../types/domain'

export const LIMITE_BYTES_ENTREGABLE = 50 * 1024 * 1024

export function inferirTipoEntregable(archivo: File): TipoEntregable {
  if (archivo.type === 'application/pdf') return 'PDF'
  if (archivo.type.startsWith('image/')) return 'IMAGEN'
  if (archivo.type.startsWith('video/')) return 'VIDEO'
  return 'OTRO'
}

export function limpiarNombreArchivo(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
}

export function construirRutaEntregable(ticketId: number, nombreArchivo: string): string {
  return `${ticketId}/${crypto.randomUUID()}-${limpiarNombreArchivo(nombreArchivo)}`
}

export function esUrlHttp(valor: string): boolean {
  return /^https?:\/\//i.test(valor.trim())
}
