import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { NotificationBell } from '../NotificationBell'

export function Topbar({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const { perfil, cerrarSesion } = useAuth()

  return (
    <header className="flex h-16 flex-none items-center justify-between border-b border-azul-niebla bg-white px-4">
      <button
        type="button"
        onClick={onAbrirMenu}
        className="rounded-full p-2 text-azul-noche hover:bg-azul-niebla lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-tinta">{perfil?.nombre}</p>
          <p className="text-xs text-tinta-suave">{perfil?.area_nombre ?? 'Sin área'}</p>
        </div>
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          className="rounded-full p-2 text-tinta-suave transition-colors duration-150 hover:bg-azul-niebla"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
