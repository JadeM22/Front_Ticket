import { AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface AvisoEnvioModalProps {
  abierto: boolean
  aviso: string
  onVolver: () => void
  onAceptar: () => void
  enviando?: boolean
}

/**
 * Confirmación antes de enviar una solicitud cuyo tipo trae `aviso` (p. ej. "Grabación y edición de
 * videos…"): se pide cada vez, nunca se envía al tocar "Enviar solicitud" sin pasar por aquí.
 */
export function AvisoEnvioModal({ abierto, aviso, onVolver, onAceptar, enviando = false }: AvisoEnvioModalProps) {
  // Esc lo maneja el Modal compartido (vuelve al formulario). El foco inicial va con `autoFocus` en el
  // botón principal.
  return (
    <Modal abierto={abierto} onCerrar={onVolver} titulo="Antes de enviar">
      <div className="flex gap-2 rounded-lg bg-ambar-bruma p-3 text-sm text-ambar">
        <AlertTriangle size={18} className="mt-0.5 flex-none" />
        <p className="whitespace-pre-line font-medium">{aviso}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variante="secundario" onClick={onVolver} disabled={enviando}>
          Volver
        </Button>
        <Button autoFocus cargando={enviando} onClick={onAceptar}>
          Acepto, enviar solicitud
        </Button>
      </div>
    </Modal>
  )
}
