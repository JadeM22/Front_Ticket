import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { DecisionValidacion as Decision } from '../types/domain'

export type DecisionValidacion = Tables<{ schema: 'Solicitudes' }, 'DecisionValidacion'>

/** Una solicitud de flujo VALIDACION tiene a lo sumo una decisión (la base lo garantiza). */
export async function obtenerDecisionValidacion(ticketId: number): Promise<DecisionValidacion | null> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('DecisionValidacion')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

interface RegistrarDecisionInput {
  ticketId: number
  /** El usuario actual: la política exige que sea él mismo y que tenga el rol Validador. */
  validadorId: number
  decision: Decision
  comentario?: string | null
}

/**
 * Registra la decisión del Validador. La base cambia el ticket a "Aprobado" o "Rechazado" y avisa al
 * solicitante; el comentario es obligatorio al rechazar.
 */
export async function registrarDecisionValidacion({ ticketId, validadorId, decision, comentario }: RegistrarDecisionInput) {
  const { error } = await supabase
    .schema('Solicitudes')
    .from('DecisionValidacion')
    .insert({
      ticket_id: ticketId,
      validador_id: validadorId,
      decision,
      comentario: comentario?.trim() || null,
    })
  if (error) throw error
}
