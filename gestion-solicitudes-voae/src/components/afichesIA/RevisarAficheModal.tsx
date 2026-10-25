import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { CLASE_INPUT } from '../ui/Campo'
import { INTENTOS_MAXIMOS_IA } from '../../data/afichesIA'
import type { DecisionIA } from '../../types/domain'

interface RevisarAficheModalProps {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: (decision: DecisionIA, comentario: string) => Promise<void>
  titulo: string
  /**
   * Intento del envío que se revisa (1 a 5). Sin intento es la decisión única de una solicitud de
   * validación: no hay reenvíos, así que rechazar es definitivo.
   */
  intento?: number
}

export function RevisarAficheModal({ abierto, onCerrar, onConfirmar, titulo, intento }: RevisarAficheModalProps) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo}>
      {abierto && <Formulario onCerrar={onCerrar} onConfirmar={onConfirmar} intento={intento} />}
    </Modal>
  )
}

function Formulario({ onCerrar, onConfirmar, intento }: Pick<RevisarAficheModalProps, 'onCerrar' | 'onConfirmar' | 'intento'>) {
  const [decision, setDecision] = useState<DecisionIA>('APROBADO')
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const esDefinitivo = intento === undefined || intento >= INTENTOS_MAXIMOS_IA
  const faltaComentario = decision === 'RECHAZADO' && !comentario.trim()

  async function confirmar() {
    if (faltaComentario) return
    setEnviando(true)
    try {
      await onConfirmar(decision, comentario)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDecision('APROBADO')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
            decision === 'APROBADO' ? 'border-menta-profundo bg-menta-bruma text-menta-profundo' : 'border-azul-niebla text-tinta-suave'
          }`}
        >
          Aprobar
        </button>
        <button
          type="button"
          onClick={() => setDecision('RECHAZADO')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
            decision === 'RECHAZADO' ? 'border-coral bg-coral-bruma text-coral' : 'border-azul-niebla text-tinta-suave'
          }`}
        >
          Rechazar
        </button>
      </div>

      {intento !== undefined && (
        <p className="text-xs text-tinta-suave">
          Intento {intento} de {INTENTOS_MAXIMOS_IA}.
        </p>
      )}

      {decision === 'RECHAZADO' && (
        <p className={`text-xs ${esDefinitivo ? 'font-semibold text-coral' : 'text-ambar'}`}>
          {intento === undefined
            ? 'La decisión es definitiva: la solicitud quedará rechazada.'
            : esDefinitivo
              ? 'Es el último intento: si lo rechazas, la solicitud queda rechazada definitivamente.'
              : 'El solicitante podrá corregir y reenviar el afiche.'}
        </p>
      )}

      <textarea
        className={CLASE_INPUT}
        rows={4}
        placeholder={
          decision === 'RECHAZADO'
            ? intento === undefined
              ? 'Explica el motivo del rechazo (obligatorio)…'
              : 'Explica qué debe corregir (obligatorio)…'
            : 'Comentario (opcional)'
        }
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
      />

      <div className="flex justify-end gap-2">
        <Button variante="fantasma" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          variante={decision === 'APROBADO' ? 'primario' : 'peligro'}
          cargando={enviando}
          disabled={faltaComentario}
          onClick={confirmar}
        >
          {decision === 'APROBADO' ? 'Aprobar' : 'Rechazar'}
        </Button>
      </div>
    </div>
  )
}
