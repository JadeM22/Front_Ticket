import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { useAuth } from '../auth/useAuth'
import { PantallaCarga } from '../components/ui/PantallaCarga'

export function AppLayout() {
  const { perfil } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)

  if (!perfil) return <PantallaCarga />

  return (
    <div className="flex h-screen overflow-hidden bg-fondo">
      <div className="hidden lg:flex">
        <Sidebar perfil={perfil} />
      </div>

      {menuAbierto && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-azul-noche/50" onClick={() => setMenuAbierto(false)} />
          <div className="relative">
            <Sidebar perfil={perfil} onNavegar={() => setMenuAbierto(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
