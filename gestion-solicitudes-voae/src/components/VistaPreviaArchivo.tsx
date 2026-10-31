import { Download, ExternalLink, Eye } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

export interface VistaPrevia {
  /** URL firmada de 60 s, sin `download` (la descarga es otro botón). */
  url: string
  nombre: string
  tipo: 'imagen' | 'pdf'
}

/** Vista previa de una imagen o un PDF de Storage, con su botón para cerrar. `null` lo cierra. */
export function VistaPreviaModal({ vista, onCerrar }: { vista: VistaPrevia | null; onCerrar: () => void }) {
  return (
    <Modal abierto={vista !== null} onCerrar={onCerrar} titulo={vista?.nombre ?? ''} ancho="amplio">
      {vista && (
        <div className="space-y-4">
          {vista.tipo === 'imagen' ? (
            <img src={vista.url} alt={vista.nombre} className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain" />
          ) : (
            <iframe src={vista.url} title={vista.nombre} className="h-[70vh] w-full rounded-lg border border-azul-niebla" />
          )}
          <div className="flex justify-end">
            <Button variante="secundario" onClick={onCerrar}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const CLASE_BOTON = 'px-2.5 py-1 text-xs'

/**
 * "Ver" y "Descargar" de un archivo, como dos botones independientes. Un enlace solo tiene "Ver" (lo
 * abre); la descarga no aplica.
 */
export function BotonesArchivo({
  esEnlace,
  onVer,
  onDescargar,
  viendo,
  descargando,
  deshabilitado = false,
}: {
  esEnlace: boolean
  onVer: () => void
  onDescargar: () => void
  viendo: boolean
  descargando: boolean
  deshabilitado?: boolean
}) {
  return (
    <div className="flex flex-none flex-wrap items-center justify-end gap-2">
      <Button variante="secundario" className={CLASE_BOTON} disabled={viendo} onClick={onVer}>
        {esEnlace ? <ExternalLink size={14} /> : <Eye size={14} />}
        {viendo ? 'Abriendo…' : 'Ver'}
      </Button>
      {!esEnlace && (
        <Button
          variante="secundario"
          className={CLASE_BOTON}
          disabled={descargando || deshabilitado}
          onClick={onDescargar}
        >
          <Download size={14} />
          {descargando ? 'Descargando…' : 'Descargar'}
        </Button>
      )}
    </div>
  )
}
