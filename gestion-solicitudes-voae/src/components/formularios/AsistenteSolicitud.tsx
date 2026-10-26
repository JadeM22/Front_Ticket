import { useCallback, useState } from 'react'
import { useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clapperboard,
  Info,
  Landmark,
  LayoutGrid,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Palette,
  Search,
  XCircle,
} from 'lucide-react'
import { listarCampus, listarTiposSolicitud, type TipoSolicitud } from '../../data/catalogos'
import { listarCamposPorTipo } from '../../data/camposFormulario'
import { crearSolicitud, obtenerFechaLimiteEstimada } from '../../data/formularios'
import { obtenerCodigoTicket } from '../../data/tickets'
import { subirAdjuntoArchivo, subirAdjuntoLink, MAXIMO_ADJUNTOS_POR_TICKET } from '../../data/adjuntos'
import { AFICHE_VACIO, subirAficheIA, validarArchivoAfiche, type AficheSeleccionado } from '../../data/afichesIA'
import { SelectorAfiche } from '../afichesIA/SelectorAfiche'
import {
  armarDetalle,
  etiquetasGenerales,
  generalidadesIniciales,
  normalizarCampos,
  respuestasIniciales,
  validarSolicitud,
  type Generalidades,
} from '../../lib/validacionFormularios'
import { normalizarEnlace } from '../../lib/enlaces'
import { coincideTexto } from '../../lib/buscar'
import { mensajeError } from '../../lib/errors'
import { formatFechaLarga } from '../../lib/date'
import { useAuth } from '../../auth/useAuth'
import { useHorarioHabil } from '../../hooks/useHorarioHabil'
import { DetalleFormularioVista } from './DetalleFormularioVista'
import { FormularioDinamico } from './FormularioDinamico'
import { GeneralidadesCampos } from './Generalidades'
import { AvisoEnvioModal } from './AvisoEnvioModal'
import { MultiFileDrop } from '../ui/MultiFileDrop'
import { VistaPreviaEnlace } from '../ui/VistaPreviaEnlace'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { CLASE_INPUT } from '../ui/Campo'
import { EmptyState } from '../ui/EmptyState'
import { Modal } from '../ui/Modal'
import { SkeletonLista } from '../ui/Skeleton'
import {
  CATEGORIAS_TIPO,
  TAG_FLUJO,
  type CategoriaTipo,
  type DefinicionCampo,
  type Flujo,
  type Respuestas,
} from '../../types/domain'

interface EnlacePendiente {
  titulo: string
  url: string
}

interface ProgresoAdjunto {
  etiqueta: string
  estado: 'subiendo' | 'listo' | 'error'
}

/** Las divisiones del paso 1 son solo visuales: agrupan las tarjetas por `TipoSolicitud.categoria`. */
const ICONO_POR_CATEGORIA: Record<CategoriaTipo, typeof Palette> = {
  ARTE: Palette,
  VIDEO: Clapperboard,
  DIRCOM: Megaphone,
  PROTOCOLO: Landmark,
  OTROS: LayoutGrid,
}
const DIAS_PRODUCCION_EXCEPCIONAL = 2

interface AsistenteSolicitudProps {
  /** `true` solo desde "Solicitud excepcional" del Jefe de Área: sin horario hábil ni anticipación mínima del tipo. */
  excepcional: boolean
}

