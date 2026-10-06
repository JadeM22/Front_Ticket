import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Link as LinkIcon, Loader2, XCircle } from 'lucide-react'
import { listarTiposSolicitud, type TipoSolicitud } from '../../data/catalogos'
import { crearSolicitud, obtenerFechaLimiteEstimada } from '../../data/formularios'
import { subirAdjuntoArchivo, subirAdjuntoLink, MAXIMO_ADJUNTOS_POR_TICKET } from '../../data/adjuntos'
import { detalleInicial, validarDetalle } from '../../lib/validacionFormularios'
import { esUrlHttp } from '../../lib/archivos'
import { mensajeError } from '../../lib/errors'
import { formatFechaLarga } from '../../lib/date'
import { useAuth } from '../../auth/useAuth'
import { ICONO_POR_FORMULARIO, ETIQUETA_FORMULARIO } from '../../components/formularios/iconosFormulario'
import {
  CamposArte,
  CamposDircom,
  CamposGenerico,
  CamposProtocolo,
  CamposVideo,
} from '../../components/formularios/campos'
import { DetalleFormularioVista } from '../../components/formularios/DetalleFormularioVista'
import { MultiFileDrop } from '../../components/ui/MultiFileDrop'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonLista } from '../../components/ui/Skeleton'
import type {
  DetalleArte,
  DetalleDircom,
  DetalleFormulario,
  DetalleGenerico,
  DetalleProtocolo,
  DetalleVideo,
  FormularioCodigo,
} from '../../types/domain'

interface EnlacePendiente {
  titulo: string
  url: string
}

interface ProgresoAdjunto {
  etiqueta: string
  estado: 'subiendo' | 'listo' | 'error'
}

const ORDEN_FORMULARIOS: FormularioCodigo[] = ['ARTE', 'VIDEO', 'DIRCOM', 'PROTOCOLO', 'GENERICO']

