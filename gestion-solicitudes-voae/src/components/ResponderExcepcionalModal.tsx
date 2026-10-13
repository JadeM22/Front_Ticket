import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { responderExcepcional } from '../data/tickets'
import { mensajeError } from '../lib/errors'
import { useAuth } from '../auth/useAuth'
import type { DisenadorAsignable } from '../data/usuarios'
import type { TicketEstadoReal } from '../types/domain'

interface ResponderExcepcionalModalProps {
  ticket: TicketEstadoReal | null
  modo: 'aceptar' | 'rechazar' | null
  disenadores: DisenadorAsignable[]
  onCerrar: () => void
  onRespondido: () => void
}

/** Solo el Asignador acepta o rechaza una solicitud excepcional pendiente (`fnSolicitudExcepcionalResponderEscalar`). */
export function ResponderExcepcionalModal({ ticket, modo, disenadores, onCerrar, onRespondido }: ResponderExcepcionalModalProps) {
  const { perfil } = useAuth()
  const [disenadorId, setDisenadorId] = useState<number | 'yo'>('yo')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  function cerrarYLimpiar() {
    setDisenadorId('yo')
    setMotivo('')
    onCerrar()
  }

  async function manejarConfirmar() {
    if (!ticket?.ticket_id) return
    if (modo === 'rechazar' && !motivo.trim()) {
      toast.error('Indica el motivo del rechazo.')
      return
    }
    setEnviando(true)
    try {
      if (modo === 'aceptar') {
        await responderExcepcional(ticket.ticket_id, true, {
          disenadorId: disenadorId === 'yo' ? undefined : disenadorId,
        })
        toast.success(`Solicitud excepcional ${ticket.codigo} aceptada.`)
      } else {
        await responderExcepcional(ticket.ticket_id, false, { motivo: motivo.trim() })
        toast.success(`Solicitud excepcional ${ticket.codigo} rechazada.`)
      }
      onRespondido()
      cerrarYLimpiar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo responder la solicitud excepcional.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      abierto={ticket !== null && modo !== null}
      onCerrar={cerrarYLimpiar}
      titulo={modo === 'aceptar' ? `Aceptar solicitud excepcional ${ticket?.codigo ?? ''}` : `Rechazar solicitud excepcional ${ticket?.codigo ?? ''}`}
    >
      {modo === 'aceptar' ? (
        <div className="space-y-4">
          <Campo etiqueta="Asignar a">
            <select
              className={CLASE_INPUT}
              value={disenadorId}
              onChange={(e) => setDisenadorId(e.target.value === 'yo' ? 'yo' : Number(e.target.value))}
            >
              <option value="yo">Yo ({perfil?.nombre})</option>
              {disenadores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Button className="w-full" cargando={enviando} onClick={manejarConfirmar}>
            Aceptar y asignar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Campo etiqueta="Motivo del rechazo">
            <textarea
              className={CLASE_INPUT}
              rows={3}
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
          <Button variante="peligro" className="w-full" cargando={enviando} onClick={manejarConfirmar}>
            Rechazar solicitud
          </Button>
        </div>
      )}
    </Modal>
  )
}
