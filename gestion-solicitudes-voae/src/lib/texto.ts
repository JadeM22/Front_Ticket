/** Minúsculas y sin tildes, para comparar búsquedas del usuario sin importar mayúsculas ni acentos. */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** `true` si `texto` contiene `busqueda`, normalizando ambos. Una búsqueda vacía siempre coincide. */
export function coincideTexto(texto: string | null | undefined, busqueda: string): boolean {
  const q = normalizarTexto(busqueda.trim())
  if (!q) return true
  if (!texto) return false
  return normalizarTexto(texto).includes(q)
}
