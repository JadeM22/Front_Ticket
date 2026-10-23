import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { crearTipoSolicitud, actualizarTipoSolicitud, type TipoSolicitud } from '../data/catalogos'
import { mensajeError } from '../lib/errors'
import { ETIQUETA_FLUJO, type Flujo } from '../types/domain'

const EXPLICACION_FLUJO: Record<Flujo, string> = {
  DISENO: 'El equipo de diseño toma la solicitud, entrega y el Jefe de Área dictamina.',
  APROBACION_IA: 'El solicitante sube su afiche y un Aprobador IA lo aprueba o rechaza (hasta 5 intentos).',
}

interface TipoSolicitudModalProps {
  abierto: boolean
  onCerrar: () => void
  onGuardado: () => void
  tipo: TipoSolicitud | null
}

export function TipoSolicitudModal({ abierto, onCerrar, onGuardado, tipo }: TipoSolicitudModalProps) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={tipo ? 'Editar tipo de solicitud' : 'Crear tipo de solicitud'}>
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
  const [diasEstimados, setDiasEstimados] = useState(tipo?.dias_estimados ?? 10)
  const [diasHabiles, setDiasHabiles] = useState(tipo?.dias_habiles ?? true)
  // El flujo solo se elige al crear: cambiarlo después dejaría tickets abiertos en un flujo que ya no es el suyo.
  const [flujo, setFlujo] = useState<Flujo>((tipo?.flujo as Flujo | undefined) ?? 'DISENO')
  const [descripcion, setDescripcion] = useState(tipo?.descripcion ?? '')
  const [estado, setEstado] = useState(tipo?.estado ?? true)
  const [enviando, setEnviando] = useState(false)

  async function manejarGuardar() {
    if (!nombre.trim() || diasEstimados < 10) {
      toast.error('Completa el nombre; los días estimados deben ser al menos 10.')
      return
    }
    setEnviando(true)
    try {
      const payload = {
        nombre: nombre.trim(),
        dias_estimados: diasEstimados,
        dias_habiles: diasHabiles,
        descripcion: descripcion.trim() || null,
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
          <input
            type="number"
            min={10}
            className={CLASE_INPUT}
            value={diasEstimados}
            onChange={(e) => setDiasEstimados(Number(e.target.value))}
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
            <option value="DISENO">{ETIQUETA_FLUJO.DISENO}</option>
            <option value="APROBACION_IA">{ETIQUETA_FLUJO.APROBACION_IA}</option>
          </select>
        </Campo>
      )}

      <Campo etiqueta="Descripción (nota al elegir el tipo)">
        <textarea className={CLASE_INPUT} rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>

      <label className="flex items-center gap-2 text-sm text-tinta">
        <input type="checkbox" checked={estado} onChange={(e) => setEstado(e.target.checked)} />
        Activo
      </label>

      <Button className="w-full" cargando={enviando} onClick={manejarGuardar}>
        Guardar
      </Button>
    </div>
  )
}
