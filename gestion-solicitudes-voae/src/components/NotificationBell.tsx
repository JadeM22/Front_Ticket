import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listarNotificaciones, marcarNotificacionVista, suscribirNotificaciones } from '../data/notificaciones'
import { CLAVE_CONTEO_SIN_ASIGNAR } from '../hooks/useTickets'
import { formatRelativo } from '../lib/date'
import { useAuth } from '../auth/useAuth'
import { Link, useNavigate } from 'react-router-dom'

export function NotificationBell() {
  const { perfil, tieneRol } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const esAsignador = tieneRol('Asignador')

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
      // Una notificación nueva puede significar que entró o salió un ticket sin asignar.
      void queryClient.invalidateQueries({ queryKey: CLAVE_CONTEO_SIN_ASIGNAR })
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
              {notificaciones.map((notificacion) =>
                notificacion.ticket_id ? (
                  <li key={notificacion.id}>
                    <Link
                      to={`/tickets/${notificacion.ticket_id}`}
                      state={{ desdeNotificacion: true }}
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
                ) : (
                  <li key={notificacion.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!notificacion.visto) void marcarVista(notificacion.id)
                      }}
                      className={`block w-full rounded-lg px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-azul-niebla/40 ${
                        notificacion.visto ? 'text-tinta-suave' : 'font-medium text-tinta'
                      }`}
                    >
                      <p>{notificacion.mensaje}</p>
                      <p className="text-xs text-tinta-suave">{formatRelativo(notificacion.fecha)}</p>
                    </button>
                    {esAsignador && (
                      <button
                        type="button"
                        onClick={() => {
                          setAbierto(false)
                          if (!notificacion.visto) void marcarVista(notificacion.id)
                          navigate('/asignador?tab=sin-asignar')
                        }}
                        className="mb-1 ml-2 text-xs font-medium text-azul-institucional hover:underline"
                      >
                        Ver Sin asignar
                      </button>
                    )}
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
