import { supabase } from '../lib/supabase'
import { construirRutaArchivo } from '../lib/archivos'
import type { Tables } from '../types/database'

const BUCKET = 'adjuntos'
export const LIMITE_BYTES_ADJUNTO = 50 * 1024 * 1024
export const MAXIMO_ADJUNTOS_POR_TICKET = 10

export type Adjunto = Tables<{ schema: 'Solicitudes' }, 'Adjuntos'>

export async function listarAdjuntosPorTicket(ticketId: number): Promise<Adjunto[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('Adjuntos')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('fecha_registro')
  if (error) throw error
  return data ?? []
}

interface SubirAdjuntoArchivoInput {
  ticketId: number
  archivo: File
  descripcion?: string | null
}

export async function subirAdjuntoArchivo({ ticketId, archivo, descripcion }: SubirAdjuntoArchivoInput): Promise<Adjunto> {
  const ruta = construirRutaArchivo(ticketId, archivo.name)

  const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: archivo.type || 'application/octet-stream',
  })
  if (errorSubida) throw errorSubida

  const { data, error: errorInsertar } = await supabase
    .schema('Solicitudes')
    .from('Adjuntos')
    .insert({
      ticket_id: ticketId,
      tipo: 'ARCHIVO',
      nombre_archivo: archivo.name,
      ruta_o_url: ruta,
      tipo_mime: archivo.type || null,
      tamano_bytes: archivo.size,
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

interface SubirAdjuntoLinkInput {
  ticketId: number
  titulo: string
  url: string
  descripcion?: string | null
}

export async function subirAdjuntoLink({ ticketId, titulo, url, descripcion }: SubirAdjuntoLinkInput): Promise<Adjunto> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('Adjuntos')
    .insert({
      ticket_id: ticketId,
      tipo: 'LINK',
      nombre_archivo: titulo,
      ruta_o_url: url,
      descripcion: descripcion ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function crearUrlFirmadaAdjunto(ruta: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 3600)
  if (error) throw error
  return data.signedUrl
}
