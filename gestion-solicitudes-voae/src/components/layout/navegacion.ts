import {
  BarChart3,
  CalendarOff,
  Gavel,
  History,
  Kanban,
  Layers,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Shuffle,
  Sparkles,
  Users,
  Zap,
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
    { etiqueta: 'Feriados', ruta: '/admin/feriados', icono: CalendarOff },
    { etiqueta: 'Bitácora', ruta: '/admin/bitacora', icono: History },
    { etiqueta: 'Estadísticas', ruta: '/analista', icono: BarChart3 },
  ],
  'Jefe de Área': [
    { etiqueta: 'Por dictaminar', ruta: '/jefe', icono: Gavel },
    { etiqueta: 'Solicitud excepcional', ruta: '/jefe/excepcional', icono: Zap },
    { etiqueta: 'Nueva solicitud', ruta: '/empleado/nueva', icono: PlusCircle },
    { etiqueta: 'Mis solicitudes', ruta: '/empleado/solicitudes', icono: ListChecks },
  ],
  Asignador: [{ etiqueta: 'Asignación', ruta: '/asignador', icono: Shuffle }],
  Validador: [{ etiqueta: 'Por validar', ruta: '/validador', icono: Sparkles }],
  Diseñador: [{ etiqueta: 'Mi tablero', ruta: '/disenador', icono: Kanban }],
  Analista: [
    { etiqueta: 'Estadísticas', ruta: '/analista', icono: BarChart3 },
    { etiqueta: 'Nueva solicitud', ruta: '/empleado/nueva', icono: PlusCircle },
    { etiqueta: 'Mis solicitudes', ruta: '/empleado/solicitudes', icono: ListChecks },
  ],
  Empleado: [
    { etiqueta: 'Resumen', ruta: '/empleado', icono: LayoutDashboard },
    { etiqueta: 'Nueva solicitud', ruta: '/empleado/nueva', icono: PlusCircle },
    { etiqueta: 'Mis solicitudes', ruta: '/empleado/solicitudes', icono: ListChecks },
  ],
}
