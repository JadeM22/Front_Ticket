import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import { PantallaCarga } from '../components/ui/PantallaCarga'

/**
 * Mientras debe_cambiar_password = true, la base trata al usuario como sin sesión real
 * (no ve tickets ni roles), así que esta pantalla debe resolverse antes que cualquier otra.
 */
export function RequirePasswordOk() {
  const { perfil, cargando } = useAuth()

  if (cargando) return <PantallaCarga />
  if (perfil?.debe_cambiar_password) return <Navigate to="/cambiar-password" replace />

  return <Outlet />
}
