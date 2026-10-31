import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, ExternalLink, FileText, Image as ImageIcon, Video, File as FileIcon } from 'lucide-react'
import { toast } from 'sonner'
import { crearUrlDescarga, crearUrlVer, obtenerArchivoEntregable } from '../data/entregables'
import { mensajeError } from '../lib/errors'
import { formatFechaHora } from '../lib/date'
import { descargarBlob, descargarDesdeUrl, nombreDescarga, tipoVistaPrevia } from '../lib/descargas'
import { Button } from './ui/Button'
import { BotonesArchivo, VistaPreviaModal, type VistaPrevia } from './VistaPreviaArchivo'
import type { Entregable } from '../data/entregables'

const ICONO_POR_TIPO = {
  LINK: ExternalLink,
  PDF: FileText,
  IMAGEN: ImageIcon,
  VIDEO: Video,
  OTRO: FileIcon,
} as const

interface ListaEntregablesProps {
  entregables: Entregable[]
  /** Código del ticket, para nombrar las descargas (`{codigo}_v{version}.{ext}`). */
  codigo: string
}

/** Nombre legible de cada archivo (no LINK), numerado si su versión tiene varios. */
function nombresPorEntregable(entregables: Entregable[], codigo: string): Map<number, string> {
  const nombres = new Map<number, string>()
  const archivosPorVersion = new Map<number, Entregable[]>()
  for (const e of entregables) {
    if (e.tipo_entregable === 'LINK') continue
    archivosPorVersion.set(e.version, [...(archivosPorVersion.get(e.version) ?? []), e])
  }
  for (const [version, archivos] of archivosPorVersion) {
    archivos.forEach((e, indice) => nombres.set(e.id, nombreDescarga(codigo, version, e.url_o_ruta, indice, archivos.length)))
  }
  return nombres
}

