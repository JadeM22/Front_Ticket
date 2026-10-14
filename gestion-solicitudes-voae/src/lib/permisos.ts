import type { RolNombre } from '../types/domain'

const ROLES_CON_ASIGNACION: RolNombre[] = ['Diseñador', 'Asignador', 'Administrador', 'Jefe de Área']

/**
 * `true` si alguno de los roles ve a quién está asignado un ticket. La base (Parte 27) ya nulea
 * `disenador_id`/`disenador`/`asignado_por*`/`fecha_asignacion` en `vw_TicketsEstadoReal` para quien
 * no es Diseñador, Asignador, Administrador o Jefe del área del ticket — esto solo evita que el
 * frontend muestre literalmente "Sin asignar" a quien no debería ni saber que existe un diseñador.
 */
export function puedeVerAsignacion(roles: RolNombre[]): boolean {
  return roles.some((r) => ROLES_CON_ASIGNACION.includes(r))
}
