import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { FileDrop } from './ui/FileDrop'
import { VistaPreviaEnlace } from './ui/VistaPreviaEnlace'
import { subirEntregableArchivo, subirEntregableLink } from '../data/entregables'
import { inferirTipoEntregable, LIMITE_BYTES_ENTREGABLE } from '../lib/entregables'
import { normalizarEnlace } from '../lib/enlaces'
import { mensajeError } from '../lib/errors'

interface SubirEntregableModalProps {
  abierto: boolean
  onCerrar: () => void
  onSubido: () => void
  ticketId: number
  disenadorId: number
}

export function SubirEntregableModal({ abierto, onCerrar, onSubido, ticketId, disenadorId }: SubirEntregableModalProps) {
  const [modo, setModo] = useState<'archivo' | 'link'>('archivo')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)

  function limpiar() {
    setArchivo(null)
    setUrl('')
    setDescripcion('')
    setModo('archivo')
  }

  async function manejarEnviar() {
    setEnviando(true)
    try {
      if (modo === 'archivo') {
        if (!archivo) {
          toast.error('Selecciona un archivo.')
          return
        }
        if (archivo.size > LIMITE_BYTES_ENTREGABLE) {
          toast.error('El archivo supera el límite de 50 MB.')
          return
        }
        await subirEntregableArchivo({
          ticketId,
          disenadorId,
          tipoEntregable: inferirTipoEntregable(archivo),
          archivo,
          descripcion,
        })
      } else {
        const enlace = normalizarEnlace(url)
        if (!enlace) {
          toast.error('Escribe un enlace válido, por ejemplo drive.google.com/…')
          return
        }
        await subirEntregableLink({ ticketId, disenadorId, url: enlace, descripcion })
      }

      toast.success('Entregable subido.')
      onSubido()
      limpiar()
      onCerrar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo subir el entregable.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={() => {
        limpiar()
        onCerrar()
      }}
      titulo="Subir entregable"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModo('archivo')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
              modo === 'archivo' ? 'border-azul-institucional bg-azul-niebla text-azul-institucional' : 'border-azul-niebla text-tinta-suave'
            }`}
          >
            Archivo
          </button>
          <button
            type="button"
            onClick={() => setModo('link')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
              modo === 'link' ? 'border-azul-institucional bg-azul-niebla text-azul-institucional' : 'border-azul-niebla text-tinta-suave'
            }`}
          >
            Enlace
          </button>
        </div>

        {modo === 'archivo' ? (
          <FileDrop archivo={archivo} onArchivo={setArchivo} />
        ) : (
          <Campo etiqueta="URL">
            <input
              type="text"
              inputMode="url"
              className={CLASE_INPUT}
              placeholder="drive.google.com/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <VistaPreviaEnlace valor={url} />
          </Campo>
        )}

        <Campo etiqueta="Descripción (opcional)">
          <textarea
            className={CLASE_INPUT}
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Campo>

        <Button className="w-full" cargando={enviando} onClick={manejarEnviar}>
          Subir
        </Button>
      </div>
    </Modal>
  )
}
