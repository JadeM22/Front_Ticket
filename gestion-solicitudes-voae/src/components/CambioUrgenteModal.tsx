import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Zap } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { FechaEventoPicker } from './ui/FechaEventoPicker'
import { AlertaModificacion } from './AlertaModificacion'
import { pedirCambioUrgente } from '../data/cambiosUrgentes'
import { obtenerCodigoTicket } from '../data/tickets'
import { mensajeError } from '../lib/errors'
import type { TicketEstadoReal } from '../types/domain'

const MAX_MOTIVO = 1000
/** Las excepcionales tienen 2 días hábiles de producción (igual que en el asistente). */
const DIAS_PRODUCCION_EXCEPCIONAL = 2

interface CambioUrgenteModalProps {
  /** Ticket original; `null` cierra el diálogo. */
  ticket: TicketEstadoReal | null
  onCerrar: () => void
}

/**
 * Pide un cambio urgente (Parte 54): la base crea una excepcional nueva ligada al ticket, con la copia
 * de su formulario. La fecha es opcional; sin ella, la base usa la mínima de una excepcional.
 */
export function CambioUrgenteModal({ ticket, onCerrar }: CambioUrgenteModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState('')
  const [enviando, setEnviando] = useState(false)

  function cerrar() {
    setMotivo('')
    setFecha('')
    onCerrar()
  }

  async function confirmar() {
    if (!ticket?.ticket_id || !motivo.trim()) return
    setEnviando(true)
    try {
      const nuevoId = await pedirCambioUrgente(ticket.ticket_id, motivo.trim(), fecha || null)
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'estado-real'] })
      void queryClient.invalidateQueries({ queryKey: ['ticket-detalle', ticket.ticket_id] })
      const codigo = await obtenerCodigoTicket(nuevoId).catch(() => null)
      toast.success(codigo ? `Cambio urgente ${codigo} enviado.` : 'Cambio urgente enviado.')
      cerrar()
      navigate(`/tickets/${nuevoId}`)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo pedir el cambio urgente.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={ticket !== null} onCerrar={cerrar} titulo="Pedir cambio urgente">
      {ticket && (
        <div className="space-y-4">
          <p className="text-sm text-tinta-suave">
            Se creará una solicitud excepcional nueva, ligada a <span className="font-mono font-semibold">{ticket.codigo}</span>.
            El equipo de diseño debe aceptarla y tendrá un plazo corto.
          </p>

          <AlertaModificacion />

          <Campo etiqueta="Instrucción del cambio *">
            <textarea
              className={CLASE_INPUT}
              rows={4}
              maxLength={MAX_MOTIVO}
              placeholder="Qué hay que cambiar y por qué es urgente…"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-tinta-suave">
              {motivo.length} / {MAX_MOTIVO}
            </p>
          </Campo>

          <Campo etiqueta="Fecha (opcional)" ayuda="Si no eliges una, se usa la fecha mínima de una solicitud excepcional.">
            {ticket.tipo_solicitud_id != null && (
              <FechaEventoPicker
                tipoId={ticket.tipo_solicitud_id}
                excepcional
                diasProduccion={DIAS_PRODUCCION_EXCEPCIONAL}
                etiqueta="Fecha"
                conProduccion
                value={fecha}
                onChange={setFecha}
              />
            )}
          </Campo>

          <div className="flex justify-end gap-2">
            <Button variante="fantasma" onClick={cerrar}>
              Cancelar
            </Button>
            <Button cargando={enviando} disabled={!motivo.trim()} onClick={confirmar}>
              <Zap size={14} /> Enviar cambio urgente
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
