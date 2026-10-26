import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Copy, Eye, ListChecks, Plus } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { CLASE_INPUT } from './ui/Campo'
import { SkeletonLista } from './ui/Skeleton'
import { EditorCampo } from './EditorCampo'
import { FormularioDinamico } from './formularios/FormularioDinamico'
import {
  actualizarCampo,
  copiarCamposDeTipo,
  listarCamposPorTipo,
  reordenarCampos,
  type CampoFormulario,
} from '../data/camposFormulario'
import type { TipoSolicitud } from '../data/catalogos'
import { mensajeError } from '../lib/errors'
import { etiquetasGenerales, normalizarCampos, respuestasIniciales } from '../lib/validacionFormularios'
import { TIPOS_CAMPO, type Respuestas } from '../types/domain'

interface CamposTipoModalProps {
  tipo: TipoSolicitud | null
  tipos: TipoSolicitud[]
  onCerrar: () => void
}

export function CamposTipoModal({ tipo, tipos, onCerrar }: CamposTipoModalProps) {
  return (
    <Modal abierto={tipo !== null} onCerrar={onCerrar} titulo={tipo ? `Campos de "${tipo.nombre}"` : ''} ancho="amplio">
      {tipo && <ContenidoCampos key={tipo.id} tipo={tipo} tipos={tipos} />}
    </Modal>
  )
}

type Vista = { modo: 'lista' } | { modo: 'editar'; campo: CampoFormulario | null } | { modo: 'vista-previa' }

