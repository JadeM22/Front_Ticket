import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { actualizarArea, crearArea, type Area } from '../data/catalogos'
import { mensajeError } from '../lib/errors'

const REGEX_PREFIJO = /^[A-Z]{2,6}$/

interface AreaModalProps {
  abierto: boolean
  onCerrar: () => void
  onGuardado: () => void
  /** `null` = crear. */
  area: Area | null
  /** Fijo por la sección desde la que se abre: "Áreas" siempre envía AREA, "Coordinaciones" COORDINACION. */
  tipo: 'AREA' | 'COORDINACION'
}

export function AreaModal({ abierto, onCerrar, onGuardado, area, tipo }: AreaModalProps) {
  const etiquetaTipo = tipo === 'AREA' ? 'área' : 'coordinación'
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={area ? `Editar ${etiquetaTipo}` : `Crear ${etiquetaTipo}`}>
      {abierto && <Formulario area={area} tipo={tipo} etiquetaTipo={etiquetaTipo} onCerrar={onCerrar} onGuardado={onGuardado} />}
    </Modal>
  )
}

function Formulario({
  area,
  tipo,
  etiquetaTipo,
  onCerrar,
  onGuardado,
}: Omit<AreaModalProps, 'abierto'> & { etiquetaTipo: string }) {
  const [nombre, setNombre] = useState(area?.nombre ?? '')
  const [prefijo, setPrefijo] = useState(area?.prefijo ?? '')
  const [descripcion, setDescripcion] = useState(area?.descripcion ?? '')
  const [enviando, setEnviando] = useState(false)

  async function manejarGuardar() {
    if (!nombre.trim()) {
      toast.error(`Escribe el nombre de la ${etiquetaTipo}.`)
      return
    }
    if (!area && !REGEX_PREFIJO.test(prefijo)) {
      toast.error('El prefijo debe tener de 2 a 6 letras mayúsculas.')
      return
    }
    setEnviando(true)
    try {
      if (area) {
        await actualizarArea(area.id, { nombre: nombre.trim(), descripcion: descripcion.trim() || null })
      } else {
        await crearArea({ nombre: nombre.trim(), prefijo, descripcion: descripcion.trim() || null, tipo, estado: true })
      }
      toast.success(area ? `${etiquetaTipo[0].toUpperCase()}${etiquetaTipo.slice(1)} actualizada.` : `${etiquetaTipo[0].toUpperCase()}${etiquetaTipo.slice(1)} creada.`)
      onGuardado()
      onCerrar()
    } catch (error) {
      toast.error(await mensajeError(error, `No se pudo guardar la ${etiquetaTipo}.`))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Campo etiqueta="Nombre">
        <input className={CLASE_INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      {area ? (
        <div>
          <p className="mb-1 text-sm font-medium text-tinta">Prefijo</p>
          <p className="rounded-lg bg-azul-niebla/50 px-3 py-2 font-mono text-sm text-tinta-suave">{area.prefijo}</p>
          <p className="mt-1 text-xs text-tinta-suave">No se puede cambiar: se usa en los códigos de los tickets.</p>
        </div>
      ) : (
        <Campo etiqueta="Prefijo" ayuda="De 2 a 6 letras mayúsculas. No se podrá cambiar después.">
          <input
            className={`${CLASE_INPUT} font-mono uppercase`}
            maxLength={6}
            value={prefijo}
            onChange={(e) => setPrefijo(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          />
        </Campo>
      )}

      <Campo etiqueta="Descripción (opcional)">
        <textarea className={CLASE_INPUT} rows={2} value={descripcion ?? ''} onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>

      <Button className="w-full" cargando={enviando} onClick={manejarGuardar}>
        Guardar
      </Button>
    </div>
  )
}
