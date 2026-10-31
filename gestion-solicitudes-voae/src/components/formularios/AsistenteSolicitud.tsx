import { useCallback, useEffect, useId, useRef, useState } from 'react'
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
import { nombresAlcance } from '../../lib/campus'
import { coincidePalabras, partesResaltadas } from '../../lib/buscar'
import { mensajeError } from '../../lib/errors'
import { formatFechaLarga } from '../../lib/date'
import { useAuth } from '../../auth/useAuth'
import { useHorarioHabil } from '../../hooks/useHorarioHabil'
import { DetalleFormularioVista } from './DetalleFormularioVista'
import { FormularioDinamico } from './FormularioDinamico'
import { StepperAsistente } from './StepperAsistente'
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
/** Título de cada contenedor y chip del paso 1 (en plural donde se lee mejor). */
const ETIQUETA_GRUPO: Record<CategoriaTipo, string> = {
  ARTE: 'Arte',
  VIDEO: 'Video',
  DIRCOM: 'DIRCOM',
  PROTOCOLO: 'Protocolos',
  OTROS: 'Otros',
}
const DIAS_PRODUCCION_EXCEPCIONAL = 2

/** Texto con las palabras buscadas resaltadas (sin importar tildes ni mayúsculas). */
function Resaltado({ texto, busqueda }: { texto: string; busqueda: string }) {
  return (
    <>
      {partesResaltadas(texto, busqueda).map((parte, indice) =>
        parte.resaltado ? (
          <mark key={indice} className="rounded-sm bg-menta-bruma px-0.5 text-menta-profundo">
            {parte.texto}
          </mark>
        ) : (
          <span key={indice}>{parte.texto}</span>
        ),
      )}
    </>
  )
}

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
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaTipo | ''>('')
  const buscadorTipoRef = useRef<HTMLInputElement>(null)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSolicitud | null>(null)
  const [cargandoTipoId, setCargandoTipoId] = useState<number | null>(null)
  const [fechaEstimada, setFechaEstimada] = useState<string | null>(null)
  const [cargandoFecha, setCargandoFecha] = useState(false)
  const [generalidades, setGeneralidades] = useState<Generalidades>(generalidadesIniciales)
  // Los campos se fijan al elegir el tipo: si el Administrador los cambia a mitad del llenado, nada se mueve en pantalla.
  const [campos, setCampos] = useState<DefinicionCampo[]>([])
  const [respuestas, setRespuestas] = useState<Respuestas>({})
  const [mostrarErrores, setMostrarErrores] = useState(false)
  // Solo para tipos de flujo APROBACION: el archivo que revisará el Validador.
  const [afiche, setAfiche] = useState<AficheSeleccionado>(AFICHE_VACIO)
  const [archivos, setArchivos] = useState<File[]>([])
  const [enlaces, setEnlaces] = useState<EnlacePendiente[]>([])
  const [tituloEnlace, setTituloEnlace] = useState('')
  const [urlEnlace, setUrlEnlace] = useState('')
  const idTituloEnlace = useId()
  const idUrlEnlace = useId()
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState<ProgresoAdjunto[]>([])
  const [solicitudCreada, setSolicitudCreada] = useState(false)
  const [modalAviso, setModalAviso] = useState(false)
  // Tipo nuevo elegido después de haber llenado algo: espera confirmación porque se pierden las respuestas.
  const [tipoPendiente, setTipoPendiente] = useState<TipoSolicitud | null>(null)

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

  const esAprobacion = tipoSeleccionado?.flujo === 'APROBACION'
  const esConfirmacion = tipoSeleccionado?.flujo === 'CONFIRMACION'
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

  // "/" enfoca el buscador de tipos (paso 1), salvo que ya se esté escribiendo en otro campo.
  useEffect(() => {
    if (paso !== 1) return
    function alPresionar(evento: KeyboardEvent) {
      if (evento.key !== '/' || evento.ctrlKey || evento.metaKey || evento.altKey) return
      const destino = evento.target as HTMLElement | null
      if (destino?.closest('input, textarea, select, [contenteditable="true"]')) return
      evento.preventDefault()
      buscadorTipoRef.current?.focus()
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [paso])

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

  // Lo que falta en cada paso, para marcarlo en el stepper y para que "Enviar" lleve al primero con errores.
  const errorFormulario = tipoSeleccionado ? validarSolicitud(generalidades, campos, respuestas, etiquetas) : null
  const errorAfiche = esAprobacion
    ? afiche.archivo
      ? validarArchivoAfiche(afiche.archivo)
      : 'Sube el archivo que quieres que se revise.'
    : null

  /** Volver a un tipo ya elegido no borra nada; cambiarlo sí, y por eso se confirma antes. */
  function elegirTipo(tipo: TipoSolicitud) {
    if (tipoSeleccionado?.id === tipo.id) {
      setPaso(2)
      return
    }
    if (tipoSeleccionado && detalleModificado) {
      setTipoPendiente(tipo)
      return
    }
    void cargarTipo(tipo)
  }

  /** El stepper deja ir a cualquier paso; al salir del formulario con faltantes, se resaltan. */
  function irAPaso(destino: number) {
    if (destino > 1 && !tipoSeleccionado) return
    if (paso === 2 && destino !== 2 && errorFormulario) setMostrarErrores(true)
    setPaso(destino)
  }

  function enviarConValidacion() {
    if (errorFormulario) {
      setMostrarErrores(true)
      setPaso(2)
      toast.error(errorFormulario)
      return
    }
    if (errorAfiche) {
      setPaso(3)
      toast.error(errorAfiche)
      return
    }
    if (tipoSeleccionado?.aviso) setModalAviso(true)
    else void enviarSolicitud()
  }

  async function cargarTipo(tipo: TipoSolicitud) {
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
    if (errorFormulario) {
      setMostrarErrores(true)
      toast.error(errorFormulario)
      return
    }
    setPaso(3)
  }

  function continuarAPaso4() {
    if (errorAfiche) {
      toast.error(errorAfiche)
      return
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

    // Flujo IA, en este orden: ticket creado → subir el archivo → registrarlo en EnvioIA (subirAficheIA
    // borra el archivo si el registro falla). Si falla, el ticket queda sin envío y el detalle ofrece
    // "Subir archivo".
    if (esAprobacion && afiche.archivo) {
      setProgreso([{ etiqueta: `Archivo: ${afiche.archivo.name}`, estado: 'subiendo' }])
      try {
        await subirAficheIA({ ticketId, archivo: afiche.archivo, comentario: afiche.comentario })
        setProgreso([{ etiqueta: `Archivo: ${afiche.archivo.name}`, estado: 'listo' }])
      } catch (error) {
        huboError = true
        setProgreso([{ etiqueta: `Archivo: ${afiche.archivo.name}`, estado: 'error' }])
        toast.error(
          `${await mensajeError(error, 'No se pudo subir el archivo.')} La solicitud quedó creada: súbelo desde el detalle con "Subir archivo".`,
        )
      }
    }
    const desplazamiento = esAprobacion && afiche.archivo ? 1 : 0

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

  // Desde la Parte 61 cualquier flujo admite excepcionales (Diseño, Aprobación y Confirmación).
  const categoriaDe = (t: TipoSolicitud): CategoriaTipo =>
    CATEGORIAS_TIPO.some((c) => c.valor === t.categoria) ? (t.categoria as CategoriaTipo) : 'OTROS'
  // Cada palabra debe aparecer en el nombre, la descripción o la categoría; el chip de categoría se suma.
  const tiposVisibles = tipos.filter(
    (t) =>
      t.estado &&
      (!categoriaFiltro || categoriaDe(t) === categoriaFiltro) &&
      coincidePalabras([t.nombre, t.descripcion, ETIQUETA_GRUPO[categoriaDe(t)]], busquedaTipo),
  )
  const gruposTipo = CATEGORIAS_TIPO.map((categoria) => ({
    valor: categoria.valor,
    etiqueta: ETIQUETA_GRUPO[categoria.valor],
    tipos: tiposVisibles.filter((t) => categoriaDe(t) === categoria.valor),
  })).filter((grupo) => grupo.tipos.length > 0)
  const hayFiltroTipo = busquedaTipo.trim() !== '' || categoriaFiltro !== ''

  function limpiarFiltroTipo() {
    setBusquedaTipo('')
    setCategoriaFiltro('')
    buscadorTipoRef.current?.focus()
  }

  const nombresCampus = nombresAlcance(campus.filter((c) => generalidades.campus_ids.includes(c.id)))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">{excepcional ? 'Solicitud excepcional' : 'Nueva solicitud'}</h1>
        <StepperAsistente
          actual={paso}
          onIr={irAPaso}
          pasos={[
            { etiqueta: 'Tipo', habilitado: !enviando && !solicitudCreada, incompleto: false },
            {
              etiqueta: 'Formulario',
              habilitado: tipoSeleccionado !== null && !enviando && !solicitudCreada,
              incompleto: errorFormulario !== null,
            },
            {
              etiqueta: esAprobacion ? 'Archivo' : 'Adjuntos',
              habilitado: tipoSeleccionado !== null && !enviando && !solicitudCreada,
              incompleto: errorAfiche !== null,
            },
            { etiqueta: 'Revisar y enviar', habilitado: tipoSeleccionado !== null && !enviando && !solicitudCreada, incompleto: false },
          ]}
        />
      </div>

      {paso === 1 &&
        (isLoading ? (
          <SkeletonLista />
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-suave" />
                <input
                  ref={buscadorTipoRef}
                  type="search"
                  className={`${CLASE_INPUT} pl-9 pr-10`}
                  placeholder="Buscar tipo de solicitud…"
                  aria-label="Buscar tipo de solicitud"
                  aria-keyshortcuts="/"
                  value={busquedaTipo}
                  onChange={(e) => setBusquedaTipo(e.target.value)}
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-azul-niebla px-1.5 font-mono text-[10px] text-tinta-suave sm:block">
                  /
                </kbd>
              </div>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoría">
                {[{ valor: '' as const, etiqueta: 'Todas' }, ...CATEGORIAS_TIPO.map((c) => ({ valor: c.valor, etiqueta: ETIQUETA_GRUPO[c.valor] }))].map(
                  (chip) => {
                    const activo = categoriaFiltro === chip.valor
                    return (
                      <button
                        key={chip.etiqueta}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => setCategoriaFiltro(chip.valor)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 ${
                          activo
                            ? 'bg-azul-institucional text-white'
                            : 'bg-azul-niebla text-azul-institucional hover:bg-azul-niebla/70'
                        }`}
                      >
                        {chip.etiqueta}
                      </button>
                    )
                  },
                )}
                {hayFiltroTipo && (
                  <button
                    type="button"
                    onClick={limpiarFiltroTipo}
                    className="inline-flex items-center gap-1 text-xs font-medium text-tinta-suave hover:text-coral"
                  >
                    <XCircle size={14} /> Limpiar
                  </button>
                )}
              </div>
            </div>

            {gruposTipo.length === 0 && (
              <EmptyState
                titulo={
                  busquedaTipo.trim()
                    ? `No hay tipos que coincidan con «${busquedaTipo.trim()}»`
                    : 'No hay tipos en esta categoría'
                }
                accion={
                  <Button variante="secundario" onClick={limpiarFiltroTipo}>
                    Limpiar
                  </Button>
                }
              />
            )}

            {gruposTipo.map((grupo) => {
              const Icono = ICONO_POR_CATEGORIA[grupo.valor]
              return (
                <section key={grupo.valor} className="rounded-2xl border border-azul-niebla bg-white/60 p-4 shadow-sm">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-azul-noche">
                    <span className="rounded-full bg-azul-niebla p-1.5 text-azul-institucional">
                      <Icono size={16} />
                    </span>
                    {grupo.etiqueta}
                    <span className="rounded-full bg-azul-niebla px-2 py-0.5 text-xs font-medium text-tinta-suave">
                      {grupo.tipos.length}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {grupo.tipos.map((tipo) => (
                      <button
                        key={tipo.id}
                        type="button"
                        onClick={() => elegirTipo(tipo)}
                        disabled={cargandoTipoId !== null}
                        aria-current={tipoSeleccionado?.id === tipo.id ? 'true' : undefined}
                        className={`flex items-start gap-3 rounded-xl border bg-white p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-menta hover:shadow-md disabled:cursor-wait ${
                          tipoSeleccionado?.id === tipo.id ? 'border-menta ring-2 ring-menta/40' : 'border-azul-niebla'
                        }`}
                      >
                        <span className="flex-none rounded-full bg-azul-niebla p-2 text-azul-institucional">
                          {cargandoTipoId === tipo.id ? <Loader2 size={20} className="animate-spin" /> : <Icono size={20} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-lg font-bold leading-snug text-azul-noche">
                            <Resaltado texto={tipo.nombre} busqueda={busquedaTipo} />
                            {TAG_FLUJO[tipo.flujo as Flujo] && (
                              <span className="ml-2 rounded-full bg-indigo-bruma px-2 py-0.5 align-middle text-[10px] font-semibold text-indigo-suave">
                                {TAG_FLUJO[tipo.flujo as Flujo]}
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-tinta-suave">
                            {tipo.dias_estimados} día(s) {tipo.dias_habiles ? 'hábiles' : 'corridos'}
                          </span>
                          {tipo.descripcion && (
                            <span className="mt-1 block text-sm text-tinta-suave">
                              <Resaltado texto={tipo.descripcion} busqueda={busquedaTipo} />
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        ))}

      {paso === 2 && tipoSeleccionado && (
        <Card>
          <h2 className="font-semibold text-azul-noche">{tipoSeleccionado.nombre}</h2>
          {!excepcional && (esAprobacion || esConfirmacion) && (
            // Sin diseño no hay entrega: lo que corre es el plazo para responder la solicitud.
            <p className="mb-4 text-sm text-tinta-suave">
              Plazo de respuesta: {tipoSeleccionado.dias_estimados} día(s) {tipoSeleccionado.dias_habiles ? 'hábiles' : 'corridos'}
            </p>
          )}
          {!excepcional && !esAprobacion && !esConfirmacion && (
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
            conProduccion={!esAprobacion && !esConfirmacion}
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
          {/* Aprobación: solo se sube el archivo a revisar, sin otros adjuntos (la base los rechaza). */}
          {esAprobacion ? (
            <>
              <h2 className="mb-1 font-semibold text-azul-noche">Archivo a revisar *</h2>
              <p className="mb-4 text-sm text-tinta-suave">
                {excepcional ? (
                  <>Primero se acepta la solicitud excepcional y luego se revisa el archivo. Tienes hasta 5 intentos.</>
                ) : (
                  <>
                    El archivo será revisado. Tienes hasta 5 intentos y {tipoSeleccionado?.dias_estimados} día(s){' '}
                    {tipoSeleccionado?.dias_habiles ? 'hábiles' : 'corridos'} para que sea aprobado.
                  </>
                )}
              </p>
              <SelectorAfiche valor={afiche} onCambiar={setAfiche} />
            </>
          ) : (
          <>
          <h2 className="mb-1 font-semibold text-azul-noche">Adjuntos</h2>
          <p className="mb-4 text-sm text-tinta-suave">
            {esConfirmacion
              ? 'Adjunta lo que se necesite para decidir (programa, invitación, referencias).'
              : 'Adjunta logos, imágenes, textos o referencias que sirvan para tu solicitud.'}{' '}
            Si son muchas fotos, comparte un enlace de Drive. ({totalAdjuntos} / {MAXIMO_ADJUNTOS_POR_TICKET})
          </p>

          <MultiFileDrop archivos={archivos} onCambiar={setArchivos} espacioDisponible={espacioDisponible} />

          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-tinta">Agregar un enlace</p>
            {/* Título arriba y Enlace abajo, a todo el ancho: una URL larga nunca empuja nada fuera. */}
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <label htmlFor={idTituloEnlace} className="mb-1 block text-sm font-medium text-tinta">
                  Título
                </label>
                <input
                  id={idTituloEnlace}
                  className={`${CLASE_INPUT} min-w-0`}
                  placeholder="Ej. Fotos del evento"
                  value={tituloEnlace}
                  onChange={(e) => setTituloEnlace(e.target.value)}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor={idUrlEnlace} className="mb-1 block text-sm font-medium text-tinta">
                  Enlace
                </label>
                <input
                  id={idUrlEnlace}
                  type="text"
                  inputMode="url"
                  className={`${CLASE_INPUT} min-w-0`}
                  placeholder="drive.google.com/…"
                  value={urlEnlace}
                  onChange={(e) => setUrlEnlace(e.target.value)}
                />
                <VistaPreviaEnlace valor={urlEnlace} />
              </div>
              <div>
                <Button variante="secundario" onClick={agregarEnlace} disabled={espacioDisponible <= 0}>
                  Agregar enlace
                </Button>
              </div>
            </div>
            {enlaces.length > 0 && (
              <ul className="space-y-2">
                {enlaces.map((enlace, indice) => (
                  <li key={`${enlace.url}-${indice}`} className="flex items-center justify-between gap-3 rounded-lg border border-azul-niebla p-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <LinkIcon size={14} className="flex-none text-azul-institucional" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-tinta" title={enlace.titulo}>
                          {enlace.titulo}
                        </p>
                        <p className="truncate text-xs text-tinta-suave" title={enlace.url}>
                          {enlace.url}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Quitar ${enlace.titulo}`}
                      className="flex-none"
                      onClick={() => setEnlaces(enlaces.filter((_, i) => i !== indice))}
                    >
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

          {esAprobacion && afiche.archivo && (
            <p className="mt-4 text-sm text-tinta-suave">
              Archivo: <span className="font-medium text-tinta">{afiche.archivo.name}</span>
            </p>
          )}

          {!esAprobacion && (
            <>
              <p className="mt-4 text-sm font-semibold text-tinta">Adjuntos ({totalAdjuntos})</p>
              {totalAdjuntos === 0 ? (
                <p className="text-sm text-tinta-suave">Sin adjuntos.</p>
              ) : (
                <ul className="mt-1 text-sm text-tinta-suave">
                  {archivos.map((a) => (
                    <li key={a.name} className="truncate" title={a.name}>· {a.name}</li>
                  ))}
                  {enlaces.map((e) => (
                    <li key={e.url} className="truncate" title={e.url}>· {e.titulo} (enlace)</li>
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
              onClick={enviarConValidacion}
              cargando={enviando}
              disabled={bloqueadoPorHorario}
              title={bloqueadoPorHorario ? 'Las solicitudes solo se envían en horario hábil.' : undefined}
            >
              <Check size={16} /> Enviar solicitud
            </Button>
          </div>
        </Card>
      )}

      <Modal abierto={tipoPendiente !== null} onCerrar={() => setTipoPendiente(null)} titulo="¿Cambiar el tipo de solicitud?">
        <p className="text-sm text-tinta-suave">Al cambiar el tipo se perderán las respuestas del formulario.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variante="secundario" onClick={() => setTipoPendiente(null)}>
            Conservar {tipoSeleccionado?.nombre}
          </Button>
          <Button
            variante="peligro"
            onClick={() => {
              const tipo = tipoPendiente
              setTipoPendiente(null)
              if (tipo) void cargarTipo(tipo)
            }}
          >
            Cambiar a {tipoPendiente?.nombre}
          </Button>
        </div>
      </Modal>

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
