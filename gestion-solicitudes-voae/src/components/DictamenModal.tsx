import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { CLASE_INPUT } from './ui/Campo'
import type { DecisionJefe } from '../types/domain'

interface DictamenModalProps {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: (decision: DecisionJefe, comentario?: string) => Promise<void>
  ticketId: number
}

export function DictamenModal({ abierto, onCerrar, onConfirmar, ticketId }: DictamenModalProps) {
  const [decision, setDecision] = useState<DecisionJefe>('APROBADO')
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function manejarConfirmar() {
    if (decision === 'CORRECCION' && !comentario.trim()) return
    setEnviando(true)
    try {
      await onConfirmar(decision, comentario.trim() || undefined)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Dictamen del ticket #${ticketId}`}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDecision('APROBADO')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
              decision === 'APROBADO'
                ? 'border-menta-profundo bg-menta-bruma text-menta-profundo'
                : 'border-azul-niebla text-tinta-suave'
            }`}
          >
            Aprobar
          </button>
          <button
            type="button"
            onClick={() => setDecision('CORRECCION')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
              decision === 'CORRECCION' ? 'border-ambar bg-ambar-bruma text-ambar' : 'border-azul-niebla text-tinta-suave'
            }`}
          >
            Pedir corrección
          </button>
        </div>

        {decision === 'CORRECCION' && (
          <div>
            <p className="mb-2 text-xs text-coral">
              Solo se permite 1 corrección por ticket. Si ya se usó, el ticket solo podrá aprobarse.
            </p>
            <textarea
              className={CLASE_INPUT}
              rows={4}
              required
              placeholder="Explica qué se debe corregir…"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variante={decision === 'APROBADO' ? 'primario' : 'peligro'}
            cargando={enviando}
            disabled={decision === 'CORRECCION' && !comentario.trim()}
            onClick={manejarConfirmar}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
