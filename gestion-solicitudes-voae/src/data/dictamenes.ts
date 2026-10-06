import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { DecisionJefe } from '../types/domain'

export type DictamenJefe = Tables<{ schema: 'Solicitudes' }, 'DictamenJefe'>

export async function listarDictamenesPorTicket(ticketId: number): Promise<DictamenJefe[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('DictamenJefe')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('fecha_dictamen')
  if (error) throw error
  return data ?? []
}

export async function crearDictamen(ticketId: number, decision: DecisionJefe, comentario?: string): Promise<void> {
  const { error } = await supabase
    .schema('Solicitudes')
    .from('DictamenJefe')
    .insert({ ticket_id: ticketId, decision, comentario: comentario ?? null })
  if (error) throw error
}
