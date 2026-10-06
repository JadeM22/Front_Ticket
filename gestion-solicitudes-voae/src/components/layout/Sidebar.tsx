import { NavLink } from 'react-router-dom'
import { NAV_POR_ROL } from './navegacion'
import { JERARQUIA_ROLES } from '../../types/domain'
import type { Perfil } from '../../types/domain'

export function Sidebar({ perfil, onNavegar }: { perfil: Perfil; onNavegar?: () => void }) {
  const rolesOrdenados = JERARQUIA_ROLES.filter((rol) => perfil.roles.includes(rol))

  return (
    <nav
      className="relative flex h-full w-64 flex-none flex-col overflow-y-auto bg-[linear-gradient(180deg,#0b1f3a,#102d52)] px-4 py-6 text-white"
      style={{
        backgroundImage:
          'linear-gradient(180deg,#0b1f3a,#102d52), repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 24px)',
      }}
    >
      <div className="mb-8 px-2">
        <p className="font-mono text-xs uppercase tracking-widest text-menta">VOAE</p>
        <p className="text-sm font-semibold text-white/90">Gestión de Solicitudes</p>
      </div>

      {rolesOrdenados.map((rol) => (
        <div key={rol} className="mb-6">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-white/40">{rol}</p>
          <ul className="space-y-1">
            {NAV_POR_ROL[rol].map((item) => (
              <li key={item.ruta}>
                <NavLink
                  to={item.ruta}
                  end
                  onClick={onNavegar}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 h-5 w-1 rounded-full bg-menta" />}
                      <item.icono size={16} />
                      {item.etiqueta}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
