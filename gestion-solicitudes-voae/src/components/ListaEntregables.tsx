import { useState } from 'react'
import { ExternalLink, FileText, Image as ImageIcon, Video, File as FileIcon } from 'lucide-react'
import { toast } from 'sonner'
import { crearUrlFirmada } from '../data/entregables'
import { mensajeError } from '../lib/errors'
import { formatFechaHora } from '../lib/date'
import type { Entregable } from '../data/entregables'

const ICONO_POR_TIPO = {
  LINK: ExternalLink,
  PDF: FileText,
  IMAGEN: ImageIcon,
  VIDEO: Video,
  OTRO: FileIcon,
} as const

export function ListaEntregables({ entregables }: { entregables: Entregable[] }) {
  const [abriendo, setAbriendo] = useState<number | null>(null)

  const porVersion = entregables.reduce<Record<number, Entregable[]>>((acumulado, entregable) => {
    ;(acumulado[entregable.version] ??= []).push(entregable)
    return acumulado
  }, {})

  async function abrir(entregable: Entregable) {
    if (entregable.tipo_entregable === 'LINK') {
      window.open(entregable.url_o_ruta, '_blank', 'noopener,noreferrer')
      return
    }
    setAbriendo(entregable.id)
    try {
      const url = await crearUrlFirmada(entregable.url_o_ruta)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo abrir el archivo.'))
    } finally {
      setAbriendo(null)
    }
  }

  if (entregables.length === 0) {
    return <p className="text-sm text-tinta-suave">Todavía no hay entregables.</p>
  }

  return (
    <div className="space-y-4">
      {Object.entries(porVersion).map(([version, items]) => (
        <div key={version}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-suave">Versión {version}</p>
          <ul className="space-y-2">
            {items.map((entregable) => {
              const Icono = ICONO_POR_TIPO[entregable.tipo_entregable as keyof typeof ICONO_POR_TIPO] ?? FileIcon
              return (
                <li key={entregable.id} className="flex items-center justify-between gap-3 rounded-lg border border-azul-niebla p-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-azul-niebla p-2 text-azul-institucional">
                      <Icono size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-tinta">{entregable.descripcion || entregable.tipo_entregable}</p>
                      <p className="text-xs text-tinta-suave">{formatFechaHora(entregable.fecha_subida)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrir(entregable)}
                    disabled={abriendo === entregable.id}
                    className="text-sm font-medium text-azul-institucional hover:underline disabled:opacity-50"
                  >
                    {abriendo === entregable.id ? 'Abriendo…' : 'Ver'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
