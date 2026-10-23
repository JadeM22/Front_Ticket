/** Mismo patrón que exige la base para `CampoFormulario.clave`. */
export const REGEX_CLAVE_CAMPO = /^[a-z][a-z0-9_]*$/

const LONGITUD_MAXIMA_CLAVE = 50

/** "Fecha de publicación (opcional)" → "fecha_de_publicacion_opcional". */
export function claveDesdeEtiqueta(etiqueta: string): string {
  const base = etiqueta
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, LONGITUD_MAXIMA_CLAVE)
    .replace(/_+$/, '')
  if (!base) return ''
  return /^[a-z]/.test(base) ? base : `campo_${base}`
}
