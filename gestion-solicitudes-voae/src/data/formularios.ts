import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import type { DetalleFormulario, FormularioCodigo } from '../types/domain'

export async function crearSolicitud(tipoSolicitudId: number, detalle: DetalleFormulario): Promise<number> {
  const { data, error } = await supabase.schema('Solicitudes').rpc('fnSolicitudCrearEscalar', {
    p_tipo_solicitud_id: tipoSolicitudId,
    p_detalle: detalle as unknown as Json,
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

export async function obtenerDetalleFormulario(
  formularioId: number,
  formulario: FormularioCodigo,
): Promise<DetalleFormulario | null> {
  const sb = supabase.schema('Solicitudes')

  switch (formulario) {
    case 'ARTE': {
      const { data, error } = await sb.from('FormularioArte').select('*').eq('formulario_id', formularioId).maybeSingle()
      if (error) throw error
      return data
    }
    case 'VIDEO': {
      const { data, error } = await sb.from('FormularioVideo').select('*').eq('formulario_id', formularioId).maybeSingle()
      if (error) throw error
      return data
    }
    case 'DIRCOM': {
      const { data, error } = await sb.from('FormularioDircom').select('*').eq('formulario_id', formularioId).maybeSingle()
      if (error) throw error
      return data
    }
    case 'PROTOCOLO': {
      const { data, error } = await sb
        .from('FormularioProtocolo')
        .select('*')
        .eq('formulario_id', formularioId)
        .maybeSingle()
      if (error) throw error
      return data
    }
    case 'GENERICO': {
      const { data, error } = await sb.from('FormularioGenerico').select('*').eq('formulario_id', formularioId).maybeSingle()
      if (error) throw error
      return data
    }
  }
}
