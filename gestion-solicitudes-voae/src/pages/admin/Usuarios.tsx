import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, TriangleAlert, X } from 'lucide-react'
import { listarUsuarios, listarRoles, actualizarUsuario, asignarRol, revocarRol, type UsuarioAdmin } from '../../data/usuarios'
import { listarAreas } from '../../data/catalogos'
import { mensajeError } from '../../lib/errors'
import { CrearUsuarioModal } from '../../components/CrearUsuarioModal'
import { Button } from '../../components/ui/Button'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { SkeletonLista } from '../../components/ui/Skeleton'

/** Acción destructiva que espera a que el administrador la confirme en el diálogo. */
type Confirmacion =
  | { tipo: 'inhabilitar'; usuario: UsuarioAdmin }
  | { tipo: 'quitar-rol'; usuario: UsuarioAdmin; rol: { id: number; nombre: string } }

export function AdminUsuariosPage() {
  const queryClient = useQueryClient()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [soloIncompletos, setSoloIncompletos] = useState(false)

  const { data: usuarios = [], isLoading } = useQuery({ queryKey: ['admin', 'usuarios'], queryFn: listarUsuarios })
  const { data: areas = [] } = useQuery({ queryKey: ['catalogos', 'areas'], queryFn: listarAreas })
  const { data: roles = [] } = useQuery({ queryKey: ['admin', 'roles'], queryFn: listarRoles })

  function datosIncompletos(usuario: UsuarioAdmin): boolean {
    return !usuario.primer_apellido?.trim() || !usuario.segundo_apellido?.trim()
  }

  const usuariosFiltrados = useMemo(
    () => (soloIncompletos ? usuarios.filter(datosIncompletos) : usuarios),
    [usuarios, soloIncompletos],
  )

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'usuarios'] })
  }

  async function manejarCambiarArea(usuarioId: number, areaId: number) {
    try {
      await actualizarUsuario(usuarioId, { area_id: areaId })
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo cambiar el área.'))
    }
  }

  async function manejarEstado(usuarioId: number, estado: boolean) {
    try {
      await actualizarUsuario(usuarioId, { estado })
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo actualizar el estado.'))
    }
  }

  async function manejarAsignarRol(usuarioId: number, rolId: number) {
    try {
      await asignarRol(usuarioId, rolId)
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo asignar el rol.'))
    }
  }

  async function manejarRevocarRol(usuarioId: number, rolId: number) {
    try {
      await revocarRol(usuarioId, rolId)
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo revocar el rol.'))
    }
  }

  async function manejarConfirmar() {
    if (!confirmacion) return
    setConfirmando(true)
    if (confirmacion.tipo === 'inhabilitar') {
      await manejarEstado(confirmacion.usuario.id, false)
    } else {
      await manejarRevocarRol(confirmacion.usuario.id, confirmacion.rol.id)
    }
    setConfirmando(false)
    setConfirmacion(null)
  }

  function cerrarConfirmacion() {
    if (!confirmando) setConfirmacion(null)
  }

  if (isLoading) return <SkeletonLista filas={5} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-azul-noche">Usuarios</h1>
          <p className="text-sm text-tinta-suave">Administra áreas, roles y el estado de las cuentas.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-tinta-suave">
            <input type="checkbox" checked={soloIncompletos} onChange={(e) => setSoloIncompletos(e.target.checked)} />
            Datos incompletos
          </label>
          <Button onClick={() => setModalAbierto(true)}>
            <Plus size={16} /> Crear usuario
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-azul-niebla bg-white">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
            <tr>
              <th className="px-4 py-2">Nombre completo</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Área</th>
              <th className="px-4 py-2">Roles</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-azul-niebla/60">
            {usuariosFiltrados.map((usuario) => (
              <tr key={usuario.id}>
                <td className="px-4 py-2 font-medium text-tinta">
                  <div className="flex items-center gap-1.5">
                    {usuario.nombre_completo}
                    {datosIncompletos(usuario) && (
                      <span title="Faltan apellidos">
                        <TriangleAlert size={14} className="text-ambar" aria-label="Faltan apellidos" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-tinta-suave">{usuario.correo}</td>
                <td className="px-4 py-2">
                  <select
                    className={`${CLASE_INPUT} w-auto`}
                    value={usuario.area_id ?? ''}
                    onChange={(e) => manejarCambiarArea(usuario.id, Number(e.target.value))}
                  >
                    <option value="" disabled>
                      Sin área
                    </option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {usuario.roles.length === 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-coral-bruma px-2 py-0.5 text-xs text-coral">
                        Sin rol
                      </span>
                    )}
                    {usuario.roles.map((rol) => (
                      <span
                        key={rol.id}
                        className="inline-flex items-center gap-1 rounded-full bg-azul-niebla px-2 py-0.5 text-xs text-azul-institucional"
                      >
                        {rol.nombre}
                        <button
                          type="button"
                          onClick={() => setConfirmacion({ tipo: 'quitar-rol', usuario, rol })}
                          aria-label={`Revocar ${rol.nombre}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <select
                      className="rounded-full border border-dashed border-azul-institucional px-2 py-0.5 text-xs text-azul-institucional"
                      value=""
                      onChange={(e) => e.target.value && manejarAsignarRol(usuario.id, Number(e.target.value))}
                    >
                      <option value="">+ rol</option>
                      {roles
                        .filter((rol) => !usuario.roles.some((r) => r.id === rol.id))
                        .map((rol) => {
                          const necesitaDisenador = rol.nombre === 'Asignador' && !usuario.roles.some((r) => r.nombre === 'Diseñador')
                          return (
                            <option
                              key={rol.id}
                              value={rol.id}
                              disabled={necesitaDisenador}
                              title={necesitaDisenador ? 'Primero asigna el rol Diseñador' : undefined}
                            >
                              {rol.nombre}
                              {necesitaDisenador ? ' (requiere Diseñador)' : ''}
                            </option>
                          )
                        })}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => (usuario.estado ? setConfirmacion({ tipo: 'inhabilitar', usuario }) : manejarEstado(usuario.id, true))}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      usuario.estado ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
                    }`}
                  >
                    {usuario.estado ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        abierto={confirmacion !== null}
        onCerrar={cerrarConfirmacion}
        titulo={confirmacion?.tipo === 'quitar-rol' ? 'Quitar rol' : 'Inhabilitar usuario'}
      >
        {confirmacion?.tipo === 'inhabilitar' && (
          <p className="text-sm text-tinta-suave">
            ¿Estás seguro de que deseas inhabilitar a <strong className="text-tinta">{confirmacion.usuario.nombre_completo}</strong>?
            Su cuenta quedará inactiva hasta que la vuelvas a activar.
          </p>
        )}
        {confirmacion?.tipo === 'quitar-rol' && (
          <p className="text-sm text-tinta-suave">
            ¿Estás seguro de que deseas quitar el rol <strong className="text-tinta">{confirmacion.rol.nombre}</strong> a{' '}
            <strong className="text-tinta">{confirmacion.usuario.nombre_completo}</strong>? Su cuenta seguirá activa, pero perderá
            el acceso que le da ese rol.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variante="secundario" onClick={cerrarConfirmacion} disabled={confirmando}>
            Cancelar
          </Button>
          <Button variante="peligro" cargando={confirmando} onClick={() => void manejarConfirmar()}>
            {confirmacion?.tipo === 'quitar-rol' ? 'Quitar rol' : 'Inhabilitar'}
          </Button>
        </div>
      </Modal>

      <CrearUsuarioModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onCreado={invalidar}
        areas={areas}
        roles={roles}
      />
    </div>
  )
}
