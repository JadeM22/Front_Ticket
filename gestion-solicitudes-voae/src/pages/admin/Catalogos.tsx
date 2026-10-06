import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listarAreas, listarTiposSolicitud, actualizarArea, actualizarTipoSolicitud } from '../../data/catalogos'
import { mensajeError } from '../../lib/errors'
import { Card } from '../../components/ui/Card'
import { CLASE_INPUT } from '../../components/ui/Campo'
import { SkeletonLista } from '../../components/ui/Skeleton'

export function AdminCatalogosPage() {
  const queryClient = useQueryClient()
  const { data: areas = [], isLoading: cargandoAreas } = useQuery({ queryKey: ['catalogos', 'areas'], queryFn: listarAreas })
  const { data: tipos = [], isLoading: cargandoTipos } = useQuery({
    queryKey: ['catalogos', 'tipos-solicitud'],
    queryFn: listarTiposSolicitud,
  })

  async function manejarGuardarArea(id: number, estado: boolean) {
    try {
      await actualizarArea(id, { estado })
      void queryClient.invalidateQueries({ queryKey: ['catalogos', 'areas'] })
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo actualizar el área.'))
    }
  }

  async function manejarGuardarTipo(id: number, cambios: { dias_estimados?: number; estado?: boolean }) {
    try {
      await actualizarTipoSolicitud(id, cambios)
      void queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-solicitud'] })
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo actualizar el tipo de solicitud.'))
    }
  }

  if (cargandoAreas || cargandoTipos) return <SkeletonLista filas={4} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Catálogos</h1>
        <p className="text-sm text-tinta-suave">Activa/desactiva áreas y ajusta los días estimados por tipo.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-azul-noche">Áreas</h2>
        <ul className="divide-y divide-azul-niebla/60">
          {areas.map((area) => (
            <li key={area.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-tinta">{area.nombre}</p>
                <p className="text-xs text-tinta-suave">{area.descripcion}</p>
              </div>
              <button
                type="button"
                onClick={() => manejarGuardarArea(area.id, !area.estado)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  area.estado ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
                }`}
              >
                {area.estado ? 'Activa' : 'Inactiva'}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-azul-noche">Tipos de solicitud</h2>
        <ul className="divide-y divide-azul-niebla/60">
          {tipos.map((tipo) => (
            <li key={tipo.id} className="flex items-center justify-between gap-3 py-2">
              <p className="font-medium text-tinta">{tipo.nombre}</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-tinta-suave">
                  Días
                  <input
                    type="number"
                    min={1}
                    defaultValue={tipo.dias_estimados}
                    className={`${CLASE_INPUT} w-16 py-1`}
                    onBlur={(e) => {
                      const dias = Number(e.target.value)
                      if (dias > 0 && dias !== tipo.dias_estimados) manejarGuardarTipo(tipo.id, { dias_estimados: dias })
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => manejarGuardarTipo(tipo.id, { estado: !tipo.estado })}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    tipo.estado ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
                  }`}
                >
                  {tipo.estado ? 'Activo' : 'Inactivo'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
