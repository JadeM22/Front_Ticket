import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { listarFeriados, actualizarFeriado, type Feriado } from '../../data/catalogos'
import { mensajeError } from '../../lib/errors'
import { formatFecha } from '../../lib/date'
import { useNombresUsuarios } from '../../hooks/useNombresUsuarios'
import { FeriadoModal } from '../../components/FeriadoModal'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonLista } from '../../components/ui/Skeleton'

function cantidadDias(desde: string, hasta: string): number {
  const ms = new Date(hasta).getTime() - new Date(desde).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1
}

export function AdminFeriadosPage() {
  const queryClient = useQueryClient()
  const { nombreDe } = useNombresUsuarios()
  const [modal, setModal] = useState<{ abierto: boolean; feriado: Feriado | null }>({ abierto: false, feriado: null })

  const { data: feriados = [], isLoading } = useQuery({ queryKey: ['catalogos', 'feriados'], queryFn: listarFeriados })

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ['catalogos', 'feriados'] })
  }

  async function manejarEstado(feriado: Feriado) {
    try {
      await actualizarFeriado(feriado.id, { estado: !feriado.estado })
      invalidar()
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo actualizar el feriado.'))
    }
  }

  if (isLoading) return <SkeletonLista filas={4} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-azul-noche">Feriados</h1>
          <p className="text-sm text-tinta-suave">Rangos de días inhábiles para calcular los plazos.</p>
        </div>
        <Button onClick={() => setModal({ abierto: true, feriado: null })}>
          <Plus size={14} /> Crear feriado
        </Button>
      </div>

      <div className="rounded-lg bg-ambar-bruma p-3 text-sm text-ambar">
        Los feriados afectan solo a las solicitudes creadas después de registrarlos. Regístralos con
        anticipación.
      </div>

      {feriados.length === 0 ? (
        <EmptyState titulo="No hay feriados registrados" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Desde</th>
                  <th className="px-3 py-2">Hasta</th>
                  <th className="px-3 py-2">Días</th>
                  <th className="px-3 py-2">Activo</th>
                  <th className="px-3 py-2">Registrado por</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-azul-niebla/60">
                {feriados.map((feriado) => (
                  <tr key={feriado.id}>
                    <td className="px-3 py-2 font-medium text-tinta">{feriado.nombre}</td>
                    <td className="px-3 py-2">{formatFecha(feriado.fecha_inicio)}</td>
                    <td className="px-3 py-2">{formatFecha(feriado.fecha_fin)}</td>
                    <td className="px-3 py-2">{cantidadDias(feriado.fecha_inicio, feriado.fecha_fin)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => manejarEstado(feriado)}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          feriado.estado ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
                        }`}
                      >
                        {feriado.estado ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-tinta-suave">{nombreDe(feriado.usuario_registro)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="font-medium text-azul-institucional hover:underline"
                        onClick={() => setModal({ abierto: true, feriado })}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <FeriadoModal
        abierto={modal.abierto}
        feriado={modal.feriado}
        onCerrar={() => setModal({ abierto: false, feriado: null })}
        onGuardado={invalidar}
      />
    </div>
  )
}
