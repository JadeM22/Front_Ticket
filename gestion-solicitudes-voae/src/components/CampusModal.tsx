import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { actualizarCampus, crearCampus, type Campus } from '../data/catalogos'
import { mensajeError } from '../lib/errors'

interface CampusModalProps {
  abierto: boolean
  onCerrar: () => void
  onGuardado: () => void
  /** `null` = crear. */
  campus: Campus | null
  /** Para poner un campus nuevo al final de la lista. */
  ordenSiguiente: number
}

export function CampusModal({ abierto, onCerrar, onGuardado, campus, ordenSiguiente }: CampusModalProps) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={campus ? 'Editar campus' : 'Crear campus'}>
      {abierto && (
        <FormularioCampus campus={campus} ordenSiguiente={ordenSiguiente} onCerrar={onCerrar} onGuardado={onGuardado} />
      )}
    </Modal>
  )
}

function FormularioCampus({
  campus,
  ordenSiguiente,
  onCerrar,
  onGuardado,
}: Omit<CampusModalProps, 'abierto'>) {
  const [nombre, setNombre] = useState(campus?.nombre ?? '')
  const [siglas, setSiglas] = useState(campus?.siglas ?? '')
  const [enviando, setEnviando] = useState(false)

  async function manejarGuardar() {
    if (!nombre.trim()) {
      toast.error('Escribe el nombre del campus.')
      return
    }
    setEnviando(true)
    try {
      const payload = { nombre: nombre.trim(), siglas: siglas.trim() || null }
      if (campus) await actualizarCampus(campus.id, payload)
      else await crearCampus({ ...payload, orden: ordenSiguiente, estado: true })
      toast.success(campus ? 'Campus actualizado.' : 'Campus creado.')
      onGuardado()
      onCerrar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo guardar el campus.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Campo etiqueta="Nombre">
        <input className={CLASE_INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>
      <Campo etiqueta="Siglas (opcional)">
        <input className={CLASE_INPUT} value={siglas} onChange={(e) => setSiglas(e.target.value)} />
      </Campo>
      <Button className="w-full" cargando={enviando} onClick={manejarGuardar}>
        Guardar
      </Button>
    </div>
  )
}
