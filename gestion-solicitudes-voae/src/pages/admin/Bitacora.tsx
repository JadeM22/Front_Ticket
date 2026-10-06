import { useQuery } from '@tanstack/react-query'
import { listarBitacora } from '../../data/bitacora'
import { formatFechaHora } from '../../lib/date'
import { useNombresUsuarios } from '../../hooks/useNombresUsuarios'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'

export function AdminBitacoraPage() {
  const { data: entradas = [], isLoading } = useQuery({ queryKey: ['admin', 'bitacora'], queryFn: listarBitacora })
  const { nombreDe } = useNombresUsuarios()

  if (isLoading) return <SkeletonLista filas={6} />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Bitácora de roles</h1>
        <p className="text-sm text-tinta-suave">Historial de asignaciones y revocaciones de roles.</p>
      </div>

      {entradas.length === 0 ? (
        <EmptyState titulo="Sin movimientos registrados" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-azul-niebla bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
              <tr>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Acción</th>
                <th className="px-4 py-2">Realizado por</th>
                <th className="px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-azul-niebla/60">
              {entradas.map((entrada) => (
                <tr key={entrada.id}>
                  <td className="px-4 py-2 text-tinta">{entrada.usuario_nombre ?? `#${entrada.usuario_id}`}</td>
                  <td className="px-4 py-2 text-tinta-suave">{entrada.rol_nombre ?? `#${entrada.rol_id}`}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        entrada.accion === 'ASIGNADO' ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
                      }`}
                    >
                      {entrada.accion}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-tinta-suave">{nombreDe(entrada.usuario_registro)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-tinta-suave">{formatFechaHora(entrada.fecha_registro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
