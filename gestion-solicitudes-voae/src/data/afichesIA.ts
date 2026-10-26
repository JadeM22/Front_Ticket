import { supabase } from '../lib/supabase'
import { construirRutaArchivo } from '../lib/archivos'
import type { Tables, TablesInsert } from '../types/database'
import type { DecisionIA } from '../types/domain'

const BUCKET = 'afiches-ia'

/** Mismos límites que el bucket "afiches-ia": se validan antes de subir para avisar rápido. */
export const LIMITE_BYTES_AFICHE = 10 * 1024 * 1024
export const TIPOS_MIME_AFICHE = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
export const ACEPTAR_AFICHE = TIPOS_MIME_AFICHE.join(',')
export const INTENTOS_MAXIMOS_IA = 5

export type EnvioIA = Tables<{ schema: 'Solicitudes' }, 'EnvioIA'>
export type RevisionIA = Tables<{ schema: 'Solicitudes' }, 'RevisionIA'>

/** Afiche elegido en un formulario, todavía sin subir. */
export interface AficheSeleccionado {
  archivo: File | null
  comentario: string
}

export const AFICHE_VACIO: AficheSeleccionado = { archivo: null, comentario: '' }

/** Mensaje de error si el archivo no cumple las reglas del bucket, o `null` si está bien. */
export function validarArchivoAfiche(archivo: File): string | null {
  if (!TIPOS_MIME_AFICHE.includes(archivo.type)) return 'El afiche debe ser una imagen PNG, JPG o WEBP, o un PDF.'
  if (archivo.size > LIMITE_BYTES_AFICHE) return 'El afiche no puede pesar más de 10 MB.'
  return null
}

export async function listarEnviosIA(ticketId: number): Promise<EnvioIA[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('EnvioIA')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('intento')
  if (error) throw error
  return data ?? []
}

/**
 * El envío más reciente de cada ticket, para las miniaturas de la bandeja del Validador: una sola
 * consulta para todas las tarjetas en vez de una por ticket.
 */
export async function listarUltimosEnviosIA(ticketIds: number[]): Promise<Map<number, EnvioIA>> {
  const ultimos = new Map<number, EnvioIA>()
  if (ticketIds.length === 0) return ultimos
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('EnvioIA')
    .select('*')
    .in('ticket_id', ticketIds)
    .order('intento', { ascending: false })
  if (error) throw error
  for (const envio of data ?? []) {
    if (!ultimos.has(envio.ticket_id)) ultimos.set(envio.ticket_id, envio)
  }
  return ultimos
}

export async function listarRevisionesIA(ticketId: number): Promise<RevisionIA[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('RevisionIA')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('fecha_revision')
  if (error) throw error
  return data ?? []
}

interface SubirAficheInput {
  ticketId: number
  archivo: File
  comentario?: string | null
}

/**
 * Sube el afiche a "afiches-ia/<ticket_id>/…" y lo registra en `EnvioIA`. La base calcula `intento`
 * y `usuario_registro`, y cambia el estado del ticket. Si el registro falla se borra el archivo
 * (la política de Storage lo permite mientras no esté registrado en `EnvioIA`).
 */
export async function subirAficheIA({ ticketId, archivo, comentario }: SubirAficheInput): Promise<EnvioIA> {
  const ruta = construirRutaArchivo(ticketId, archivo.name)

  const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: archivo.type,
  })
  if (errorSubida) throw errorSubida

  const { data, error: errorInsertar } = await supabase
    .schema('Solicitudes')
    .from('EnvioIA')
    // `intento` y `usuario_registro` los pone la base: los tipos generados los marcan obligatorios
    // solo porque son NOT NULL sin default.
    .insert({
      ticket_id: ticketId,
      ruta_archivo: ruta,
      nombre_archivo: archivo.name,
      tipo_mime: archivo.type || null,
      comentario: comentario?.trim() || null,
    } as TablesInsert<{ schema: 'Solicitudes' }, 'EnvioIA'>)
    .select('*')
    .single()

  if (errorInsertar) {
    await supabase.storage.from(BUCKET).remove([ruta])
    throw errorInsertar
  }

  return data
}

/** La base llena `ticket_id` y `revisor_id`, y cambia el estado del ticket según la decisión. */
export async function revisarEnvioIA(envioId: number, decision: DecisionIA, comentario?: string | null): Promise<void> {
  const { error } = await supabase
    .schema('Solicitudes')
    .from('RevisionIA')
    // `ticket_id` y `revisor_id` los pone la base (NOT NULL sin default en los tipos generados).
    .insert({ envio_id: envioId, decision, comentario: comentario?.trim() || null } as TablesInsert<
      { schema: 'Solicitudes' },
      'RevisionIA'
    >)
  if (error) throw error
}

export async function crearUrlFirmadaAfiche(ruta: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 3600)
  if (error) throw error
  return data.signedUrl
}
