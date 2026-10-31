import { useState } from 'react'
import { ExternalLink, File as FileIcon } from 'lucide-react'
import { toast } from 'sonner'
import { crearUrlDescargaAdjunto, crearUrlVerAdjunto } from '../data/adjuntos'
import { mensajeError } from '../lib/errors'
import { formatFechaHora } from '../lib/date'
import { descargarDesdeUrl, nombreDescargaAdjunto, tipoVistaPrevia } from '../lib/descargas'
import { useNombresUsuarios } from '../hooks/useNombresUsuarios'
import { BotonesArchivo, VistaPreviaModal, type VistaPrevia } from './VistaPreviaArchivo'
import type { Adjunto } from '../data/adjuntos'

interface ListaAdjuntosProps {
  adjuntos: Adjunto[]
  /** Código del ticket, para nombrar las descargas (`{codigo}_adjunto{n}.{ext}`). */
  codigo: string
}

/** Número de cada archivo (no LINK) por orden de subida, desde 1: `{codigo}_adjunto{n}`. */
function numerosPorAdjunto(adjuntos: Adjunto[]): Map<number, number> {
  const archivos = adjuntos
    .filter((a) => a.tipo !== 'LINK')
    .sort((a, b) => a.fecha_registro.localeCompare(b.fecha_registro) || a.id - b.id)
  return new Map(archivos.map((a, indice) => [a.id, indice + 1]))
}

export function ListaAdjuntos({ adjuntos, codigo }: ListaAdjuntosProps) {
  const [abriendo, setAbriendo] = useState<number | null>(null)
  const [descargando, setDescargando] = useState<number | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<VistaPrevia | null>(null)
  const { nombreDe } = useNombresUsuarios()
  const numeros = numerosPorAdjunto(adjuntos)

  /** Imagen o PDF: vista previa en el modal. Otro archivo: pestaña nueva. Enlace: se abre tal cual. */
  async function abrir(adjunto: Adjunto) {
    if (adjunto.tipo === 'LINK') {
      window.open(adjunto.ruta_o_url, '_blank', 'noopener,noreferrer')
      return
    }
    const tipo = tipoVistaPrevia(adjunto.tipo_mime, adjunto.ruta_o_url)
    // La pestaña se abre antes de esperar la URL: si no, el navegador la bloquea por no venir de un clic.
    const pestana = tipo ? null : window.open('', '_blank')
    setAbriendo(adjunto.id)
    try {
      const url = await crearUrlVerAdjunto(adjunto.ruta_o_url)
      if (tipo) {
        setVistaPrevia({ url, tipo, nombre: adjunto.nombre_archivo })
      } else if (pestana) {
        pestana.opener = null
        pestana.location.href = url
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      pestana?.close()
      toast.error(await mensajeError(error, 'No se pudo abrir el archivo.'))
    } finally {
      setAbriendo(null)
    }
  }

  async function descargar(adjunto: Adjunto) {
    setDescargando(adjunto.id)
    try {
      const nombre = nombreDescargaAdjunto(codigo, numeros.get(adjunto.id) ?? 1, adjunto.ruta_o_url)
      descargarDesdeUrl(await crearUrlDescargaAdjunto(adjunto.ruta_o_url, nombre))
      toast.success('Descarga lista')
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo descargar el archivo.'))
    } finally {
      setDescargando(null)
    }
  }

  if (adjuntos.length === 0) {
    return <p className="text-sm text-tinta-suave">El solicitante no ha agregado adjuntos.</p>
  }

  return (
    <>
      <ul className="space-y-2">
        {adjuntos.map((adjunto) => {
          const esLink = adjunto.tipo === 'LINK'
          const Icono = esLink ? ExternalLink : FileIcon
          return (
            <li
              key={adjunto.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-azul-niebla p-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                <span className="flex-none rounded-full bg-azul-niebla p-2 text-azul-institucional">
                  <Icono size={16} />
                </span>
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium text-tinta" title={adjunto.nombre_archivo}>
                    {adjunto.nombre_archivo}
                  </p>
                  {esLink && (
                    <p className="truncate text-xs text-azul-institucional" title={adjunto.ruta_o_url}>
                      {adjunto.ruta_o_url}
                    </p>
                  )}
                  <p className="text-xs text-tinta-suave">
                    {nombreDe(adjunto.usuario_registro)} · {formatFechaHora(adjunto.fecha_registro)}
                  </p>
                </div>
              </div>
              <BotonesArchivo
                esEnlace={esLink}
                onVer={() => void abrir(adjunto)}
                onDescargar={() => void descargar(adjunto)}
                viendo={abriendo === adjunto.id}
                descargando={descargando === adjunto.id}
              />
            </li>
          )
        })}
      </ul>

      <VistaPreviaModal vista={vistaPrevia} onCerrar={() => setVistaPrevia(null)} />
    </>
  )
}
