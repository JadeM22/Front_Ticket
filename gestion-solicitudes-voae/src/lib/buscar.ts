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

/** Palabras de una búsqueda, ya normalizadas; los espacios repetidos no cuentan. */
export function palabrasBusqueda(busqueda: string): string[] {
  return normalizar(busqueda).split(/\s+/).filter(Boolean)
}

/**
 * `true` si cada palabra de la búsqueda aparece en alguno de los textos (sin tildes ni mayúsculas):
 * "invitacion formal" encuentra un tipo aunque "formal" solo esté en su descripción.
 */
export function coincidePalabras(textos: (string | null | undefined)[], busqueda: string): boolean {
  const palabras = palabrasBusqueda(busqueda)
  if (palabras.length === 0) return true
  const juntos = textos.filter(Boolean).map((t) => normalizar(t!)).join(' ')
  return palabras.every((p) => juntos.includes(p))
}

export interface ParteResaltada {
  texto: string
  resaltado: boolean
}

/**
 * Corta `texto` en partes marcando dónde aparece alguna palabra de la búsqueda. Compara sin tildes,
 * pero devuelve el texto original ("Invitación" se resalta completo al buscar "invitacion").
 */
export function partesResaltadas(texto: string, busqueda: string): ParteResaltada[] {
  const palabras = palabrasBusqueda(busqueda)
  if (palabras.length === 0 || !texto) return [{ texto, resaltado: false }]

  // Cada letra normalizada recuerda de qué posición del texto original viene.
  let normal = ''
  const origen: number[] = []
  Array.from(texto).forEach((letra, indice) => {
    for (const n of normalizar(letra) || (letra.trim() === '' ? ' ' : '')) {
      normal += n
      origen.push(indice)
    }
  })

  const letras = Array.from(texto)
  const marcado = new Array<boolean>(letras.length).fill(false)
  for (const palabra of palabras) {
    let desde = normal.indexOf(palabra)
    while (desde !== -1) {
      for (let i = desde; i < desde + palabra.length; i++) marcado[origen[i]] = true
      desde = normal.indexOf(palabra, desde + palabra.length)
    }
  }

  const partes: ParteResaltada[] = []
  letras.forEach((letra, i) => {
    const ultima = partes[partes.length - 1]
    if (ultima && ultima.resaltado === marcado[i]) ultima.texto += letra
    else partes.push({ texto: letra, resaltado: marcado[i] })
  })
  return partes
}
