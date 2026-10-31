import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { InputNumero } from './form/InputNumero'
import { errorRangoNumero } from '../lib/inputNumero'
import { crearTipoSolicitud, actualizarTipoSolicitud, type TipoSolicitud } from '../data/catalogos'
import { mensajeError } from '../lib/errors'
import { etiquetasGenerales } from '../lib/validacionFormularios'
import type { Json } from '../types/database'
import {
  CATEGORIAS_TIPO,
  ETIQUETA_FLUJO,
  type CategoriaTipo,
  type EtiquetasGenerales,
  type Flujo,
} from '../types/domain'

const EXPLICACION_FLUJO: Record<Flujo, string> = {
  DISENO: 'El equipo de diseño toma la solicitud, entrega y el Jefe de Área dictamina.',
  APROBACION: 'El solicitante sube un archivo y se aprueba o deniega (hasta 5 intentos).',
  CONFIRMACION: 'La solicitud se confirma o rechaza una sola vez, sin diseño (p. ej. Cobertura de evento).',
}

/** Texto de cada opción del selector de flujo (el nombre corto sigue siendo `ETIQUETA_FLUJO`). */
const OPCION_FLUJO: Record<Flujo, string> = {
  DISENO: ETIQUETA_FLUJO.DISENO,
  APROBACION: 'Aprobación (aprobar o denegar un archivo)',
  CONFIRMACION: 'Confirmación (confirmar o rechazar)',
}

const DIAS_MINIMOS = 10

const NOMBRES_POR_DEFECTO = etiquetasGenerales(null)

const GENERALIDADES: { clave: keyof EtiquetasGenerales; nombre: string }[] = [
  { clave: 'titulo', nombre: 'Título' },
  { clave: 'fecha_evento', nombre: 'Fecha del evento' },
  { clave: 'dirigido_a', nombre: 'Dirigido a' },
  { clave: 'alcance', nombre: 'Alcance' },
]

/** Solo las claves con texto: la base admite únicamente estas cuatro y vacío = nombre de siempre. */
function etiquetasIniciales(json: Json | undefined): Record<keyof EtiquetasGenerales, string> {
  const crudo = json && typeof json === 'object' && !Array.isArray(json) ? json : {}
  const resultado = { titulo: '', fecha_evento: '', dirigido_a: '', alcance: '' }
  for (const { clave } of GENERALIDADES) {
    const valor = (crudo as Record<string, Json | undefined>)[clave]
    if (typeof valor === 'string') resultado[clave] = valor
  }
  return resultado
}

interface TipoSolicitudModalProps {
  abierto: boolean
  onCerrar: () => void
  onGuardado: () => void
  tipo: TipoSolicitud | null
}

export function TipoSolicitudModal({ abierto, onCerrar, onGuardado, tipo }: TipoSolicitudModalProps) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={tipo ? 'Editar tipo de solicitud' : 'Crear tipo de solicitud'}
      ancho="amplio"
    >
      {abierto && <FormularioTipoSolicitud tipo={tipo} onCerrar={onCerrar} onGuardado={onGuardado} />}
    </Modal>
  )
}

