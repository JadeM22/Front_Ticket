/**
 * "COBERTURA NACIONAL" (Parte 52) es una fila más de `Campus`, excluyente: si se elige, la base guarda
 * solo esa. Se reconoce siempre por `es_cobertura_nacional`, nunca por nombre ni por id.
 */
export const TEXTO_COBERTURA_NACIONAL = 'Cobertura nacional'

interface CampusConNombre {
  nombre: string
  es_cobertura_nacional?: boolean | null
}

/** Nombre visible de un campus: la opción nacional siempre como "Cobertura nacional". */
export function nombreCampus(campus: CampusConNombre): string {
  return campus.es_cobertura_nacional ? TEXTO_COBERTURA_NACIONAL : campus.nombre
}

/** Lo que se muestra como alcance: si viene la nacional, solo esa (igual que guarda la base). */
export function nombresAlcance(campus: CampusConNombre[]): string[] {
  const nacional = campus.find((c) => c.es_cobertura_nacional)
  return nacional ? [TEXTO_COBERTURA_NACIONAL] : campus.map((c) => c.nombre)
}
