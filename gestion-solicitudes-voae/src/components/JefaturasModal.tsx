import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Modal } from './ui/Modal'
import { SkeletonLista } from './ui/Skeleton'
import { agregarJefatura, listarJefaturasDeUsuario, quitarJefatura, type UsuarioAdmin } from '../data/usuarios'
import type { Area } from '../data/catalogos'
import { mensajeError } from '../lib/errors'

interface JefaturasModalProps {
  /** `null` = cerrado. */
  usuario: UsuarioAdmin | null
  /** Coordinaciones activas, para ofrecer como casillas (se excluye la propia del usuario). */
  coordinaciones: Area[]
  onCerrar: () => void
}

/**
 * Coordinaciones adicionales que dirige un Jefe de Área, aparte de la suya (Parte 39): cada casilla
 * inserta o borra de una vez en `Seguridad.JefaturasArea`, sin un botón "Guardar" aparte.
 */
export function JefaturasModal({ usuario, coordinaciones, onCerrar }: JefaturasModalProps) {
  const queryClient = useQueryClient()
  const clave = ['admin', 'jefaturas', usuario?.id]
  const { data: jefaturas = [], isLoading } = useQuery({
    queryKey: clave,
    queryFn: () => listarJefaturasDeUsuario(usuario!.id),
    enabled: usuario !== null,
  })

  const otras = coordinaciones.filter((c) => c.id !== usuario?.area_id)

  async function alternar(coordinacion: Area, marcar: boolean) {
    if (!usuario) return
    try {
      if (marcar) await agregarJefatura(usuario.id, coordinacion.id)
      else await quitarJefatura(usuario.id, coordinacion.id)
      toast.success(
        marcar ? `Ahora también es jefe de ${coordinacion.nombre}.` : `Ya no es jefe de ${coordinacion.nombre}.`,
      )
      void queryClient.invalidateQueries({ queryKey: clave })
      // La columna "Jefaturas" de la tabla de usuarios lee lo mismo.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'jefaturas-todas'] })
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo actualizar la jefatura.'))
    }
  }

  return (
    <Modal abierto={usuario !== null} onCerrar={onCerrar} titulo={`También es jefe de — ${usuario?.nombre_completo ?? ''}`}>
      <div className="space-y-3">
        <p className="text-xs text-tinta-suave">Permite que una misma persona sea jefe de varias coordinaciones.</p>
        {isLoading ? (
          <SkeletonLista filas={3} />
        ) : otras.length === 0 ? (
          <p className="text-sm text-tinta-suave">No hay otras coordinaciones activas.</p>
        ) : (
          <ul className="space-y-1.5">
            {otras.map((coordinacion) => {
              const marcada = jefaturas.some((j) => j.area_id === coordinacion.id)
              return (
                <li key={coordinacion.id}>
                  <label className="flex items-center gap-2 text-sm text-tinta">
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={(e) => alternar(coordinacion, e.target.checked)}
                    />
                    {coordinacion.nombre}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