/** Se monta de cero cada vez que el modal se abre, así que el estado inicial siempre parte de `tipo`. */
function FormularioTipoSolicitud({
  tipo,
  onCerrar,
  onGuardado,
}: {
  tipo: TipoSolicitud | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = useState(tipo?.nombre ?? '')
  // Como texto (igual que en EditorCampo): un campo vaciado se ve vacío, no "0" (E-04).
  const [diasEstimados, setDiasEstimados] = useState(String(tipo?.dias_estimados ?? 10))
  const [diasHabiles, setDiasHabiles] = useState(tipo?.dias_habiles ?? true)
  // El flujo solo se elige al crear: cambiarlo después dejaría tickets abiertos en un flujo que ya no es el suyo.
  const [flujo, setFlujo] = useState<Flujo>((tipo?.flujo as Flujo | undefined) ?? 'DISENO')
  const [descripcion, setDescripcion] = useState(tipo?.descripcion ?? '')
  const [categoria, setCategoria] = useState<CategoriaTipo>((tipo?.categoria as CategoriaTipo | undefined) ?? 'OTROS')
  const [etiquetas, setEtiquetas] = useState(() => etiquetasIniciales(tipo?.etiquetas_generales))
  const [aviso, setAviso] = useState(tipo?.aviso ?? '')
  const [estado, setEstado] = useState(tipo?.estado ?? true)
  const [enviando, setEnviando] = useState(false)

  const diasInvalidos = diasEstimados.trim() === '' || errorRangoNumero(diasEstimados, DIAS_MINIMOS) !== null

  async function manejarGuardar() {
    if (!nombre.trim() || diasInvalidos) {
      toast.error('Completa el nombre; los días estimados deben ser al menos 10.')
      return
    }
    setEnviando(true)
    try {
      const etiquetasGuardar: Record<string, string> = {}
      for (const { clave } of GENERALIDADES) {
        if (etiquetas[clave].trim()) etiquetasGuardar[clave] = etiquetas[clave].trim()
      }
      const payload = {
        nombre: nombre.trim(),
        dias_estimados: Number(diasEstimados),
        dias_habiles: diasHabiles,
        descripcion: descripcion.trim() || null,
        categoria,
        etiquetas_generales: etiquetasGuardar,
        aviso: aviso.trim() || null,
        estado,
      }
      if (tipo) {
        await actualizarTipoSolicitud(tipo.id, payload)
      } else {
        await crearTipoSolicitud({ ...payload, flujo })
      }
      toast.success(tipo ? 'Tipo de solicitud actualizado.' : 'Tipo de solicitud creado.')
      onGuardado()
      onCerrar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo guardar el tipo de solicitud.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Campo etiqueta="Nombre">
        <input className={CLASE_INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      <div className="grid grid-cols-2 gap-4">
        <Campo etiqueta="Días estimados" ayuda="Mínimo 10 días hábiles">
          <InputNumero
            min={DIAS_MINIMOS}
            className={CLASE_INPUT}
            value={diasEstimados}
            onChange={setDiasEstimados}
          />
        </Campo>
        <Campo etiqueta="¿Días hábiles?">
          <select className={CLASE_INPUT} value={diasHabiles ? '1' : '0'} onChange={(e) => setDiasHabiles(e.target.value === '1')}>
            <option value="1">Sí (lun-vie, sin feriados)</option>
            <option value="0">No (días corridos)</option>
          </select>
        </Campo>
      </div>

      {tipo ? (
        <div>
          <p className="mb-1 text-sm font-medium text-tinta">Flujo</p>
          <p className="rounded-lg bg-azul-niebla/50 px-3 py-2 text-sm text-tinta">{ETIQUETA_FLUJO[flujo] ?? tipo.flujo}</p>
          <p className="mt-1 text-xs text-tinta-suave">El flujo no se puede cambiar después de crear el tipo.</p>
        </div>
      ) : (
        <Campo etiqueta="Flujo" ayuda={`${EXPLICACION_FLUJO[flujo]} No se puede cambiar después.`}>
          <select className={CLASE_INPUT} value={flujo} onChange={(e) => setFlujo(e.target.value as Flujo)}>
            {(Object.keys(ETIQUETA_FLUJO) as Flujo[]).map((valor) => (
              <option key={valor} value={valor}>
                {OPCION_FLUJO[valor]}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <Campo etiqueta="Categoría" ayuda="Solo agrupa las tarjetas al elegir el tipo en &quot;Nueva solicitud&quot;.">
        <select className={CLASE_INPUT} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaTipo)}>
          {CATEGORIAS_TIPO.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Descripción (nota al elegir el tipo)">
        <textarea className={CLASE_INPUT} rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>

      <Campo etiqueta="Aviso destacado (opcional)" ayuda="Se muestra resaltado arriba del formulario de este tipo.">
        <textarea className={CLASE_INPUT} rows={2} value={aviso} onChange={(e) => setAviso(e.target.value)} />
      </Campo>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-tinta">Nombres visibles de las generalidades</legend>
        <p className="mb-2 text-xs text-tinta-suave">Déjalos vacíos para usar el nombre de siempre.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GENERALIDADES.map(({ clave, nombre: nombreGeneralidad }) => (
            <Campo key={clave} etiqueta={nombreGeneralidad}>
              <input
                className={CLASE_INPUT}
                placeholder={NOMBRES_POR_DEFECTO[clave]}
                value={etiquetas[clave]}
                onChange={(e) => setEtiquetas({ ...etiquetas, [clave]: e.target.value })}
              />
            </Campo>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-tinta">
        <input type="checkbox" checked={estado} onChange={(e) => setEstado(e.target.checked)} />
        Activo
      </label>

      <Button className="w-full" cargando={enviando} disabled={diasInvalidos} onClick={manejarGuardar}>
        Guardar
      </Button>
    </div>
  )
}
