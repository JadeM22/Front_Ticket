export function limpiarNombreArchivo(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
}

export function construirRutaArchivo(carpetaId: number, nombreArchivo: string): string {
  return `${carpetaId}/${crypto.randomUUID()}-${limpiarNombreArchivo(nombreArchivo)}`
}

export function esUrlHttp(valor: string): boolean {
  return /^https?:\/\//i.test(valor.trim())
}
