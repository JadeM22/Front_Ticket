import type { TipoEntregable } from '../types/domain'
import { construirRutaArchivo } from './archivos'

export const LIMITE_BYTES_ENTREGABLE = 50 * 1024 * 1024

export function inferirTipoEntregable(archivo: File): TipoEntregable {
  if (archivo.type === 'application/pdf') return 'PDF'
  if (archivo.type.startsWith('image/')) return 'IMAGEN'
  if (archivo.type.startsWith('video/')) return 'VIDEO'
  return 'OTRO'
}

export function construirRutaEntregable(ticketId: number, nombreArchivo: string): string {
  return construirRutaArchivo(ticketId, nombreArchivo)
}

export { esUrlHttp } from './archivos'
