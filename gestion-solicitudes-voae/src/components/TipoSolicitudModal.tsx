import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { crearTipoSolicitud, actualizarTipoSolicitud, type TipoSolicitud } from '../data/catalogos'
import { mensajeError } from '../lib/errors'
import type { FormularioCodigo } from '../types/domain'

const EXPLICACION_FORMULARIO: Record<FormularioCodigo, string> = {
  ARTE: 'Arte para redes sociales o piezas gráficas (título, fecha/hora, lugar, modalidad…).',
  VIDEO: 'Video promocional (objetivo, fecha de entrega, encargado…).',
  DIRCOM: 'Solicitud de diseño a DIRCOM (tipo de material, fecha necesaria…).',
  PROTOCOLO: 'Protocolo para eventos de VOAE (actividad, lugar, invitados…).',
  GENERICO: 'Formulario genérico (título, descripción, fecha requerida…).',
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
  const [diasEstimados, setDiasEstimados] = useState(tipo?.dias_estimados ?? 1)
  const [diasHabiles, setDiasHabiles] = useState(tipo?.dias_habiles ?? true)
  const [formulario, setFormulario] = useState<FormularioCodigo>((tipo?.formulario as FormularioCodigo) ?? 'GENERICO')
  const [descripcion, setDescripcion] = useState(tipo?.descripcion ?? '')
  const [estado, setEstado] = useState(tipo?.estado ?? true)
  const [enviando, setEnviando] = useState(false)

  async function manejarGuardar() {
    if (!nombre.trim() || diasEstimados <= 0) {
      toast.error('Completa el nombre y los días estimados (mayor a 0).')
      return
    }
    setEnviando(true)
    try {
      const payload = {
        nombre: nombre.trim(),
        dias_estimados: diasEstimados,
        dias_habiles: diasHabiles,
        formulario,
        descripcion: descripcion.trim() || null,
        estado,
      }
      if (tipo) {
        await actualizarTipoSolicitud(tipo.id, payload)
      } else {
        await crearTipoSolicitud(payload)
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
        <Campo etiqueta="Días estimados">
          <input
            type="number"
            min={1}
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

      <Campo etiqueta="Formulario" ayuda={EXPLICACION_FORMULARIO[formulario]}>
        <select className={CLASE_INPUT} value={formulario} onChange={(e) => setFormulario(e.target.value as FormularioCodigo)}>
          <option value="ARTE">Arte</option>
          <option value="VIDEO">Video</option>
          <option value="DIRCOM">DIRCOM</option>
          <option value="PROTOCOLO">Protocolo</option>
          <option value="GENERICO">Genérico</option>
        </select>
      </Campo>

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
