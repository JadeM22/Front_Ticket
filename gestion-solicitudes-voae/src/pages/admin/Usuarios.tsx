import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { listarUsuarios, listarRoles, actualizarUsuario, asignarRol, revocarRol } from '../../data/usuarios'
import { listarAreas } from '../../data/catalogos'
import { mensajeError } from '../../lib/errors'
import { CrearUsuarioModal } from '../../components/CrearUsuarioModal'
import { Button } from '../../components/ui/Button'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { SkeletonLista } from '../../components/ui/Skeleton'

export function AdminUsuariosPage() {
  const queryClient = useQueryClient()
  const [modalAbierto, setModalAbierto] = useState(false)

  const { data: usuarios = [], isLoading } = useQuery({ queryKey: ['admin', 'usuarios'], queryFn: listarUsuarios })
  const { data: areas = [] } = useQuery({ queryKey: ['catalogos', 'areas'], queryFn: listarAreas })
  const { data: roles = [] } = useQuery({ queryKey: ['admin', 'roles'], queryFn: listarRoles })

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

  if (isLoading) return <SkeletonLista filas={5} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-azul-noche">Usuarios</h1>
          <p className="text-sm text-tinta-suave">Administra áreas, roles y el estado de las cuentas.</p>
        </div>
        <Button onClick={() => setModalAbierto(true)}>
          <Plus size={16} /> Crear usuario
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-azul-niebla bg-white">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Área</th>
              <th className="px-4 py-2">Roles</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-azul-niebla/60">
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td className="px-4 py-2 font-medium text-tinta">{usuario.nombre}</td>
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
                    {usuario.roles.map((rol) => (
                      <span
                        key={rol.id}
                        className="inline-flex items-center gap-1 rounded-full bg-azul-niebla px-2 py-0.5 text-xs text-azul-institucional"
                      >
                        {rol.nombre}
                        <button
                          type="button"
                          onClick={() => manejarRevocarRol(usuario.id, rol.id)}
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
                        .map((rol) => (
                          <option key={rol.id} value={rol.id}>
                            {rol.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => manejarEstado(usuario.id, !usuario.estado)}
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
