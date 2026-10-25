import type { RolNombre } from '../types/domain'

const ROLES_CON_ASIGNACION: RolNombre[] = ['Diseñador', 'Asignador', 'Administrador']

/**
 * `true` si alguno de los roles ve a quién está asignado un ticket. La base (Parte 37) ya nulea
 * `disenador_id`/`disenador`/`asignado_por*`/`fecha_asignacion` en `vw_TicketsEstadoReal` para quien
 * no es Diseñador, Asignador o Administrador — ni siquiera el Jefe de Área del ticket ve ya quién lo
 * diseña — esto solo evita que el frontend muestre literalmente "Sin asignar" a quien no debería ni
 * saber que existe un diseñador.
 */
export function puedeVerAsignacion(roles: RolNombre[]): boolean {
  return roles.some((r) => ROLES_CON_ASIGNACION.includes(r))
}
