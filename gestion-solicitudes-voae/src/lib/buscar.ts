/** Minúsculas y sin tildes, para comparar búsquedas del usuario sin importar mayúsculas ni acentos. */
export function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** `true` si `texto` contiene `busqueda`, normalizando ambos. Una búsqueda vacía siempre coincide. */
export function coincideTexto(texto: string | null | undefined, busqueda: string): boolean {
  const q = normalizar(busqueda)
  if (!q) return true
  if (!texto) return false
  return normalizar(texto).includes(q)
}

/**
 * Los códigos de ticket llevan guion (`ADH-0001`): esto deja solo letras/números, así que
 * "adh1", "ADH-0001", "adh 1" y "0001" comparan igual sin importar cómo se haya escrito el guion
 * o los espacios.
 */
export function soloCodigo(valor: string): string {
  return normalizar(valor).replace(/[\s-]/g, '')
}

/** Igual que `coincideTexto`, pero compara códigos con `soloCodigo` en vez de `normalizar`. */
export function coincideCodigo(codigo: string | null | undefined, busqueda: string): boolean {
  const q = soloCodigo(busqueda)
  if (!q) return true
  if (!codigo) return false
  return soloCodigo(codigo).includes(q)
}