export function ListaEntregables({ entregables, codigo }: ListaEntregablesProps) {
  const [abriendo, setAbriendo] = useState<number | null>(null)
  const [descargando, setDescargando] = useState<number | null>(null)
  const [progreso, setProgreso] = useState<string | null>(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [vistaPrevia, setVistaPrevia] = useState<VistaPrevia | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuAbierto) return
    function alHacerClicFuera(evento: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(evento.target as Node)) setMenuAbierto(false)
    }
    document.addEventListener('mousedown', alHacerClicFuera)
    return () => document.removeEventListener('mousedown', alHacerClicFuera)
  }, [menuAbierto])

  const porVersion = entregables.reduce<Record<number, Entregable[]>>((acumulado, entregable) => {
    ;(acumulado[entregable.version] ??= []).push(entregable)
    return acumulado
  }, {})
  const nombres = nombresPorEntregable(entregables, codigo)
  const ultimaVersion = entregables.reduce((maxima, e) => Math.max(maxima, e.version), 0)
  const hayArchivos = entregables.some((e) => e.tipo_entregable !== 'LINK')

  /** Imagen o PDF: vista previa en el modal. Otro archivo: pestaña nueva. Enlace: se abre tal cual. */
  async function abrir(entregable: Entregable) {
    if (entregable.tipo_entregable === 'LINK') {
      window.open(entregable.url_o_ruta, '_blank', 'noopener,noreferrer')
      return
    }
    const tipo =
      entregable.tipo_entregable === 'IMAGEN'
        ? 'imagen'
        : entregable.tipo_entregable === 'PDF'
          ? 'pdf'
          : tipoVistaPrevia(null, entregable.url_o_ruta)
    // La pestaña se abre antes de esperar la URL: si no, el navegador la bloquea por no venir de un clic.
    const pestana = tipo ? null : window.open('', '_blank')
    setAbriendo(entregable.id)
    try {
      const url = await crearUrlVer(entregable.url_o_ruta)
      if (tipo) {
        setVistaPrevia({ url, tipo, nombre: entregable.descripcion || nombres.get(entregable.id) || 'Entregable' })
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

  async function descargarUno(entregable: Entregable) {
    setDescargando(entregable.id)
    try {
      descargarDesdeUrl(await crearUrlDescarga(entregable.url_o_ruta, nombres.get(entregable.id)!))
      toast.success('Descarga lista')
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo descargar el archivo.'))
    } finally {
      setDescargando(null)
    }
  }

  /** Un solo archivo: descarga directa. Varios: ZIP armado en el navegador, con `enlaces.txt` si hay LINKs. */
  async function descargarVarios(soloUltima: boolean) {
    setMenuAbierto(false)
    const elegidos = soloUltima ? entregables.filter((e) => e.version === ultimaVersion) : entregables
    const archivos = elegidos.filter((e) => e.tipo_entregable !== 'LINK')
    const enlaces = elegidos.filter((e) => e.tipo_entregable === 'LINK')
    if (archivos.length === 0) return

    if (archivos.length === 1 && enlaces.length === 0) {
      await descargarUno(archivos[0])
      return
    }

    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const fallidos: string[] = []
    try {
      for (let i = 0; i < archivos.length; i++) {
        setProgreso(`Preparando ${i + 1} de ${archivos.length}…`)
        const nombre = nombres.get(archivos[i].id)!
        try {
          zip.file(nombre, await obtenerArchivoEntregable(archivos[i].url_o_ruta))
        } catch {
          // Si uno falla, se sigue con los demás y se avisa al final.
          fallidos.push(nombre)
        }
      }
      if (fallidos.length === archivos.length) {
        toast.error('No se pudo descargar ningún archivo.')
        return
      }
      if (enlaces.length > 0) {
        zip.file('enlaces.txt', enlaces.map((e) => `v${e.version}: ${e.url_o_ruta}`).join('\r\n'))
      }
      setProgreso('Comprimiendo…')
      descargarBlob(await zip.generateAsync({ type: 'blob' }), `${codigo}_entregables.zip`)
      if (fallidos.length > 0) {
        toast.warning(`Descarga lista, sin ${fallidos.length === 1 ? 'este archivo' : 'estos archivos'}: ${fallidos.join(', ')}`)
      } else {
        toast.success('Descarga lista')
      }
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo preparar la descarga.'))
    } finally {
      setProgreso(null)
    }
  }

  if (entregables.length === 0) {
    return <p className="text-sm text-tinta-suave">Todavía no hay entregables.</p>
  }

  const ocupado = progreso !== null

  return (
    <div className="space-y-4">
      {hayArchivos && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {progreso && (
            <span className="text-xs text-tinta-suave" aria-live="polite">
              {progreso}
            </span>
          )}
          <div className="relative flex" ref={menuRef}>
            <Button
              variante="secundario"
              className="rounded-r-none"
              cargando={ocupado}
              onClick={() => void descargarVarios(false)}
            >
              <Download size={14} /> Descargar todos
            </Button>
            <Button
              variante="secundario"
              className="rounded-l-none border-l border-white px-2"
              disabled={ocupado}
              aria-label="Más opciones de descarga"
              aria-expanded={menuAbierto}
              onClick={() => setMenuAbierto((v) => !v)}
            >
              <ChevronDown size={14} />
            </Button>
            {menuAbierto && (
              <div className="absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-lg border border-azul-niebla bg-white shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-azul-niebla/60"
                  onClick={() => void descargarVarios(false)}
                >
                  Todas las versiones
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-azul-niebla/60"
                  onClick={() => void descargarVarios(true)}
                >
                  Solo la última versión (v{ultimaVersion})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {Object.entries(porVersion).map(([version, items]) => (
        <div key={version}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-suave">Versión {version}</p>
          <ul className="space-y-2">
            {items.map((entregable) => {
              const Icono = ICONO_POR_TIPO[entregable.tipo_entregable as keyof typeof ICONO_POR_TIPO] ?? FileIcon
              const esLink = entregable.tipo_entregable === 'LINK'
              return (
                <li key={entregable.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-azul-niebla p-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex-none rounded-full bg-azul-niebla p-2 text-azul-institucional">
                      <Icono size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-tinta">{entregable.descripcion || entregable.tipo_entregable}</p>
                      <p className="text-xs text-tinta-suave">{formatFechaHora(entregable.fecha_subida)}</p>
                    </div>
                  </div>
                  <BotonesArchivo
                    esEnlace={esLink}
                    onVer={() => void abrir(entregable)}
                    onDescargar={() => void descargarUno(entregable)}
                    viendo={abriendo === entregable.id}
                    descargando={descargando === entregable.id}
                    deshabilitado={ocupado}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <VistaPreviaModal vista={vistaPrevia} onCerrar={() => setVistaPrevia(null)} />
    </div>
  )
}