export function NuevaSolicitudPage() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const { data: tipos = [], isLoading } = useQuery({ queryKey: ['catalogos', 'tipos-solicitud'], queryFn: listarTiposSolicitud })

  const [paso, setPaso] = useState(1)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSolicitud | null>(null)
  const [fechaEstimada, setFechaEstimada] = useState<string | null>(null)
  const [cargandoFecha, setCargandoFecha] = useState(false)
  const [detalle, setDetalle] = useState<DetalleFormulario | null>(null)
  const [archivos, setArchivos] = useState<File[]>([])
  const [enlaces, setEnlaces] = useState<EnlacePendiente[]>([])
  const [tituloEnlace, setTituloEnlace] = useState('')
  const [urlEnlace, setUrlEnlace] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState<ProgresoAdjunto[]>([])

  const totalAdjuntos = archivos.length + enlaces.length
  const espacioDisponible = MAXIMO_ADJUNTOS_POR_TICKET - totalAdjuntos

  if (!perfil?.area_id) {
    return (
      <EmptyState
        titulo="Tu cuenta no tiene un área asignada"
        descripcion="Contacta a un administrador para que te asigne un área antes de crear una solicitud."
      />
    )
  }

  async function elegirTipo(tipo: TipoSolicitud) {
    setTipoSeleccionado(tipo)
    setDetalle(detalleInicial(tipo.formulario as FormularioCodigo))
    setPaso(2)
    setFechaEstimada(null)
    setCargandoFecha(true)
    try {
      const fecha = await obtenerFechaLimiteEstimada(tipo.id)
      setFechaEstimada(fecha)
    } catch {
      setFechaEstimada(null)
    } finally {
      setCargandoFecha(false)
    }
  }

  function continuarAPaso3() {
    if (!tipoSeleccionado || !detalle) return
    const error = validarDetalle(tipoSeleccionado.formulario as FormularioCodigo, detalle)
    if (error) {
      toast.error(error)
      return
    }
    setPaso(3)
  }

  function agregarEnlace() {
    if (!tituloEnlace.trim() || !esUrlHttp(urlEnlace)) {
      toast.error('Completa el título y una URL que inicie con http:// o https://.')
      return
    }
    if (espacioDisponible <= 0) {
      toast.error('Llegaste al máximo de 10 adjuntos.')
      return
    }
    setEnlaces([...enlaces, { titulo: tituloEnlace.trim(), url: urlEnlace.trim() }])
    setTituloEnlace('')
    setUrlEnlace('')
  }

  async function enviarSolicitud() {
    if (!tipoSeleccionado || !detalle) return
    setEnviando(true)

    let ticketId: number
    try {
      ticketId = await crearSolicitud(tipoSeleccionado.id, detalle)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo crear la solicitud.'))
      setEnviando(false)
      return
    }

    toast.success(`Solicitud #${ticketId} creada.`)

    const items: ProgresoAdjunto[] = [
      ...archivos.map((a) => ({ etiqueta: a.name, estado: 'subiendo' as const })),
      ...enlaces.map((e) => ({ etiqueta: e.titulo, estado: 'subiendo' as const })),
    ]
    setProgreso(items)

    let huboError = false

    for (let i = 0; i < archivos.length; i++) {
      try {
        await subirAdjuntoArchivo({ ticketId, archivo: archivos[i] })
        setProgreso((prev) => prev.map((p, idx) => (idx === i ? { ...p, estado: 'listo' } : p)))
      } catch {
        huboError = true
        setProgreso((prev) => prev.map((p, idx) => (idx === i ? { ...p, estado: 'error' } : p)))
      }
    }

    for (let i = 0; i < enlaces.length; i++) {
      const indiceGlobal = archivos.length + i
      try {
        await subirAdjuntoLink({ ticketId, titulo: enlaces[i].titulo, url: enlaces[i].url })
        setProgreso((prev) => prev.map((p, idx) => (idx === indiceGlobal ? { ...p, estado: 'listo' } : p)))
      } catch {
        huboError = true
        setProgreso((prev) => prev.map((p, idx) => (idx === indiceGlobal ? { ...p, estado: 'error' } : p)))
      }
    }

    setEnviando(false)

    if (huboError) {
      toast.error('Algunos adjuntos no se pudieron subir. Podrás agregarlos de nuevo desde el detalle del ticket.')
    }

    setTimeout(() => navigate(`/tickets/${ticketId}`), huboError ? 1500 : 300)
  }

  const gruposTipo = ORDEN_FORMULARIOS.map((formulario) => ({
    formulario,
    tipos: tipos.filter((t) => t.estado && t.formulario === formulario),
  })).filter((grupo) => grupo.tipos.length > 0)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Nueva solicitud</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-tinta-suave">
          {['Tipo', 'Formulario', 'Adjuntos', 'Revisar y enviar'].map((etiqueta, indice) => (
            <span
              key={etiqueta}
              className={`rounded-full px-2.5 py-1 ${paso === indice + 1 ? 'bg-azul-institucional text-white' : 'bg-azul-niebla'}`}
            >
              {indice + 1}. {etiqueta}
            </span>
          ))}
        </div>
      </div>

      {paso === 1 &&
        (isLoading ? (
          <SkeletonLista />
        ) : (
          <div className="space-y-6">
            {gruposTipo.map((grupo) => {
              const Icono = ICONO_POR_FORMULARIO[grupo.formulario]
              return (
                <div key={grupo.formulario}>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-tinta-suave">
                    {ETIQUETA_FORMULARIO[grupo.formulario]}
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {grupo.tipos.map((tipo) => (
                      <button
                        key={tipo.id}
                        type="button"
                        onClick={() => elegirTipo(tipo)}
                        className="flex items-start gap-3 rounded-xl border border-azul-niebla bg-white p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-menta hover:shadow-md"
                      >
                        <span className="rounded-full bg-azul-niebla p-2 text-azul-institucional">
                          <Icono size={20} />
                        </span>
                        <span>
                          <p className="font-semibold text-tinta">{tipo.nombre}</p>
                          <p className="text-xs text-tinta-suave">
                            {tipo.dias_estimados} día(s) {tipo.dias_habiles ? 'hábiles' : 'corridos'}
                          </p>
                          {tipo.descripcion && <p className="mt-1 text-xs text-tinta-suave">{tipo.descripcion}</p>}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

      {paso === 2 && tipoSeleccionado && detalle && (
        <Card>
          <h2 className="font-semibold text-azul-noche">{tipoSeleccionado.nombre}</h2>
          <p className="mb-4 text-sm text-tinta-suave">
            {cargandoFecha
              ? 'Calculando fecha estimada…'
              : fechaEstimada
                ? `Fecha estimada de entrega: ${formatFechaLarga(fechaEstimada)} (${tipoSeleccionado.dias_estimados} día(s) ${tipoSeleccionado.dias_habiles ? 'hábiles' : 'corridos'})`
                : null}
          </p>
          <CamposPorFormulario formulario={tipoSeleccionado.formulario as FormularioCodigo} detalle={detalle} onCambiar={setDetalle} />
          <div className="mt-6 flex justify-between">
            <Button variante="fantasma" onClick={() => setPaso(1)}>
              <ArrowLeft size={16} /> Volver
            </Button>
            <Button onClick={continuarAPaso3}>
              Continuar <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {paso === 3 && (
        <Card>
          <h2 className="mb-1 font-semibold text-azul-noche">Adjuntos</h2>
          <p className="mb-4 text-sm text-tinta-suave">
            Adjunta logos, imágenes, textos o referencias que el diseñador necesite. Si son muchas fotos,
            comparte un enlace de Drive. ({totalAdjuntos} / {MAXIMO_ADJUNTOS_POR_TICKET})
          </p>

          <MultiFileDrop archivos={archivos} onCambiar={setArchivos} espacioDisponible={espacioDisponible} />

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-tinta">Agregar un enlace</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className={CLASE_INPUT}
                placeholder="Título (ej. Fotos del evento)"
                value={tituloEnlace}
                onChange={(e) => setTituloEnlace(e.target.value)}
              />
              <input
                className={CLASE_INPUT}
                placeholder="https://drive.google.com/…"
                value={urlEnlace}
                onChange={(e) => setUrlEnlace(e.target.value)}
              />
              <Button variante="secundario" onClick={agregarEnlace} disabled={espacioDisponible <= 0}>
                Agregar
              </Button>
            </div>
            {enlaces.length > 0 && (
              <ul className="space-y-2">
                {enlaces.map((enlace, indice) => (
                  <li key={`${enlace.url}-${indice}`} className="flex items-center justify-between gap-3 rounded-lg border border-azul-niebla p-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <LinkIcon size={14} className="flex-none text-azul-institucional" />
                      <span className="truncate text-sm text-tinta">{enlace.titulo}</span>
                    </div>
                    <button type="button" onClick={() => setEnlaces(enlaces.filter((_, i) => i !== indice))}>
                      <XCircle size={16} className="text-tinta-suave hover:text-coral" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <Button variante="fantasma" onClick={() => setPaso(2)}>
              <ArrowLeft size={16} /> Volver
            </Button>
            <Button onClick={() => setPaso(4)}>
              Continuar <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {paso === 4 && tipoSeleccionado && detalle && (
        <Card>
          <h2 className="mb-4 font-semibold text-azul-noche">Revisa tu solicitud</h2>
          <p className="mb-2 text-sm text-tinta-suave">
            Tipo: <span className="font-medium text-tinta">{tipoSeleccionado.nombre}</span>
          </p>
          <DetalleFormularioVista detalle={detalle} />

          <p className="mt-4 text-sm font-semibold text-tinta">Adjuntos ({totalAdjuntos})</p>
          {totalAdjuntos === 0 ? (
            <p className="text-sm text-tinta-suave">Sin adjuntos.</p>
          ) : (
            <ul className="mt-1 text-sm text-tinta-suave">
              {archivos.map((a) => (
                <li key={a.name}>· {a.name}</li>
              ))}
              {enlaces.map((e) => (
                <li key={e.url}>· {e.titulo} (enlace)</li>
              ))}
            </ul>
          )}

          {progreso.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-lg bg-azul-niebla/30 p-3 text-sm">
              {progreso.map((item) => (
                <li key={item.etiqueta} className="flex items-center gap-2">
                  {item.estado === 'subiendo' && <Loader2 size={14} className="animate-spin text-azul-institucional" />}
                  {item.estado === 'listo' && <CheckCircle2 size={14} className="text-menta-profundo" />}
                  {item.estado === 'error' && <XCircle size={14} className="text-coral" />}
                  {item.etiqueta}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex justify-between">
            <Button variante="fantasma" onClick={() => setPaso(3)} disabled={enviando}>
              <ArrowLeft size={16} /> Volver
            </Button>
            <Button onClick={enviarSolicitud} cargando={enviando}>
              <Check size={16} /> Enviar solicitud
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function CamposPorFormulario({
  formulario,
  detalle,
  onCambiar,
}: {
  formulario: FormularioCodigo
  detalle: DetalleFormulario
  onCambiar: (valor: DetalleFormulario) => void
}) {
  switch (formulario) {
    case 'ARTE':
      return <CamposArte valor={detalle as DetalleArte} onCambiar={onCambiar} />
    case 'VIDEO':
      return <CamposVideo valor={detalle as DetalleVideo} onCambiar={onCambiar} />
    case 'DIRCOM':
      return <CamposDircom valor={detalle as DetalleDircom} onCambiar={onCambiar} />
    case 'PROTOCOLO':
      return <CamposProtocolo valor={detalle as DetalleProtocolo} onCambiar={onCambiar} />
    case 'GENERICO':
      return <CamposGenerico valor={detalle as DetalleGenerico} onCambiar={onCambiar} />
  }
}
