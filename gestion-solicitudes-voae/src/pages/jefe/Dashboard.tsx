import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { crearDictamen } from '../../data/dictamenes'
import { mensajeError } from '../../lib/errors'
import { formatFecha } from '../../lib/date'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { EstadoChip } from '../../components/EstadoChip'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { DictamenModal } from '../../components/DictamenModal'
import type { DecisionJefe, TicketEstadoReal } from '../../types/domain'

export function JefeDashboard() {
  const { data: tickets = [], isLoading } = useTicketsEstadoReal()
  const queryClient = useQueryClient()
  const [ticketDictamen, setTicketDictamen] = useState<TicketEstadoReal | null>(null)

  const porDictaminar = tickets.filter((t) => t.estado_real === 'Finalizado')
  const historial = tickets.filter((t) => t.estado_real !== 'Finalizado')

  async function manejarConfirmar(decision: DecisionJefe, comentario?: string) {
    if (!ticketDictamen) return
    try {
      await crearDictamen(ticketDictamen.ticket_id!, decision, comentario)
      toast.success(decision === 'APROBADO' ? 'Ticket aprobado.' : 'Se solicitó corrección.')
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
      setTicketDictamen(null)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo registrar el dictamen.'))
    }
  }

  if (isLoading) return <SkeletonLista filas={4} />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Por dictaminar</h1>
        <p className="text-sm text-tinta-suave">Tienes 24 horas desde la entrega para aprobar o pedir corrección.</p>
      </div>

      {porDictaminar.length === 0 ? (
        <EmptyState titulo="No hay tickets esperando dictamen" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {porDictaminar.map((ticket) => (
            <Card key={ticket.ticket_id} className="flex items-center gap-4">
              <ProgressRing horasRestantes={ticket.horas_restantes_dictamen ?? 0} />
              <div className="flex-1">
                <Link to={`/tickets/${ticket.ticket_id}`} className="font-semibold text-azul-noche hover:underline">
                  #{ticket.ticket_id} · {ticket.tipo_solicitud}
                </Link>
                <p className="text-xs text-tinta-suave">{ticket.disenador ?? 'Sin diseñador'}</p>
                <Button variante="secundario" className="mt-2" onClick={() => setTicketDictamen(ticket)}>
                  Dictaminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-suave">Historial del área</h2>
        {historial.length === 0 ? (
          <EmptyState titulo="Todavía no hay historial" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-azul-niebla bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
                <tr>
                  <th className="px-4 py-2">Ticket</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Fecha límite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-azul-niebla/60">
                {historial.map((ticket) => (
                  <tr key={ticket.ticket_id}>
                    <td className="px-4 py-2">
                      <Link to={`/tickets/${ticket.ticket_id}`} className="font-mono text-azul-institucional hover:underline">
                        #{ticket.ticket_id}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{ticket.tipo_solicitud}</td>
                    <td className="px-4 py-2">
                      <EstadoChip estado={ticket.estado_real ?? ''} />
                    </td>
                    <td className="px-4 py-2">{formatFecha(ticket.fecha_limite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ticketDictamen && (
        <DictamenModal
          abierto
          ticketId={ticketDictamen.ticket_id!}
          onCerrar={() => setTicketDictamen(null)}
          onConfirmar={manejarConfirmar}
        />
      )}
    </div>
  )
}
