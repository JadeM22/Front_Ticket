import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Filter, Search, X } from 'lucide-react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { useAuth } from '../../auth/useAuth'
import { normalizar, soloCodigo } from '../../lib/buscar'
import { etiquetaEstado } from '../../lib/estados'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { TicketBoleto } from '../../components/tickets/TicketBoleto'
import { Button } from '../../components/ui/Button'
import { CLASE_INPUT } from '../../components/ui/Campo'

const CLASE_SELECT_FILTRO = `${CLASE_INPUT} w-auto appearance-none pl-9 pr-8 shadow-sm transition-shadow duration-150 hover:shadow-md`
const RETARDO_BUSQUEDA_MS = 250

export function EmpleadoSolicitudesPage() {
  const { data: todos, isLoading } = useTicketsEstadoReal()
  const { perfil } = useAuth()
  const [params, setParams] = useSearchParams()
  // "Mis solicitudes" = las que registró este usuario. RLS deja ver más tickets a quien además es
  // Analista, Diseñador, Jefe o Administrador, así que aquí sí se filtra por autor.
  const tickets = useMemo(() => (todos ?? []).filter((t) => t.usuario_registro === perfil?.id), [todos, perfil?.id])
  const [estado, setEstado] = useState('')
  const [tipo, setTipo] = useState('')
  const [texto, setTexto] = useState(params.get('q') ?? '')
  const [busqueda, setBusqueda] = useState(params.get('q') ?? '')

  // Espera a que el usuario deje de escribir antes de filtrar y de guardar la búsqueda en la URL.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusqueda(texto)
      const siguiente = new URLSearchParams(params)
      if (texto.trim()) siguiente.set('q', texto)
      else siguiente.delete('q')
      setParams(siguiente, { replace: true })
    }, RETARDO_BUSQUEDA_MS)
    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto])

  // El filtro usa las etiquetas que ve el solicitante: "En proceso" incluye En proceso y Corrección, y
  // "Esperando aprobación" es Finalizado.
  const etiquetaDe = (t: { estado_real: string | null; flujo: string | null }) => etiquetaEstado(t.estado_real, 'solicitante', t.flujo)
  const estados = useMemo(
    () => Array.from(new Set(tickets.map((t) => etiquetaEstado(t.estado_real, 'solicitante', t.flujo)).filter(Boolean))),
    [tickets],
  )
  const tipos = useMemo(() => Array.from(new Set(tickets.map((t) => t.tipo_solicitud).filter(Boolean))), [tickets])

  const filtradosPorEstadoYTipo = tickets.filter(
    (t) => (!estado || etiquetaDe(t) === estado) && (!tipo || t.tipo_solicitud === tipo),
  )

  const filtrados = useMemo(() => {
    const q = busqueda.trim()
    if (!q) return filtradosPorEstadoYTipo
    const qCodigo = soloCodigo(q)
    const qTexto = normalizar(q)
    return filtradosPorEstadoYTipo.filter((t) => {
      if (t.codigo && soloCodigo(t.codigo).includes(qCodigo)) return true
      return [t.tipo_solicitud, t.solicitante, t.area].some((v) => v && normalizar(v).includes(qTexto))
    })
  }, [filtradosPorEstadoYTipo, busqueda])

  function limpiarBusqueda() {
    setTexto('')
    setBusqueda('')
    const siguiente = new URLSearchParams(params)
    siguiente.delete('q')
    setParams(siguiente, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Mis solicitudes</h1>
        <p className="text-sm text-tinta-suave">Filtra por estado o tipo de solicitud.</p>
      </div>

      <label className="relative block w-full sm:max-w-sm">
        <span className="sr-only">Buscar</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-suave" />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por código, tipo, solicitante o área…"
          className={`${CLASE_INPUT} pl-9 shadow-sm transition-shadow duration-150 hover:shadow-md focus:shadow-md`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
          <select className={CLASE_SELECT_FILTRO} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {estados.map((e) => (
              <option key={e} value={e!}>
                {e}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
        </div>
        <div className="relative">
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
          <select className={CLASE_SELECT_FILTRO} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t!}>
                {t}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
        </div>
        <span className="text-sm text-tinta-suave">
          {filtrados.length} de {tickets.length} solicitudes
        </span>
      </div>

      {isLoading ? (
        <SkeletonLista filas={4} />
      ) : filtrados.length === 0 ? (
        busqueda.trim() ? (
          <EmptyState
            titulo={`No se encontraron solicitudes para «${busqueda.trim()}»`}
            accion={
              <Button variante="secundario" onClick={limpiarBusqueda}>
                <X size={14} /> Limpiar búsqueda
              </Button>
            }
          />
        ) : (
          <EmptyState titulo="No hay solicitudes con esos filtros" />
        )
      ) : (
        <div className="space-y-3">
          {filtrados.map((ticket) => (
            <TicketBoleto key={ticket.ticket_id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  )
}
