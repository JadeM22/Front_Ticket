import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Campo, CLASE_INPUT } from './ui/Campo'
import { crearUsuario } from '../data/usuarios'
import { mensajeError } from '../lib/errors'
import type { Area } from '../data/catalogos'
import type { Rol } from '../data/usuarios'

interface CrearUsuarioModalProps {
  abierto: boolean
  onCerrar: () => void
  onCreado: () => void
  areas: Area[]
  roles: Rol[]
}

export function CrearUsuarioModal({ abierto, onCerrar, onCreado, areas, roles }: CrearUsuarioModalProps) {
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [areaId, setAreaId] = useState<number | ''>('')
  const [rolId, setRolId] = useState<number | ''>('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ password_temporal: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  function cerrarYLimpiar() {
    setCorreo('')
    setNombre('')
    setAreaId('')
    setRolId('')
    setResultado(null)
    setCopiado(false)
    onCerrar()
  }

  async function manejarEnviar() {
    if (!nombre.trim() || !correo.trim()) {
      toast.error('Completa el nombre y el correo.')
      return
    }
    if (!areaId || !rolId) {
      toast.error('Selecciona un área y un rol.')
      return
    }
    setEnviando(true)
    try {
      const resultadoCreacion = await crearUsuario({ correo: correo.trim(), nombre: nombre.trim(), area_id: areaId, rol_id: rolId })
      setResultado(resultadoCreacion)
      onCreado()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo crear el usuario.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={cerrarYLimpiar} titulo="Crear usuario">
      {resultado ? (
        <div className="space-y-4">
          <p className="text-sm text-tinta">
            Usuario creado. Copia la contraseña temporal ahora: solo se muestra una vez.
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-azul-niebla px-3 py-2">
            <code className="flex-1 font-mono text-sm">{resultado.password_temporal}</code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(resultado.password_temporal)
                setCopiado(true)
              }}
              className="rounded-full p-1.5 text-azul-institucional hover:bg-white"
              aria-label="Copiar"
            >
              {copiado ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <Button className="w-full" onClick={cerrarYLimpiar}>
            Cerrar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Campo etiqueta="Nombre completo">
            <input className={CLASE_INPUT} required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo etiqueta="Correo institucional">
            <input
              type="email"
              className={CLASE_INPUT}
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Área">
            <select
              className={CLASE_INPUT}
              value={areaId}
              onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Selecciona un área</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Rol inicial">
            <select
              className={CLASE_INPUT}
              value={rolId}
              onChange={(e) => setRolId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Selecciona un rol</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Button className="w-full" cargando={enviando} onClick={manejarEnviar}>
            Crear usuario
          </Button>
        </div>
      )}
    </Modal>
  )
}
