import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { crearFeriado, actualizarFeriado, type Feriado } from '../data/catalogos'
import { mensajeError } from '../lib/errors'

interface FeriadoModalProps {
  abierto: boolean
  onCerrar: () => void
  onGuardado: () => void
  feriado: Feriado | null
}

export function FeriadoModal({ abierto, onCerrar, onGuardado, feriado }: FeriadoModalProps) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={feriado ? 'Editar feriado' : 'Crear feriado'}>
      {abierto && <FormularioFeriado feriado={feriado} onCerrar={onCerrar} onGuardado={onGuardado} />}
    </Modal>
  )
}

/** Se monta de cero cada vez que el modal se abre, así que el estado inicial siempre parte de `feriado`. */
function FormularioFeriado({
  feriado,
  onCerrar,
  onGuardado,
}: {
  feriado: Feriado | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = useState(feriado?.nombre ?? '')
  const [fechaInicio, setFechaInicio] = useState(feriado?.fecha_inicio ?? '')
  const [fechaFin, setFechaFin] = useState(feriado?.fecha_fin ?? '')
  const [estado, setEstado] = useState(feriado?.estado ?? true)
  const [enviando, setEnviando] = useState(false)

  async function manejarGuardar() {
    if (!nombre.trim() || !fechaInicio || !fechaFin) {
      toast.error('Completa el nombre y las fechas.')
      return
    }
    if (fechaFin < fechaInicio) {
      toast.error('La fecha de fin debe ser igual o posterior a la de inicio.')
      return
    }
    setEnviando(true)
    try {
      const payload = { nombre: nombre.trim(), fecha_inicio: fechaInicio, fecha_fin: fechaFin, estado }
      if (feriado) {
        await actualizarFeriado(feriado.id, payload)
      } else {
        await crearFeriado(payload)
      }
      toast.success(feriado ? 'Feriado actualizado.' : 'Feriado creado.')
      onGuardado()
      onCerrar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo guardar el feriado.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Campo etiqueta="Nombre" ayuda="Ej. Semana Morazánica, Semana Santa">
        <input className={CLASE_INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      <div className="grid grid-cols-2 gap-4">
        <Campo etiqueta="Desde">
          <input type="date" className={CLASE_INPUT} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </Campo>
        <Campo etiqueta="Hasta">
          <input type="date" className={CLASE_INPUT} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </Campo>
      </div>

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
