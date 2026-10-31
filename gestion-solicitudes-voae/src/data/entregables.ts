import { supabase } from '../lib/supabase'
import { construirRutaEntregable } from '../lib/entregables'
import type { Tables } from '../types/database'
import type { TipoEntregable } from '../types/domain'

const BUCKET = 'entregables'

export type Entregable = Tables<{ schema: 'Solicitudes' }, 'Entregables'>

export async function listarEntregablesPorTicket(ticketId: number): Promise<Entregable[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('Entregables')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('version')
    .order('fecha_subida')
  if (error) throw error
  return data ?? []
}

interface SubirEntregableArchivoInput {
  ticketId: number
  disenadorId: number
  tipoEntregable: TipoEntregable
  archivo: File
  descripcion?: string | null
}

interface SubirEntregableLinkInput {
  ticketId: number
  disenadorId: number
  url: string
  descripcion?: string | null
}

export async function subirEntregableArchivo({
  ticketId,
  disenadorId,
  tipoEntregable,
  archivo,
  descripcion,
}: SubirEntregableArchivoInput): Promise<Entregable> {
  const ruta = construirRutaEntregable(ticketId, archivo.name)

  const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: archivo.type || 'application/octet-stream',
  })
  if (errorSubida) throw errorSubida

  const { data, error: errorInsertar } = await supabase
    .schema('Solicitudes')
    .from('Entregables')
    .insert({
      ticket_id: ticketId,
      disenador_id: disenadorId,
      tipo_entregable: tipoEntregable,
      url_o_ruta: ruta,
      descripcion: descripcion ?? null,
    })
    .select('*')
    .single()

  if (errorInsertar) {
    await supabase.storage.from(BUCKET).remove([ruta])
    throw errorInsertar
  }

  return data
}

export async function subirEntregableLink({
  ticketId,
  disenadorId,
  url,
  descripcion,
}: SubirEntregableLinkInput): Promise<Entregable> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('Entregables')
    .insert({
      ticket_id: ticketId,
      disenador_id: disenadorId,
      tipo_entregable: 'LINK',
      url_o_ruta: url,
      descripcion: descripcion ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

/** Ver y descargar usan URLs de vida corta: se piden justo antes de usarlas. */
const SEGUNDOS_URL_DESCARGA = 60

/** URL firmada para ver el archivo (vista previa o pestaña nueva), sin forzar la descarga. */
export async function crearUrlVer(ruta: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, SEGUNDOS_URL_DESCARGA)
  if (error) throw error
  return data.signedUrl
}

/** URL firmada que el navegador descarga (no abre) con el nombre legible `nombre`. */
export async function crearUrlDescarga(ruta: string, nombre: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, SEGUNDOS_URL_DESCARGA, { download: nombre })
  if (error) throw error
  return data.signedUrl
}

/** Contenido del archivo, para armar el ZIP en el navegador (también con una URL firmada de 60 s). */
export async function obtenerArchivoEntregable(ruta: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, SEGUNDOS_URL_DESCARGA)
  if (error) throw error
  const respuesta = await fetch(data.signedUrl)
  if (!respuesta.ok) throw new Error(`No se pudo descargar el archivo (${respuesta.status}).`)
  return respuesta.blob()
}
