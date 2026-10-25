const ESQUEMAS_PROHIBIDOS = /^(javascript|data|file):/i

/**
 * Normaliza un enlace escrito a mano: recorta espacios, antepone `https://` si hace falta, rechaza
 * esquemas peligrosos y exige un host con al menos un punto (`unah.edu.hn`, no `unah`). Devuelve
 * `null` si el texto queda vacío o no es un enlace válido.
 */
export function normalizarEnlace(texto: string): string | null {
  const recortado = texto.trim()
  if (!recortado) return null
  if (ESQUEMAS_PROHIBIDOS.test(recortado)) return null

  const conEsquema = /^https?:\/\//i.test(recortado) ? recortado : `https://${recortado}`

  try {
    const url = new URL(conEsquema)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}