export function AsistenteSolicitud({ excepcional }: AsistenteSolicitudProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { perfil, tieneRol } = useAuth()
  const horarioHabil = useHorarioHabil()
  const esAdmin = tieneRol('Administrador')
  const { data: tipos = [], isLoading } = useQuery({ queryKey: ['catalogos', 'tipos-solicitud'], queryFn: listarTiposSolicitud })
  const { data: campus = [] } = useQuery({ queryKey: ['catalogos', 'campus'], queryFn: listarCampus })

  const [paso, setPaso] = useState(1)
  const [busquedaTipo, setBusquedaTipo] = useState('')
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSolicitud | null>(null)
  const [cargandoTipoId, setCargandoTipoId] = useState<number | null>(null)
  const [fechaEstimada, setFechaEstimada] = useState<string | null>(null)
  const [cargandoFecha, setCargandoFecha] = useState(false)
  const [generalidades, setGeneralidades] = useState<Generalidades>(generalidadesIniciales)
  // Los campos se fijan al elegir el tipo: si el Administrador los cambia a mitad del llenado, nada se mueve en pantalla.
  const [campos, setCampos] = useState<DefinicionCampo[]>([])
  const [respuestas, setRespuestas] = useState<Respuestas>({})
  const [mostrarErrores, setMostrarErrores] = useState(false)
  // Solo para tipos de flujo APROBACION_IA: el afiche que revisará el Validador.
  const [afiche, setAfiche] = useState<AficheSeleccionado>(AFICHE_VACIO)
  const [archivos, setArchivos] = useState<File[]>([])
  const [enlaces, setEnlaces] = useState<EnlacePendiente[]>([])
  const [tituloEnlace, setTituloEnlace] = useState('')
  const [urlEnlace, setUrlEnlace] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState<ProgresoAdjunto[]>([])
  const [solicitudCreada, setSolicitudCreada] = useState(false)
  const [modalAviso, setModalAviso] = useState(false)

  // Elegir un tipo sin llenar nada no cuenta como cambio; una vez creada la solicitud ya no hay nada que perder.
  const detalleModificado =
    tipoSeleccionado !== null &&
    (JSON.stringify(generalidades) !== JSON.stringify(generalidadesIniciales()) ||
      JSON.stringify(respuestas) !== JSON.stringify(respuestasIniciales(campos)))
  const hayCambiosSinEnviar =
    !solicitudCreada &&
    (detalleModificado ||
      afiche.archivo !== null ||
      archivos.length > 0 ||
      enlaces.length > 0 ||
      tituloEnlace.trim() !== '' ||
      urlEnlace.trim() !== '')

  const esIA = tipoSeleccionado?.flujo === 'APROBACION_IA'
  const esValidacion = tipoSeleccionado?.flujo === 'VALIDACION'
  const etiquetas = etiquetasGenerales(tipoSeleccionado?.etiquetas_generales)

  const bloqueador = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
        hayCambiosSinEnviar && currentLocation.pathname !== nextLocation.pathname,
      [hayCambiosSinEnviar],
    ),
  )

  // Cerrar o recargar la pestaña: el navegador muestra su propio aviso genérico.
  useBeforeUnload(
    useCallback(
      (evento: BeforeUnloadEvent) => {
        if (hayCambiosSinEnviar) evento.preventDefault()
      },
      [hayCambiosSinEnviar],
    ),
  )

  const totalAdjuntos = archivos.length + enlaces.length
  const espacioDisponible = MAXIMO_ADJUNTOS_POR_TICKET - totalAdjuntos

  // Fuera de horario hábil nadie salvo Administrador puede enviar — las excepcionales nunca se bloquean por horario.
  const bloqueadoPorHorario = !excepcional && !esAdmin && horarioHabil === false

  if (!perfil?.area_id) {
    return (
      <EmptyState
        titulo="Tu cuenta no tiene un área asignada"
        descripcion="Contacta a un administrador para que te asigne un área antes de crear una solicitud."
      />
    )
  }

  async function elegirTipo(tipo: TipoSolicitud) {
    setCargandoTipoId(tipo.id)
    let camposTipo: DefinicionCampo[]
    try {
      const filas = await queryClient.fetchQuery({
        queryKey: ['catalogos', 'campos', tipo.id],
        queryFn: () => listarCamposPorTipo(tipo.id),
      })
      camposTipo = normalizarCampos(filas.filter((c) => c.estado))
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo cargar el formulario de este tipo.'))
      return
    } finally {
      setCargandoTipoId(null)
    }

    setTipoSeleccionado(tipo)
    setCampos(camposTipo)
    setRespuestas(respuestasIniciales(camposTipo))
    setGeneralidades(generalidadesIniciales())
    setAfiche(AFICHE_VACIO)
    setMostrarErrores(false)
    setPaso(2)
    setFechaEstimada(null)
    if (excepcional) return
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
    if (!tipoSeleccionado) return
    const error = validarSolicitud(generalidades, campos, respuestas, etiquetas)
    if (error) {
      setMostrarErrores(true)
      toast.error(error)
      return
    }
    setPaso(3)
  }

  function continuarAPaso4() {
    if (esIA) {
      const error = afiche.archivo ? validarArchivoAfiche(afiche.archivo) : 'Sube el afiche que quieres que se revise.'
      if (error) {
        toast.error(error)
        return
      }
    }
    setPaso(4)
  }

  function agregarEnlace() {
    const enlace = normalizarEnlace(urlEnlace)
    if (!tituloEnlace.trim() || !enlace) {
      toast.error('Completa el título y un enlace válido, por ejemplo drive.google.com/…')
      return
    }
    if (espacioDisponible <= 0) {
      toast.error('Llegaste al máximo de 10 adjuntos.')
      return
    }
    setEnlaces([...enlaces, { titulo: tituloEnlace.trim(), url: enlace }])
    setTituloEnlace('')
    setUrlEnlace('')
  }

  async function enviarSolicitud() {
    if (!tipoSeleccionado) return
    setEnviando(true)

    let ticketId: number
    try {
      ticketId = await crearSolicitud(tipoSeleccionado.id, armarDetalle(generalidades, campos, respuestas), excepcional)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo crear la solicitud.'))
      setEnviando(false)
      return
    }

    setSolicitudCreada(true)
    const codigo = await obtenerCodigoTicket(ticketId).catch(() => null)
    toast.success(codigo ? `Solicitud ${codigo} enviada.` : 'Solicitud enviada.')

    let huboError = false

    // Flujo IA, en este orden: ticket creado → subir el afiche → registrarlo en EnvioIA (subirAficheIA
    // borra el archivo si el registro falla). Si falla, el ticket queda sin envío y el detalle ofrece
    // "Subir afiche".
    if (esIA && afiche.archivo) {
      setProgreso([{ etiqueta: `Afiche: ${afiche.archivo.name}`, estado: 'subiendo' }])
      try {
        await subirAficheIA({ ticketId, archivo: afiche.archivo, comentario: afiche.comentario })
        setProgreso([{ etiqueta: `Afiche: ${afiche.archivo.name}`, estado: 'listo' }])
      } catch (error) {
        huboError = true
        setProgreso([{ etiqueta: `Afiche: ${afiche.archivo.name}`, estado: 'error' }])
        toast.error(
          `${await mensajeError(error, 'No se pudo subir el afiche.')} La solicitud quedó creada: súbelo desde el detalle con "Subir afiche".`,
        )
      }
    }
    const desplazamiento = esIA && afiche.archivo ? 1 : 0

    const items: ProgresoAdjunto[] = [
      ...archivos.map((a) => ({ etiqueta: a.name, estado: 'subiendo' as const })),
      ...enlaces.map((e) => ({ etiqueta: e.titulo, estado: 'subiendo' as const })),
    ]
    setProgreso((prev) => [...prev, ...items])

    for (let i = 0; i < archivos.length; i++) {
      const indiceGlobal = desplazamiento + i
      try {
        await subirAdjuntoArchivo({ ticketId, archivo: archivos[i] })
        setProgreso((prev) => prev.map((p, idx) => (idx === indiceGlobal ? { ...p, estado: 'listo' } : p)))
      } catch {
        huboError = true
        setProgreso((prev) => prev.map((p, idx) => (idx === indiceGlobal ? { ...p, estado: 'error' } : p)))
      }
    }

    for (let i = 0; i < enlaces.length; i++) {
      const indiceGlobal = desplazamiento + archivos.length + i
      try {
        await subirAdjuntoLink({ ticketId, titulo: enlaces[i].titulo, url: enlaces[i].url })
        setProgreso((prev) => prev.map((p, idx) => (idx === indiceGlobal ? { ...p, estado: 'listo' } : p)))
      } catch {
        huboError = true
        setProgreso((prev) => prev.map((p, idx) => (idx === indiceGlobal ? { ...p, estado: 'error' } : p)))
      }
    }

    setEnviando(false)

    if (huboError && totalAdjuntos > 0) {
      toast.error('Algunos archivos no se pudieron subir. Podrás agregarlos de nuevo desde el detalle del ticket.')
    }

    setTimeout(() => navigate(`/tickets/${ticketId}`), huboError ? 1500 : 300)
  }

  // Solo las solicitudes de diseño pueden ser excepcionales (la base también rechaza las demás).
  const tiposVisibles = tipos.filter(
    (t) =>
      t.estado &&
      (!excepcional || t.flujo === 'DISENO') &&
      (coincideTexto(t.nombre, busquedaTipo) || coincideTexto(t.descripcion, busquedaTipo)),
  )
  const categoriaDe = (t: TipoSolicitud): CategoriaTipo =>
    CATEGORIAS_TIPO.some((c) => c.valor === t.categoria) ? (t.categoria as CategoriaTipo) : 'OTROS'
  const gruposTipo = CATEGORIAS_TIPO.map((categoria) => ({
    ...categoria,
    tipos: tiposVisibles.filter((t) => categoriaDe(t) === categoria.valor),
  })).filter((grupo) => grupo.tipos.length > 0)

  const nombresCampus = campus.filter((c) => generalidades.campus_ids.includes(c.id)).map((c) => c.nombre)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">{excepcional ? 'Solicitud excepcional' : 'Nueva solicitud'}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-tinta-suave">
          {['Tipo', 'Formulario', esIA ? 'Afiche' : 'Adjuntos', 'Revisar y enviar'].map((etiqueta, indice) => (
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
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
              <input
                className={`${CLASE_INPUT} pl-9`}
                placeholder="Buscar tipo de solicitud…"
                aria-label="Buscar tipo de solicitud"
                value={busquedaTipo}
                onChange={(e) => setBusquedaTipo(e.target.value)}
              />
            </div>
            {gruposTipo.length === 0 && (
              <EmptyState titulo="Sin resultados" descripcion="Ningún tipo de solicitud coincide con la búsqueda." />
            )}
            {gruposTipo.map((grupo) => {
              const Icono = ICONO_POR_CATEGORIA[grupo.valor]
              return (
                <div key={grupo.valor}>
                  {gruposTipo.length > 1 && (
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-tinta-suave">
                      {grupo.etiqueta}
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {grupo.tipos.map((tipo) => (
                      <button
                        key={tipo.id}
                        type="button"
                        onClick={() => elegirTipo(tipo)}
                        disabled={cargandoTipoId !== null}
                        className="flex items-start gap-3 rounded-xl border border-azul-niebla bg-white p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-menta hover:shadow-md disabled:cursor-wait"
                      >
                        <span className="rounded-full bg-azul-niebla p-2 text-azul-institucional">
                          {cargandoTipoId === tipo.id ? <Loader2 size={20} className="animate-spin" /> : <Icono size={20} />}
                        </span>
                        <span>
                          <p className="font-semibold text-tinta">
                            {tipo.nombre}
                            {TAG_FLUJO[tipo.flujo as Flujo] && (
                              <span className="ml-2 rounded-full bg-indigo-bruma px-2 py-0.5 align-middle text-[10px] font-semibold text-indigo-suave">
                                {TAG_FLUJO[tipo.flujo as Flujo]}
                              </span>
                            )}
                          </p>
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

      {paso === 2 && tipoSeleccionado && (
        <Card>
          <h2 className="font-semibold text-azul-noche">{tipoSeleccionado.nombre}</h2>
          {!excepcional && (esIA || esValidacion) && (
            // Sin diseño no hay entrega: lo que corre es el plazo para responder la solicitud.
            <p className="mb-4 text-sm text-tinta-suave">
              Plazo de respuesta: {tipoSeleccionado.dias_estimados} día(s) {tipoSeleccionado.dias_habiles ? 'hábiles' : 'corridos'}
            </p>
          )}
          {!excepcional && !esIA && !esValidacion && (
            <p className="mb-4 text-sm text-tinta-suave">
              {cargandoFecha
                ? 'Calculando fecha estimada…'
                : fechaEstimada
                  ? `Fecha estimada de entrega: ${formatFechaLarga(fechaEstimada)} (${tipoSeleccionado.dias_estimados} día(s) ${tipoSeleccionado.dias_habiles ? 'hábiles' : 'corridos'})`
                  : null}
            </p>
          )}

          {tipoSeleccionado.aviso && (
            <div className="mb-4 flex gap-2 rounded-lg border-l-4 border-azul-medio bg-azul-niebla p-3 text-sm text-azul-institucional">
              <Info size={18} className="mt-0.5 flex-none" />
              <p className="whitespace-pre-line font-medium">{tipoSeleccionado.aviso}</p>
            </div>
          )}

          {!excepcional && horarioHabil === false && !esAdmin && (
            <div className="mb-4 rounded-lg bg-ambar-bruma p-3 text-sm text-ambar">
              Las solicitudes solo se pueden enviar de lunes a viernes, de 8:00 a. m. a 4:00 p. m. Puedes llenar el
              formulario, pero el envío se habilitará en horario hábil.
            </div>
          )}

          <GeneralidadesCampos
            valor={generalidades}
            onCambiar={setGeneralidades}
            tipoId={tipoSeleccionado.id}
            excepcional={excepcional}
            diasProduccion={excepcional ? DIAS_PRODUCCION_EXCEPCIONAL : tipoSeleccionado.dias_estimados}
            conProduccion={!esIA && !esValidacion}
            etiquetas={etiquetas}
          />

          {campos.length > 0 && (
            <div className="mt-6 border-t border-azul-niebla pt-4">
              <FormularioDinamico campos={campos} respuestas={respuestas} onCambiar={setRespuestas} mostrarErrores={mostrarErrores} />
            </div>
          )}

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
          {/* Afiches con IA: solo se sube el afiche, sin otros adjuntos (la base los rechaza). */}
          {esIA ? (
            <>
              <h2 className="mb-1 font-semibold text-azul-noche">Afiche *</h2>
              <p className="mb-4 text-sm text-tinta-suave">
                El afiche será revisado. Tienes hasta 5 intentos y {tipoSeleccionado?.dias_estimados} día(s){' '}
                {tipoSeleccionado?.dias_habiles ? 'hábiles' : 'corridos'} para que sea aprobado.
              </p>
              <SelectorAfiche valor={afiche} onCambiar={setAfiche} />
            </>
          ) : (
          <>
          <h2 className="mb-1 font-semibold text-azul-noche">Adjuntos</h2>
          <p className="mb-4 text-sm text-tinta-suave">
            {esValidacion
              ? 'Adjunta lo que se necesite para decidir (programa, invitación, referencias).'
              : 'Adjunta logos, imágenes, textos o referencias que sirvan para tu solicitud.'}{' '}
            Si son muchas fotos, comparte un enlace de Drive. ({totalAdjuntos} / {MAXIMO_ADJUNTOS_POR_TICKET})
          </p>

          <MultiFileDrop archivos={archivos} onCambiar={setArchivos} espacioDisponible={espacioDisponible} />

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-tinta">Agregar un enlace</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <input
                className={CLASE_INPUT}
                placeholder="Título (ej. Fotos del evento)"
                value={tituloEnlace}
                onChange={(e) => setTituloEnlace(e.target.value)}
              />
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="url"
                  className={CLASE_INPUT}
                  placeholder="drive.google.com/…"
                  value={urlEnlace}
                  onChange={(e) => setUrlEnlace(e.target.value)}
                />
                <VistaPreviaEnlace valor={urlEnlace} />
              </div>
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
          </>
          )}

          <div className="mt-6 flex justify-between">
            <Button variante="fantasma" onClick={() => setPaso(2)}>
              <ArrowLeft size={16} /> Volver
            </Button>
            <Button onClick={continuarAPaso4}>
              Continuar <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {paso === 4 && tipoSeleccionado && (
        <Card>
          <h2 className="mb-4 font-semibold text-azul-noche">Revisa tu solicitud</h2>
          <p className="mb-2 text-sm text-tinta-suave">
            Tipo: <span className="font-medium text-tinta">{tipoSeleccionado.nombre}</span>
          </p>
          <DetalleFormularioVista
            detalle={{
              titulo: generalidades.titulo.trim(),
              dirigido_a: generalidades.dirigido_a.trim(),
              fecha_evento: generalidades.fecha_evento,
              campus: nombresCampus,
              campos,
              respuestas,
            }}
            etiquetas={etiquetas}
          />

          {bloqueadoPorHorario && (
            <div className="mt-4 rounded-lg bg-ambar-bruma p-3 text-sm text-ambar">
              Las solicitudes solo se pueden enviar de lunes a viernes, de 8:00 a. m. a 4:00 p. m. El botón se
              habilitará en horario hábil.
            </div>
          )}

          {esIA && afiche.archivo && (
            <p className="mt-4 text-sm text-tinta-suave">
              Afiche: <span className="font-medium text-tinta">{afiche.archivo.name}</span>
            </p>
          )}

          {!esIA && (
            <>
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
            </>
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
            <Button
              onClick={() => (tipoSeleccionado?.aviso ? setModalAviso(true) : enviarSolicitud())}
              cargando={enviando}
              disabled={bloqueadoPorHorario}
              title={bloqueadoPorHorario ? 'Las solicitudes solo se envían en horario hábil.' : undefined}
            >
              <Check size={16} /> Enviar solicitud
            </Button>
          </div>
        </Card>
      )}

      <Modal abierto={bloqueador.state === 'blocked'} onCerrar={() => bloqueador.reset?.()} titulo="¿Salir sin enviar la solicitud?">
        <p className="text-sm text-tinta-suave">
          Tienes cambios sin enviar. Si sales de esta página se perderá todo lo que llenaste, incluidos los
          adjuntos.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variante="secundario" onClick={() => bloqueador.reset?.()}>
            Seguir editando
          </Button>
          <Button variante="peligro" onClick={() => bloqueador.proceed?.()}>
            Salir y descartar
          </Button>
        </div>
      </Modal>

      <AvisoEnvioModal
        abierto={modalAviso}
        aviso={tipoSeleccionado?.aviso ?? ''}
        enviando={enviando}
        onVolver={() => setModalAviso(false)}
        onAceptar={() => {
          setModalAviso(false)
          void enviarSolicitud()
        }}
      />
    </div>
  )
}
