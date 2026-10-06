import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { JERARQUIA_ROLES, RUTA_POR_ROL } from '../types/domain'
import { PantallaCarga } from '../components/ui/PantallaCarga'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'

/** Redirige al dashboard de mayor jerarquía: Administrador > Jefe de Área > Diseñador > Empleado. */
export function InicioRedirect() {
  const { perfil, cargando, cerrarSesion } = useAuth()

  if (cargando) return <PantallaCarga />
  if (!perfil) return <PantallaCarga />

  const rolPrincipal = JERARQUIA_ROLES.find((rol) => perfil.roles.includes(rol))

  if (!rolPrincipal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fondo p-6">
        <EmptyState
          titulo="Tu cuenta no tiene roles asignados"
          descripcion="Contacta a un administrador para que te asigne un rol y puedas usar el sistema."
          accion={<Button variante="secundario" onClick={() => void cerrarSesion()}>Cerrar sesión</Button>}
        />
      </div>
    )
  }

  return <Navigate to={RUTA_POR_ROL[rolPrincipal]} replace />
}
