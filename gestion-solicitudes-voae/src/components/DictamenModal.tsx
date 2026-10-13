import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { CLASE_INPUT } from './ui/Campo'
import type { DecisionJefe } from '../types/domain'

const CORRECCIONES_MAXIMAS = 5

interface DictamenModalProps {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: (decision: DecisionJefe, comentario?: string) => Promise<void>
  codigo: string
  correccionesUsadas: number
}

export function DictamenModal({ abierto, onCerrar, onConfirmar, codigo, correccionesUsadas }: DictamenModalProps) {
  const [decision, setDecision] = useState<DecisionJefe>('APROBADO')
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const yaUsoTodas = correccionesUsadas >= CORRECCIONES_MAXIMAS

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
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Dictamen del ticket ${codigo}`}>
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
            onClick={() => !yaUsoTodas && setDecision('CORRECCION')}
            disabled={yaUsoTodas}
            title={yaUsoTodas ? 'Ya se usaron las 5 correcciones; solo puedes aprobar.' : undefined}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
              decision === 'CORRECCION' ? 'border-ambar bg-ambar-bruma text-ambar' : 'border-azul-niebla text-tinta-suave'
            }`}
          >
            Pedir corrección
          </button>
        </div>

        <p className="text-xs text-tinta-suave">
          Correcciones usadas: {correccionesUsadas}/{CORRECCIONES_MAXIMAS}
        </p>

        {decision === 'CORRECCION' && (
          <div>
            <p className="mb-2 text-xs text-coral">
              Se permiten hasta {CORRECCIONES_MAXIMAS} correcciones por ticket. Después de la última, el ticket solo
              podrá aprobarse.
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
