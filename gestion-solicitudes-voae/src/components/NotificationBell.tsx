import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listarNotificaciones, marcarNotificacionVista, suscribirNotificaciones } from '../data/notificaciones'
import { formatRelativo } from '../lib/date'
import { useAuth } from '../auth/useAuth'
import { Link } from 'react-router-dom'

export function NotificationBell() {
  const { perfil } = useAuth()
  const queryClient = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const clavesNotificaciones = ['notificaciones', perfil?.id]

  const { data: notificaciones = [] } = useQuery({
    queryKey: clavesNotificaciones,
    queryFn: () => listarNotificaciones(perfil!.id),
    enabled: Boolean(perfil),
  })

  useEffect(() => {
    if (!perfil) return
    return suscribirNotificaciones(perfil.id, () => {
      void queryClient.invalidateQueries({ queryKey: clavesNotificaciones })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id])

  useEffect(() => {
    function alHacerClicFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', alHacerClicFuera)
    return () => document.removeEventListener('mousedown', alHacerClicFuera)
  }, [])

  const noVistas = notificaciones.filter((n) => !n.visto).length

  async function marcarVista(id: number) {
    await marcarNotificacionVista(id)
    void queryClient.invalidateQueries({ queryKey: clavesNotificaciones })
  }

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative rounded-full p-2 text-tinta-suave transition-colors duration-150 hover:bg-azul-niebla"
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {noVistas > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
            {noVistas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-azul-niebla bg-white p-2 shadow-xl">
          <p className="px-2 py-1 text-sm font-semibold text-azul-noche">Notificaciones</p>
          {notificaciones.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-tinta-suave">Sin notificaciones.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-azul-niebla/60 overflow-y-auto">
              {notificaciones.map((notificacion) => (
                <li key={notificacion.id}>
                  <Link
                    to={notificacion.ticket_id ? `/tickets/${notificacion.ticket_id}` : '#'}
                    onClick={() => {
                      setAbierto(false)
                      if (!notificacion.visto) void marcarVista(notificacion.id)
                    }}
                    className={`block rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-azul-niebla/40 ${
                      notificacion.visto ? 'text-tinta-suave' : 'font-medium text-tinta'
                    }`}
                  >
                    <p>{notificacion.mensaje}</p>
                    <p className="text-xs text-tinta-suave">{formatRelativo(notificacion.fecha)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
