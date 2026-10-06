import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { PantallaCarga } from '../components/ui/PantallaCarga'

export function RequireAuth() {
  const { session, cargando } = useAuth()
  const ubicacion = useLocation()

  if (cargando) return <PantallaCarga />
  if (!session) return <Navigate to="/login" state={{ desde: ubicacion }} replace />

  return <Outlet />
}
