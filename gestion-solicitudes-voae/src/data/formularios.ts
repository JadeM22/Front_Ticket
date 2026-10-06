import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import type { DetalleFormulario, TipoSolicitudNombre } from '../types/domain'

export async function crearSolicitud(tipoSolicitudId: number, detalle: DetalleFormulario): Promise<number> {
  const { data, error } = await supabase.schema('Solicitudes').rpc('fnSolicitudCrearEscalar', {
    p_tipo_solicitud_id: tipoSolicitudId,
    p_detalle: detalle as unknown as Json,
  })
  if (error) throw error
  return data as number
}

export async function obtenerDetalleFormulario(
  formularioId: number,
  tipoSolicitud: TipoSolicitudNombre,
): Promise<DetalleFormulario | null> {
  const sb = supabase.schema('Solicitudes')

  switch (tipoSolicitud) {
    case 'Afiche': {
      const { data, error } = await sb.from('FormularioAfiche').select('*').eq('formulario_id', formularioId).maybeSingle()
      if (error) throw error
      return data
    }
    case 'Comunicado': {
      const { data, error } = await sb
        .from('FormularioComunicado')
        .select('*')
        .eq('formulario_id', formularioId)
        .maybeSingle()
      if (error) throw error
      return data
    }
    case 'Aviso': {
      const { data, error } = await sb.from('FormularioAviso').select('*').eq('formulario_id', formularioId).maybeSingle()
      if (error) throw error
      return data
    }
    case 'Cobertura de eventos': {
      const { data, error } = await sb
        .from('FormularioCoberturaEventos')
        .select('*')
        .eq('formulario_id', formularioId)
        .maybeSingle()
      if (error) throw error
      return data
    }
    case 'Edición fotográfica': {
      const { data, error } = await sb
        .from('FormularioEdicionFotografica')
        .select('*')
        .eq('formulario_id', formularioId)
        .maybeSingle()
      if (error) throw error
      return data
    }
    case 'Publicación en redes sociales': {
      const { data, error } = await sb
        .from('FormularioPublicacionRedesSociales')
        .select('*')
        .eq('formulario_id', formularioId)
        .maybeSingle()
      if (error) throw error
      return data
    }
    default:
      return null
  }
}
