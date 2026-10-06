import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo p-6">
      <EmptyState
        icono={Compass}
        titulo="Página no encontrada"
        descripcion="La página que buscas no existe o fue movida."
        accion={
          <Link to="/">
            <Button>Ir al inicio</Button>
          </Link>
        }
      />
    </div>
  )
}