function ContenidoCampos({ tipo, tipos }: { tipo: TipoSolicitud; tipos: TipoSolicitud[] }) {
  const queryClient = useQueryClient()
  const clave = ['catalogos', 'campos', tipo.id]
  // Con los nombres propios del tipo ("Fecha de entrega"…), no siempre los de por defecto.
  const g = etiquetasGenerales(tipo.etiquetas_generales)
  const nombresGenerales = `${g.titulo}, ${g.fecha_evento}, ${g.dirigido_a} y ${g.alcance}`.toLowerCase()
  const { data: campos = [], isLoading } = useQuery({ queryKey: clave, queryFn: () => listarCamposPorTipo(tipo.id) })

  const [vista, setVista] = useState<Vista>({ modo: 'lista' })
  const [ocupado, setOcupado] = useState(false)
  const [origenCopia, setOrigenCopia] = useState('')

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: clave })
  }

  async function ejecutar(accion: () => Promise<void>, mensajeFallo: string) {
    setOcupado(true)
    try {
      await accion()
    } catch (error) {
      toast.error(await mensajeError(error, mensajeFallo))
    } finally {
      setOcupado(false)
      invalidar()
    }
  }

  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion
    if (destino < 0 || destino >= campos.length) return
    const nuevoOrden = [...campos]
    ;[nuevoOrden[indice], nuevoOrden[destino]] = [nuevoOrden[destino], nuevoOrden[indice]]
    void ejecutar(() => reordenarCampos(nuevoOrden), 'No se pudo cambiar el orden.')
  }

  function alternarEstado(campo: CampoFormulario) {
    void ejecutar(
      () => actualizarCampo(campo.id, { estado: !campo.estado }),
      campo.estado ? 'No se pudo desactivar el campo.' : 'No se pudo activar el campo.',
    )
  }

  function copiar() {
    const origenId = Number(origenCopia)
    if (!origenId) return
    void ejecutar(async () => {
      const { copiados, saltados } = await copiarCamposDeTipo(origenId, tipo.id)
      const detalleSaltados = saltados > 0 ? ` ${saltados} se saltaron porque su clave ya existía.` : ''
      if (copiados === 0 && saltados === 0) toast.info('El tipo de origen no tiene campos activos.')
      else toast.success(`Se copiaron ${copiados} campo(s).${detalleSaltados}`)
      setOrigenCopia('')
    }, 'No se pudieron copiar los campos.')
  }

  if (isLoading) return <SkeletonLista filas={3} />

  if (vista.modo === 'editar') {
    return (
      <EditorCampo
        tipoSolicitudId={tipo.id}
        campo={vista.campo}
        existentes={campos}
        onCancelar={() => setVista({ modo: 'lista' })}
        onGuardado={() => {
          invalidar()
          setVista({ modo: 'lista' })
        }}
      />
    )
  }

  const pestanas = (
    <div className="mb-4 flex gap-2">
      <Button variante={vista.modo === 'lista' ? 'primario' : 'secundario'} onClick={() => setVista({ modo: 'lista' })}>
        <ListChecks size={14} /> Campos
      </Button>
      <Button
        variante={vista.modo === 'vista-previa' ? 'primario' : 'secundario'}
        onClick={() => setVista({ modo: 'vista-previa' })}
      >
        <Eye size={14} /> Vista previa
      </Button>
    </div>
  )

  if (vista.modo === 'vista-previa') {
    return (
      <div>
        {pestanas}
        <VistaPrevia campos={campos} nombresGenerales={nombresGenerales} />
      </div>
    )
  }

  const otrosTipos = tipos.filter((t) => t.id !== tipo.id)

  return (
    <div>
      {pestanas}

      <p className="mb-3 text-sm text-tinta-suave">
        Estos campos aparecen debajo de las generalidades ({nombresGenerales}), que todas las
        solicitudes llevan siempre. Los cambios solo afectan a las solicitudes nuevas.
      </p>

      {campos.length === 0 ? (
        <p className="rounded-lg bg-azul-niebla/30 p-4 text-sm text-tinta-suave">
          Este tipo todavía no tiene campos propios: solo pedirá las generalidades.
        </p>
      ) : (
        <ul className="divide-y divide-azul-niebla/60 rounded-lg border border-azul-niebla">
          {campos.map((campo, indice) => (
            <li key={campo.id} className={`flex items-center gap-3 px-3 py-2 ${campo.estado ? '' : 'opacity-60'}`}>
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label="Subir"
                  disabled={ocupado || indice === 0}
                  onClick={() => mover(indice, -1)}
                  className="text-tinta-suave hover:text-azul-institucional disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Bajar"
                  disabled={ocupado || indice === campos.length - 1}
                  onClick={() => mover(indice, 1)}
                  className="text-tinta-suave hover:text-azul-institucional disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-tinta">
                  {campo.etiqueta}
                  {campo.obligatorio && <span className="text-coral"> *</span>}
                </p>
                <p className="truncate text-xs text-tinta-suave">
                  <span className="font-mono">{campo.clave}</span> ·{' '}
                  {TIPOS_CAMPO.find((t) => t.valor === campo.tipo_campo)?.etiqueta ?? campo.tipo_campo}
                </p>
              </div>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => alternarEstado(campo)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  campo.estado ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
                }`}
                title={campo.estado ? 'Clic para desactivar' : 'Clic para activar'}
              >
                {campo.estado ? 'Activo' : 'Inactivo'}
              </button>
              <button
                type="button"
                className="text-sm font-medium text-azul-institucional hover:underline"
                onClick={() => setVista({ modo: 'editar', campo })}
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button onClick={() => setVista({ modo: 'editar', campo: null })}>
          <Plus size={14} /> Agregar campo
        </Button>

        {otrosTipos.length > 0 && (
          <div className="flex gap-2">
            <select className={CLASE_INPUT} value={origenCopia} onChange={(e) => setOrigenCopia(e.target.value)}>
              <option value="">Copiar campos de otro tipo…</option>
              {otrosTipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            <Button variante="secundario" onClick={copiar} disabled={!origenCopia || ocupado}>
              <Copy size={14} /> Copiar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/** El formulario tal como lo verá el solicitante: solo campos activos, en orden. No envía nada. */
function VistaPrevia({ campos, nombresGenerales }: { campos: CampoFormulario[]; nombresGenerales: string }) {
  const definiciones = normalizarCampos(campos.filter((c) => c.estado))
  const [respuestas, setRespuestas] = useState<Respuestas>(() => respuestasIniciales(definiciones))
  const [mostrarErrores, setMostrarErrores] = useState(false)

  if (definiciones.length === 0) {
    return <p className="text-sm text-tinta-suave">No hay campos activos: el formulario solo tendrá las generalidades.</p>
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-azul-niebla/30 p-3 text-xs text-tinta-suave">
        Vista previa: arriba de estos campos el solicitante también llena {nombresGenerales}.
      </p>
      <FormularioDinamico campos={definiciones} respuestas={respuestas} onCambiar={setRespuestas} mostrarErrores={mostrarErrores} />
      <div className="flex justify-end">
        <Button variante="secundario" onClick={() => setMostrarErrores(true)}>
          Probar validación
        </Button>
      </div>
    </div>
  )
}
