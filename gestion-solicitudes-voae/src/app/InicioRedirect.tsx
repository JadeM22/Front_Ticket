import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { JERARQUIA_ROLES, RUTA_POR_ROL } from '../types/domain'
import { PantallaCarga } from '../components/ui/PantallaCarga'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'

/** Redirige al dashboard de mayor jerarquía: Administrador > Jefe de Área > Diseñador > Analista > Empleado. */
export function InicioRedirect() {
  const { perfil, cargando, perfilConError, recargarPerfil, cerrarSesion } = useAuth()

  if (cargando) return <PantallaCarga />

  // Si la carga del perfil falló, no te quedas en el spinner para siempre: se ofrece reintentar o salir.
  if (!perfil && perfilConError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fondo p-6">
        <EmptyState
          titulo="No se pudo cargar tu perfil"
          descripcion="Puede ser un problema de conexión o de la base de datos. Intenta de nuevo."
          accion={
            <div className="flex gap-2">
              <Button onClick={() => void recargarPerfil()}>Reintentar</Button>
              <Button variante="secundario" onClick={() => void cerrarSesion()}>
                Cerrar sesión
              </Button>
            </div>
          }
        />
      </div>
    )
  }

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
