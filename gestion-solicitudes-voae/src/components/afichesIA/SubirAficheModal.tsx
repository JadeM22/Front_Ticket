import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { SelectorAfiche } from './SelectorAfiche'
import { AFICHE_VACIO, subirAficheIA, validarArchivoAfiche, type AficheSeleccionado } from '../../data/afichesIA'
import { mensajeError } from '../../lib/errors'

interface SubirAficheModalProps {
  abierto: boolean
  onCerrar: () => void
  onSubido: () => void
  ticketId: number
  /** "Subir afiche" (primer envío que quedó pendiente) o "Reenviar afiche" (en Corrección). */
  titulo: string
}

export function SubirAficheModal({ abierto, onCerrar, onSubido, ticketId, titulo }: SubirAficheModalProps) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo}>
      {abierto && <Formulario ticketId={ticketId} onCerrar={onCerrar} onSubido={onSubido} />}
    </Modal>
  )
}

function Formulario({ ticketId, onCerrar, onSubido }: Pick<SubirAficheModalProps, 'ticketId' | 'onCerrar' | 'onSubido'>) {
  const [afiche, setAfiche] = useState<AficheSeleccionado>(AFICHE_VACIO)
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!afiche.archivo) {
      toast.error('Selecciona el archivo del afiche.')
      return
    }
    const error = validarArchivoAfiche(afiche.archivo)
    if (error) {
      toast.error(error)
      return
    }
    setEnviando(true)
    try {
      await subirAficheIA({ ticketId, archivo: afiche.archivo, comentario: afiche.comentario })
      toast.success('Afiche enviado a revisión.')
      onSubido()
      onCerrar()
    } catch (err) {
      toast.error(await mensajeError(err, 'No se pudo enviar el afiche.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <SelectorAfiche valor={afiche} onCambiar={setAfiche} />
      <div className="flex justify-end gap-2">
        <Button variante="fantasma" onClick={onCerrar} disabled={enviando}>
          Cancelar
        </Button>
        <Button onClick={enviar} cargando={enviando} disabled={!afiche.archivo}>
          Enviar afiche
        </Button>
      </div>
    </div>
  )
}
