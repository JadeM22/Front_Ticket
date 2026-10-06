import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { FileDrop } from './ui/FileDrop'
import { subirAdjuntoArchivo, subirAdjuntoLink, LIMITE_BYTES_ADJUNTO } from '../data/adjuntos'
import { esUrlHttp } from '../lib/archivos'
import { mensajeError } from '../lib/errors'

interface AgregarAdjuntoModalProps {
  abierto: boolean
  onCerrar: () => void
  onAgregado: () => void
  ticketId: number
}

export function AgregarAdjuntoModal({ abierto, onCerrar, onAgregado, ticketId }: AgregarAdjuntoModalProps) {
  const [modo, setModo] = useState<'archivo' | 'link'>('archivo')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [url, setUrl] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)

  function limpiar() {
    setArchivo(null)
    setTitulo('')
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
        if (archivo.size > LIMITE_BYTES_ADJUNTO) {
          toast.error('El archivo supera el límite de 50 MB.')
          return
        }
        await subirAdjuntoArchivo({ ticketId, archivo, descripcion })
      } else {
        if (!titulo.trim()) {
          toast.error('Escribe un título para el enlace.')
          return
        }
        if (!esUrlHttp(url)) {
          toast.error('El enlace debe iniciar con http:// o https://.')
          return
        }
        await subirAdjuntoLink({ ticketId, titulo: titulo.trim(), url, descripcion })
      }

      toast.success('Adjunto agregado.')
      onAgregado()
      limpiar()
      onCerrar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo agregar el adjunto.'))
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
      titulo="Agregar adjunto"
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
          <>
            <Campo etiqueta="Título">
              <input className={CLASE_INPUT} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </Campo>
            <Campo etiqueta="URL">
              <input
                type="url"
                className={CLASE_INPUT}
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Campo>
          </>
        )}

        <Campo etiqueta="Descripción (opcional)">
          <textarea className={CLASE_INPUT} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>

        <Button className="w-full" cargando={enviando} onClick={manejarEnviar}>
          Agregar
        </Button>
      </div>
    </Modal>
  )
}
