import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react'
import { crearUrlFirmadaAfiche, type EnvioIA, type RevisionIA } from '../../data/afichesIA'
import { mensajeError } from '../../lib/errors'
import { formatFechaHora } from '../../lib/date'
import { Skeleton } from '../ui/Skeleton'

/** Las URLs firmadas duran 1 h; se reusan 50 min para no pedir una nueva en cada render o refetch. */
const VIGENCIA_URL_MS = 50 * 60 * 1000

/** Vista grande del afiche: la imagen en línea, o un enlace si es PDF. */
export function VistaAfiche({ envio }: { envio: EnvioIA }) {
  const esImagen = (envio.tipo_mime ?? '').startsWith('image/')
  const { data: url, isLoading, isError } = useQuery({
    queryKey: ['afiche-ia', envio.ruta_archivo],
    queryFn: () => crearUrlFirmadaAfiche(envio.ruta_archivo),
    staleTime: VIGENCIA_URL_MS,
    gcTime: VIGENCIA_URL_MS,
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (isError || !url) return <p className="text-sm text-coral">No se pudo cargar el afiche.</p>

  if (!esImagen) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg border border-azul-niebla p-4 text-sm font-medium text-azul-institucional hover:bg-azul-niebla/30"
      >
        <FileText size={18} /> Abrir {envio.nombre_archivo}
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir en tamaño completo">
      <img
        src={url}
        alt={`Afiche, intento ${envio.intento}`}
        className="max-h-[480px] w-full rounded-lg border border-azul-niebla bg-azul-niebla/20 object-contain"
      />
    </a>
  )
}

/** Miniatura 4:3 para las tarjetas de la bandeja; un PDF se muestra como ícono de documento. */
export function MiniaturaAfiche({ envio }: { envio: EnvioIA }) {
  const esImagen = (envio.tipo_mime ?? '').startsWith('image/')
  const { data: url, isLoading } = useQuery({
    queryKey: ['afiche-ia', envio.ruta_archivo],
    queryFn: () => crearUrlFirmadaAfiche(envio.ruta_archivo),
    staleTime: VIGENCIA_URL_MS,
    gcTime: VIGENCIA_URL_MS,
    enabled: esImagen,
  })

  if (esImagen && isLoading) return <Skeleton className="aspect-[4/3] w-full" />

  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-azul-niebla bg-azul-niebla/20">
      {esImagen && url ? (
        <img src={url} alt={`Afiche, intento ${envio.intento}`} className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-xs text-tinta-suave">
          <FileText size={28} />
          {esImagen ? 'Vista previa no disponible' : 'PDF'}
        </span>
      )}
    </div>
  )
}

interface HistorialEnviosIAProps {
  envios: EnvioIA[]
  revisiones: RevisionIA[]
}

/** Cada envío (intento, archivo, fecha) con su revisión, del más reciente al más antiguo. */
export function HistorialEnviosIA({ envios, revisiones }: HistorialEnviosIAProps) {
  const [abriendo, setAbriendo] = useState<number | null>(null)

  async function abrir(envio: EnvioIA) {
    setAbriendo(envio.id)
    try {
      window.open(await crearUrlFirmadaAfiche(envio.ruta_archivo), '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo abrir el afiche.'))
    } finally {
      setAbriendo(null)
    }
  }

  if (envios.length === 0) return <p className="text-sm text-tinta-suave">Todavía no se ha enviado ningún afiche.</p>

  const revisionPorEnvio = new Map(revisiones.map((r) => [r.envio_id, r]))
  const ordenados = [...envios].sort((a, b) => b.intento - a.intento)

  return (
    <ul className="space-y-3">
      {ordenados.map((envio) => {
        const revision = revisionPorEnvio.get(envio.id)
        return (
          <li key={envio.id} className="rounded-lg border border-azul-niebla p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-tinta">Intento {envio.intento}</p>
                <p className="truncate text-xs text-tinta-suave" title={envio.nombre_archivo}>
                  {envio.nombre_archivo} · {formatFechaHora(envio.fecha_registro)}
                </p>
                {envio.comentario && <p className="mt-1 text-sm text-tinta-suave">“{envio.comentario}”</p>}
              </div>
              <button
                type="button"
                onClick={() => abrir(envio)}
                disabled={abriendo === envio.id}
                className="flex-none text-sm font-medium text-azul-institucional hover:underline disabled:opacity-50"
              >
                {abriendo === envio.id ? 'Abriendo…' : 'Ver'}
              </button>
            </div>

            <div className="mt-2 border-t border-azul-niebla/60 pt-2 text-sm">
              {revision ? (
                <>
                  <p
                    className={`flex items-center gap-1.5 font-medium ${
                      revision.decision === 'APROBADO' ? 'text-menta-profundo' : 'text-coral'
                    }`}
                  >
                    {revision.decision === 'APROBADO' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {revision.decision === 'APROBADO' ? 'Aprobado' : 'Rechazado'} · {formatFechaHora(revision.fecha_revision)}
                  </p>
                  {revision.comentario && <p className="mt-1 whitespace-pre-line text-tinta-suave">{revision.comentario}</p>}
                </>
              ) : (
                <p className="flex items-center gap-1.5 text-tinta-suave">
                  <Clock size={14} /> Pendiente de revisión
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
