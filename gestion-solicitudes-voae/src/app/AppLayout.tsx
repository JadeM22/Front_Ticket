import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { useAuth } from '../auth/useAuth'
import { PantallaCarga } from '../components/ui/PantallaCarga'

const CLAVE_SIDEBAR_PLEGADO = 'voae.sidebar.plegado'

function leerPreferenciaPlegado(): boolean {
  try {
    return localStorage.getItem(CLAVE_SIDEBAR_PLEGADO) === '1'
  } catch {
    return false
  }
}

export function AppLayout() {
  const { perfil } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [plegado, setPlegado] = useState(leerPreferenciaPlegado)

  if (!perfil) return <PantallaCarga />

  function alternarPlegado() {
    setPlegado((prev) => {
      const siguiente = !prev
      try {
        localStorage.setItem(CLAVE_SIDEBAR_PLEGADO, siguiente ? '1' : '0')
      } catch {
        // Sin localStorage (modo privado estricto) el plegado solo dura esta sesión de pestaña.
      }
      return siguiente
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-fondo">
      <div className="hidden lg:flex">
        <Sidebar perfil={perfil} plegado={plegado} onTogglePlegado={alternarPlegado} />
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
