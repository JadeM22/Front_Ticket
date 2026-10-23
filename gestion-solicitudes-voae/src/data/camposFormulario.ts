import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type CampoFormulario = Tables<{ schema: 'Solicitudes' }, 'CampoFormulario'>

/** Lo que el Administrador puede cambiar después de crear: la base rechaza `clave`, `tipo_campo` y `tipo_solicitud_id`. */
export type CambiosCampo = Omit<
  TablesUpdate<{ schema: 'Solicitudes' }, 'CampoFormulario'>,
  'id' | 'clave' | 'tipo_campo' | 'tipo_solicitud_id' | 'usuario_registro' | 'fecha_registro'
>

export type NuevoCampo = Omit<
  TablesInsert<{ schema: 'Solicitudes' }, 'CampoFormulario'>,
  'id' | 'usuario_registro' | 'fecha_registro'
>

/** Activos e inactivos, en el orden en que se muestran en el formulario. */
export async function listarCamposPorTipo(tipoSolicitudId: number): Promise<CampoFormulario[]> {
  const { data, error } = await supabase
    .schema('Solicitudes')
    .from('CampoFormulario')
    .select('*')
    .eq('tipo_solicitud_id', tipoSolicitudId)
    .order('orden')
    .order('id')
  if (error) throw error
  return data ?? []
}

/** No envía usuario_registro ni fecha_registro: la base los pone. */
export async function crearCampo(campo: NuevoCampo): Promise<void> {
  const { error } = await supabase.schema('Solicitudes').from('CampoFormulario').insert(campo)
  if (error) throw error
}

export async function actualizarCampo(id: number, cambios: CambiosCampo): Promise<void> {
  const { error } = await supabase.schema('Solicitudes').from('CampoFormulario').update(cambios).eq('id', id)
  if (error) throw error
}

/**
 * Recibe los campos en el orden deseado y les asigna `orden` = 1, 2, 3… Solo actualiza los que
 * cambian. Renumerar (en vez de intercambiar dos valores) funciona aunque haya `orden` repetidos.
 */
export async function reordenarCampos(enOrden: CampoFormulario[]): Promise<void> {
  for (const [indice, campo] of enOrden.entries()) {
    if (campo.orden !== indice + 1) await actualizarCampo(campo.id, { orden: indice + 1 })
  }
}

/**
 * Copia los campos activos de `origenId` al final de `destinoId`, saltando las claves que el destino
 * ya tenga (activas o no, porque la clave es única por tipo). Devuelve cuántos copió y cuántos saltó.
 */
export async function copiarCamposDeTipo(
  origenId: number,
  destinoId: number,
): Promise<{ copiados: number; saltados: number }> {
  const [origen, destino] = await Promise.all([listarCamposPorTipo(origenId), listarCamposPorTipo(destinoId)])
  const clavesDestino = new Set(destino.map((c) => c.clave))
  const activos = origen.filter((c) => c.estado)
  const aCopiar = activos.filter((c) => !clavesDestino.has(c.clave))

  if (aCopiar.length > 0) {
    const ordenBase = destino.reduce((max, c) => Math.max(max, c.orden), 0)
    const filas: NuevoCampo[] = aCopiar.map((c, indice) => ({
      tipo_solicitud_id: destinoId,
      clave: c.clave,
      etiqueta: c.etiqueta,
      tipo_campo: c.tipo_campo,
      placeholder: c.placeholder,
      ayuda: c.ayuda,
      opciones: c.opciones,
      valor_defecto: c.valor_defecto,
      validaciones: c.validaciones,
      obligatorio: c.obligatorio,
      orden: ordenBase + indice + 1,
      estado: true,
    }))
    const { error } = await supabase.schema('Solicitudes').from('CampoFormulario').insert(filas)
    if (error) throw error
  }

  return { copiados: aCopiar.length, saltados: activos.length - aCopiar.length }
}
