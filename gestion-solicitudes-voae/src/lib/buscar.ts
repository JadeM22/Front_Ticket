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
 * Los códigos de ticket llevan guion y ceros (`AOAA-0020`): esto deja solo letras/números y quita los
 * ceros a la izquierda de cada número, así que "aoaa20", "aoaa-20", "aoaa 20" y "AOAA-0020" comparan
 * igual sin importar cómo se hayan escrito el guion, los espacios o los ceros (E-14).
 */
export function soloCodigo(valor: string): string {
  return normalizar(valor)
    .replace(/[\s-]/g, '')
    .replace(/\d+/g, (numero) => numero.replace(/^0+(?=\d)/, ''))
}

/** Igual que `coincideTexto`, pero compara códigos con `soloCodigo` en vez de `normalizar`. */
export function coincideCodigo(codigo: string | null | undefined, busqueda: string): boolean {
  const q = soloCodigo(busqueda)
  if (!q) return true
  if (!codigo) return false
  return soloCodigo(codigo).includes(q)
}
