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

/** `Usuarios.nombre` es una sola columna VARCHAR(100): las tres partes se envían unidas. */
const LARGO_MAXIMO_NOMBRE = 100

function limpiarEspacios(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ')
}

export function CrearUsuarioModal({ abierto, onCerrar, onCreado, areas, roles }: CrearUsuarioModalProps) {
  const [correo, setCorreo] = useState('')
  const [nombres, setNombres] = useState('')
  const [primerApellido, setPrimerApellido] = useState('')
  const [segundoApellido, setSegundoApellido] = useState('')
  const [areaId, setAreaId] = useState<number | ''>('')
  const [rolId, setRolId] = useState<number | ''>('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ password_temporal: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  function cerrarYLimpiar() {
    setCorreo('')
    setNombres('')
    setPrimerApellido('')
    setSegundoApellido('')
    setAreaId('')
    setRolId('')
    setResultado(null)
    setCopiado(false)
    onCerrar()
  }

  async function manejarEnviar() {
    if (!nombres.trim()) {
      toast.error('Escribe los nombres del usuario.')
      return
    }
    if (!primerApellido.trim()) {
      toast.error('Escribe el primer apellido del usuario.')
      return
    }
    const nombre = [nombres, primerApellido, segundoApellido].map(limpiarEspacios).filter(Boolean).join(' ')
    if (nombre.length > LARGO_MAXIMO_NOMBRE) {
      toast.error(`El nombre completo no puede pasar de ${LARGO_MAXIMO_NOMBRE} caracteres.`)
      return
    }
    if (!correo.trim()) {
      toast.error('Escribe el correo institucional.')
      return
    }
    if (!areaId || !rolId) {
      toast.error('Selecciona un área y un rol.')
      return
    }
    setEnviando(true)
    try {
      const resultadoCreacion = await crearUsuario({ correo: correo.trim(), nombre, area_id: areaId, rol_id: rolId })
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
          <Campo etiqueta="Nombres">
            <input className={CLASE_INPUT} required value={nombres} onChange={(e) => setNombres(e.target.value)} />
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Primer apellido">
              <input
                className={CLASE_INPUT}
                required
                value={primerApellido}
                onChange={(e) => setPrimerApellido(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Segundo apellido (opcional)">
              <input className={CLASE_INPUT} value={segundoApellido} onChange={(e) => setSegundoApellido(e.target.value)} />
            </Campo>
          </div>
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
