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
  disenadores: DisenadorAsignable[]
  onCerrar: () => void
  onRespondido: () => void
}

/** Solo el Asignador acepta o rechaza una solicitud excepcional pendiente (`fnSolicitudExcepcionalResponderEscalar`). */
export function ResponderExcepcionalModal({ ticket, disenadores, onCerrar, onRespondido }: ResponderExcepcionalModalProps) {
  const { perfil } = useAuth()
  const [modo, setModo] = useState<'aceptar' | 'rechazar'>('aceptar')
  const [disenadorId, setDisenadorId] = useState<number | 'yo'>('yo')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  function cerrarYLimpiar() {
    setModo('aceptar')
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
    <Modal abierto={ticket !== null} onCerrar={cerrarYLimpiar} titulo={`Dictaminar solicitud excepcional ${ticket?.codigo ?? ''}`}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModo('aceptar')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
              modo === 'aceptar' ? 'border-menta-profundo bg-menta-bruma text-menta-profundo' : 'border-azul-niebla text-tinta-suave'
            }`}
          >
            Aceptar
          </button>
          <button
            type="button"
            onClick={() => setModo('rechazar')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
              modo === 'rechazar' ? 'border-coral bg-coral-bruma text-coral' : 'border-azul-niebla text-tinta-suave'
            }`}
          >
            Rechazar
          </button>
        </div>

        {modo === 'aceptar' ? (
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
        ) : (
          <Campo etiqueta="Motivo del rechazo">
            <textarea
              className={CLASE_INPUT}
              rows={3}
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
        )}

        <Button
          variante={modo === 'aceptar' ? 'primario' : 'peligro'}
          className="w-full"
          cargando={enviando}
          disabled={modo === 'rechazar' && !motivo.trim()}
          onClick={manejarConfirmar}
        >
          {modo === 'aceptar' ? 'Aceptar y asignar' : 'Rechazar solicitud'}
        </Button>
      </div>
    </Modal>
  )
}
