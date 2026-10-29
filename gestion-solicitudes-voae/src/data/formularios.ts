import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import { normalizarCampos } from '../lib/validacionFormularios'
import { nombresAlcance } from '../lib/campus'
import type { DetalleFormulario, DetalleSolicitud } from '../types/domain'

/** La base valida generalidades, campus y respuestas, y aplica los valores por defecto. */
export async function crearSolicitud(
  tipoSolicitudId: number,
  detalle: DetalleSolicitud,
  excepcional = false,
): Promise<number> {
  const { data, error } = await supabase.schema('Solicitudes').rpc('fnSolicitudCrearEscalar', {
    p_tipo_solicitud_id: tipoSolicitudId,
    p_detalle: detalle as unknown as Json,
    p_excepcional: excepcional,
  })
  if (error) throw error
  return data as number
}

export async function obtenerFechaLimiteEstimada(tipoSolicitudId: number): Promise<string> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .rpc('fnFechaLimiteCalcularEscalar', { p_tipo_solicitud_id: tipoSolicitudId })
  if (error) throw error
  return data as string
}

/** Primer día permitido para la fecha del evento: días hábiles del tipo, o 2 días hábiles si es excepcional. */
export async function obtenerFechaEventoMinima(tipoSolicitudId: number, excepcional: boolean): Promise<string> {
  const { data, error } = await supabase.schema('Solicitudes').rpc('fnFechaEventoMinimaEscalar', {
    p_tipo_solicitud_id: tipoSolicitudId,
    p_excepcional: excepcional,
  })
  if (error) throw error
  return data as string
}

export async function esHorarioHabil(): Promise<boolean> {
  const { data, error } = await supabase.schema('Solicitudes').rpc('fnEsHorarioHabilEscalar')
  if (error) throw error
  return data as boolean
}

interface FilaFormularioCampus {
  Campus: { nombre: string; orden: number; es_cobertura_nacional: boolean } | null
}

/**
 * Generalidades + respuestas de una solicitud ya enviada. Los campos salen de `campos_snapshot` (lo
 * que el solicitante vio al enviar), nunca de la configuración actual de `CampoFormulario`.
 */
export async function obtenerDetalleFormulario(formularioId: number): Promise<DetalleFormulario | null> {
  const sb = supabase.schema('Solicitudes')

  const [formulario, campus] = await Promise.all([
    sb
      .from('Formularios')
      .select('titulo, dirigido_a, fecha_evento, respuestas, campos_snapshot')
      .eq('id', formularioId)
      .maybeSingle(),
    sb.from('FormularioCampus').select('Campus(nombre, orden, es_cobertura_nacional)').eq('formulario_id', formularioId),
  ])
  if (formulario.error) throw formulario.error
  if (campus.error) throw campus.error
  if (!formulario.data) return null

  const { titulo, dirigido_a, fecha_evento, respuestas, campos_snapshot } = formulario.data

  return {
    titulo,
    dirigido_a,
    fecha_evento,
    campus: nombresAlcance(
      ((campus.data ?? []) as unknown as FilaFormularioCampus[])
        .map((fila) => fila.Campus)
        .filter((c): c is NonNullable<FilaFormularioCampus['Campus']> => c != null)
        .sort((a, b) => a.orden - b.orden),
    ),
    campos: normalizarCampos(Array.isArray(campos_snapshot) ? campos_snapshot : []),
    respuestas:
      respuestas && typeof respuestas === 'object' && !Array.isArray(respuestas)
        ? (respuestas as DetalleFormulario['respuestas'])
        : {},
  }
}
