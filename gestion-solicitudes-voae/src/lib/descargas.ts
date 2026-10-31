/**
 * Nombres y disparadores de descarga de entregables y adjuntos. La ruta en Storage es
 * `${ticketId}/${uuid}-${nombreLimpio}` (`lib/entregables.ts`): de ahí solo se toma la extensión, para
 * que el archivo descargado nunca exponga la ruta interna.
 */

/** Extensión del archivo guardado, en minúsculas y sin el punto ("" si no tiene). */
export function extensionDe(ruta: string): string {
  const nombre = ruta.split('/').pop() ?? ''
  const punto = nombre.lastIndexOf('.')
  return punto > 0 ? nombre.slice(punto + 1).toLowerCase() : ''
}

/**
 * `{codigo}_v{version}.{ext}`; si una versión tiene varios archivos, se numeran
 * (`{codigo}_v2_1.pdf`, `{codigo}_v2_2.png`) para que no se pisen dentro del ZIP.
 */
export function nombreDescarga(codigo: string, version: number, ruta: string, indice = 0, totalEnVersion = 1): string {
  const ext = extensionDe(ruta)
  const sufijo = totalEnVersion > 1 ? `_${indice + 1}` : ''
  return `${codigo}_v${version}${sufijo}${ext ? `.${ext}` : ''}`
}

/** `{codigo}_adjunto{n}.{ext}`: los adjuntos no tienen versión, se numeran por orden de subida (desde 1). */
export function nombreDescargaAdjunto(codigo: string, numero: number, ruta: string): string {
  const ext = extensionDe(ruta)
  return `${codigo}_adjunto${numero}${ext ? `.${ext}` : ''}`
}

const EXTENSIONES_IMAGEN = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif']

/**
 * Qué vista previa admite un archivo: `imagen` o `pdf` se abren en el modal; `null` (cualquier otro tipo)
 * se abre en una pestaña nueva. Manda el MIME si se conoce; si no, la extensión de la ruta.
 */
export function tipoVistaPrevia(mime: string | null | undefined, ruta: string): 'imagen' | 'pdf' | null {
  if (mime?.startsWith('image/')) return 'imagen'
  if (mime === 'application/pdf') return 'pdf'
  const ext = extensionDe(ruta)
  if (EXTENSIONES_IMAGEN.includes(ext)) return 'imagen'
  if (ext === 'pdf') return 'pdf'
  return null
}

/** La URL firmada ya trae `Content-Disposition: attachment`, así que basta con seguirla. */
export function descargarDesdeUrl(url: string) {
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.rel = 'noopener noreferrer'
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
}

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Se libera después: algunos navegadores todavía leen el blob justo tras el clic.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
