import {
  BarChart3,
  Gavel,
  History,
  Kanban,
  Layers,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Users,
} from 'lucide-react'
import type { RolNombre } from '../../types/domain'

export interface ItemNav {
  etiqueta: string
  ruta: string
  icono: typeof LayoutDashboard
}

export const NAV_POR_ROL: Record<RolNombre, ItemNav[]> = {
  Administrador: [
    { etiqueta: 'KPIs', ruta: '/admin', icono: BarChart3 },
    { etiqueta: 'Usuarios', ruta: '/admin/usuarios', icono: Users },
    { etiqueta: 'Catálogos', ruta: '/admin/catalogos', icono: Layers },
    { etiqueta: 'Bitácora', ruta: '/admin/bitacora', icono: History },
  ],
  'Jefe de Área': [{ etiqueta: 'Por dictaminar', ruta: '/jefe', icono: Gavel }],
  Diseñador: [{ etiqueta: 'Tablero', ruta: '/disenador', icono: Kanban }],
  Empleado: [
    { etiqueta: 'Resumen', ruta: '/empleado', icono: LayoutDashboard },
    { etiqueta: 'Nueva solicitud', ruta: '/empleado/nueva', icono: PlusCircle },
    { etiqueta: 'Mis solicitudes', ruta: '/empleado/solicitudes', icono: ListChecks },
  ],
}
