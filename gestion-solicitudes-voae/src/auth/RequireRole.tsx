import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import { PantallaCarga } from '../components/ui/PantallaCarga'
import type { RolNombre } from '../types/domain'

export function RequireRole({ roles }: { roles: RolNombre[] }) {
  const { perfil, cargando } = useAuth()

  if (cargando) return <PantallaCarga />
  if (!perfil || !roles.some((rol) => perfil.roles.includes(rol))) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
