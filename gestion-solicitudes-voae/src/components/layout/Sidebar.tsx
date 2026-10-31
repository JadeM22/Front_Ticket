import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV_POR_ROL, TITULO_SECCION } from './navegacion'
import { JERARQUIA_ROLES } from '../../types/domain'
import type { Perfil } from '../../types/domain'
import { useConteoSinAsignar, useTicketsEstadoReal } from '../../hooks/useTickets'
import { revisionesPorHacer, confirmacionesPendientes } from '../../lib/bandejaValidador'
import { MarcaITickets } from '../MarcaITickets'

interface SidebarProps {
  perfil: Perfil
  onNavegar?: () => void
  /** Solo aplica en escritorio: en móvil el sidebar siempre es el drawer completo. */
  plegado?: boolean
  onTogglePlegado?: () => void
}

export function Sidebar({ perfil, onNavegar, plegado = false, onTogglePlegado }: SidebarProps) {
  const rolesOrdenados = JERARQUIA_ROLES.filter((rol) => perfil.roles.includes(rol))

  // El número junto a "Mi tablero" es solo la cantidad de tickets sin asignar que se pueden tomar
  // (mismo filtro que la pestaña "Tickets sin asignación"): nada de retrasados ni otros conteos se
  // le suma. El contador de excepcionales pendientes del Asignador vive dentro de su propia página.
  const esDisenador = perfil.roles.includes('Diseñador')
  const { data: conteoSinAsignar } = useConteoSinAsignar(esDisenador)
  const pendientesDisenador = esDisenador ? (conteoSinAsignar ?? 0) : 0

  // Validador: un contador por cada página de su bandeja, con los mismos filtros que la bandeja (misma caché).
  const esValidador = perfil.roles.includes('Validador')
  const { data: tickets = [] } = useTicketsEstadoReal(esValidador)
  const contadores: Record<string, number> = {
    '/disenador': pendientesDisenador,
    '/validador': esValidador ? revisionesPorHacer(tickets).length : 0,
    '/validador/solicitudes': esValidador ? confirmacionesPendientes(tickets).length : 0,
  }

  return (
    <nav
      className={`relative flex h-full flex-none flex-col overflow-y-auto bg-[linear-gradient(180deg,#0b1f3a,#102d52)] py-6 text-white transition-[width] duration-200 ${
        plegado ? 'w-16 px-2' : 'w-64 px-4'
      }`}
      style={{
        backgroundImage:
          'linear-gradient(180deg,#0b1f3a,#102d52), repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 24px)',
      }}
    >
      <div className={`mb-8 flex items-center gap-2 ${plegado ? 'justify-center px-0' : 'justify-between px-2'}`}>
        {!plegado && (
          <div>
            <MarcaITickets className="text-white" />
            <p className="text-xs text-white/60">Gestión de solicitudes de diseño · VOAE</p>
          </div>
        )}
        {onTogglePlegado && (
          <button
            type="button"
            onClick={onTogglePlegado}
            className="rounded-full p-1.5 text-white/60 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            aria-label={plegado ? 'Desplegar menú' : 'Plegar menú'}
            title={plegado ? 'Desplegar menú' : 'Plegar menú'}
          >
            {plegado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>

      {rolesOrdenados.map((rol) => (
        <div key={rol} className="mb-6">
          {!plegado && (
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-white/40">{TITULO_SECCION[rol]}</p>
          )}
          <ul className="space-y-1">
            {NAV_POR_ROL[rol].map((item) => (
              <li key={item.ruta}>
                <NavLink
                  to={item.ruta}
                  end
                  onClick={onNavegar}
                  title={plegado ? item.etiqueta : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      plegado ? 'justify-center' : ''
                    } ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 h-5 w-1 rounded-full bg-menta" />}
                      <item.icono size={16} />
                      {!plegado && item.etiqueta}
                      {(contadores[item.ruta] ?? 0) > 0 && (
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-ambar px-1 text-[10px] font-bold text-azul-noche ${
                            plegado ? 'absolute -right-1 -top-1' : 'ml-auto'
                          }`}
                        >
                          {contadores[item.ruta] > 99 ? '99+' : contadores[item.ruta]}
                        </span>
                      )}
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
