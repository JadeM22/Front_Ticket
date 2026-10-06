import { useState } from 'react'
import { ExternalLink, File as FileIcon } from 'lucide-react'
import { toast } from 'sonner'
import { crearUrlFirmadaAdjunto } from '../data/adjuntos'
import { mensajeError } from '../lib/errors'
import { formatFechaHora } from '../lib/date'
import { useNombresUsuarios } from '../hooks/useNombresUsuarios'
import type { Adjunto } from '../data/adjuntos'

export function ListaAdjuntos({ adjuntos }: { adjuntos: Adjunto[] }) {
  const [abriendo, setAbriendo] = useState<number | null>(null)
  const { nombreDe } = useNombresUsuarios()

  async function abrir(adjunto: Adjunto) {
    if (adjunto.tipo === 'LINK') {
      window.open(adjunto.ruta_o_url, '_blank', 'noopener,noreferrer')
      return
    }
    setAbriendo(adjunto.id)
    try {
      const url = await crearUrlFirmadaAdjunto(adjunto.ruta_o_url)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo abrir el archivo.'))
    } finally {
      setAbriendo(null)
    }
  }

  if (adjuntos.length === 0) {
    return <p className="text-sm text-tinta-suave">El solicitante no ha agregado adjuntos.</p>
  }

  return (
    <ul className="space-y-2">
      {adjuntos.map((adjunto) => {
        const Icono = adjunto.tipo === 'LINK' ? ExternalLink : FileIcon
        return (
          <li key={adjunto.id} className="flex items-center justify-between gap-3 rounded-lg border border-azul-niebla p-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="flex-none rounded-full bg-azul-niebla p-2 text-azul-institucional">
                <Icono size={16} />
              </span>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium text-tinta">{adjunto.nombre_archivo}</p>
                <p className="text-xs text-tinta-suave">
                  {nombreDe(adjunto.usuario_registro)} · {formatFechaHora(adjunto.fecha_registro)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => abrir(adjunto)}
              disabled={abriendo === adjunto.id}
              className="flex-none text-sm font-medium text-azul-institucional hover:underline disabled:opacity-50"
            >
              {abriendo === adjunto.id ? 'Abriendo…' : 'Ver'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
