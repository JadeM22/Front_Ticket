import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import { PantallaCarga } from '../components/ui/PantallaCarga'
import type { RolNombre } from '../types/domain'

interface RequireRoleProps {
  roles: RolNombre[]
  /** Si se pasa, se muestra en un toast la primera vez que a alguien sin el rol se le niega la ruta. */
  mensajeDenegado?: string
}

export function RequireRole({ roles, mensajeDenegado }: RequireRoleProps) {
  const { perfil, cargando } = useAuth()
  const denegado = !cargando && (!perfil || !roles.some((rol) => perfil.roles.includes(rol)))

  useEffect(() => {
    if (denegado && mensajeDenegado) toast.error(mensajeDenegado)
  }, [denegado, mensajeDenegado])

  if (cargando) return <PantallaCarga />
  if (denegado) return <Navigate to="/" replace />

  return <Outlet />
}
