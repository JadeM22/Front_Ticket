import type { RolNombre } from '../types/domain'

/**
 * Con qué ojos se mira un estado. La base no tiene estados nuevos: solo cambia el texto visible de
 * "Finalizado" y "Corrección" según quién mira. La decide la pantalla, no el rol más alto del usuario
 * (un jefe en "Mis solicitudes" mira como solicitante y en "Por dictaminar" como jefe).
 */
export type PerspectivaEstado = 'solicitante' | 'jefe' | 'diseno' | 'admin'

const ETIQUETAS: Record<PerspectivaEstado, Partial<Record<string, string>>> = {
  solicitante: { Finalizado: 'Esperando aprobación', Corrección: 'En proceso' },
  jefe: { Finalizado: 'Por dictaminar' },
  diseno: { Finalizado: 'Entregado – esperando dictamen' },
  admin: { Finalizado: 'Finalizado (esperando aprobación)' },
}

/** Texto visible de `estado_real` para una perspectiva. Los estados sin regla se muestran igual. */
export function etiquetaEstado(estadoReal: string | null | undefined, perspectiva: PerspectivaEstado): string {
  if (!estadoReal) return ''
  return ETIQUETAS[perspectiva][estadoReal] ?? estadoReal
}

/**
 * Perspectiva del detalle de un ticket, que comparten todos los roles: manda el rol de gestión más alto
 * (jefe solo en tickets de diseño, que son los que dictamina); sin ninguno, mira como solicitante.
 */
export function perspectivaDetalle(tieneRol: (rol: RolNombre) => boolean, esDiseno: boolean): PerspectivaEstado {
  if (esDiseno && tieneRol('Jefe de Área')) return 'jefe'
  if (tieneRol('Diseñador') || tieneRol('Asignador')) return 'diseno'
  if (tieneRol('Administrador')) return 'admin'
  return 'solicitante'
}

/** Reescribe la parte `Estado: "A" -> "B"` de una línea del historial (TicketLog) con las etiquetas visibles. */
export function etiquetarCambioEstado(descripcion: string, perspectiva: PerspectivaEstado): string {
  return descripcion.replace(
    /Estado: "([^"]*)" -> "([^"]*)"/g,
    (_, antes: string, despues: string) =>
      `Estado: "${etiquetaEstado(antes, perspectiva)}" -> "${etiquetaEstado(despues, perspectiva)}"`,
  )
}
