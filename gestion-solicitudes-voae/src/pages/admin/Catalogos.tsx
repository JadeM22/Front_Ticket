import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { listarAreas, listarTiposSolicitud, actualizarArea, type TipoSolicitud } from '../../data/catalogos'
import { mensajeError } from '../../lib/errors'
import { formatFecha } from '../../lib/date'
import { useNombresUsuarios } from '../../hooks/useNombresUsuarios'
import { ETIQUETA_FORMULARIO } from '../../components/formularios/iconosFormulario'
import { TipoSolicitudModal } from '../../components/TipoSolicitudModal'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SkeletonLista } from '../../components/ui/Skeleton'
import type { FormularioCodigo } from '../../types/domain'

export function AdminCatalogosPage() {
  const queryClient = useQueryClient()
  const { nombreDe } = useNombresUsuarios()
  const [modalTipo, setModalTipo] = useState<{ abierto: boolean; tipo: TipoSolicitud | null }>({
    abierto: false,
    tipo: null,
  })

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

  function invalidarTipos() {
    void queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-solicitud'] })
  }

  if (cargandoAreas || cargandoTipos) return <SkeletonLista filas={4} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Catálogos</h1>
        <p className="text-sm text-tinta-suave">Áreas y tipos de solicitud.</p>
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-azul-noche">Tipos de solicitud</h2>
          <Button onClick={() => setModalTipo({ abierto: true, tipo: null })}>
            <Plus size={14} /> Crear tipo
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-azul-niebla/50 text-xs uppercase text-tinta-suave">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Días</th>
                <th className="px-3 py-2">Formulario</th>
                <th className="px-3 py-2">Activo</th>
                <th className="px-3 py-2">Creado por</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-azul-niebla/60">
              {tipos.map((tipo) => (
                <tr key={tipo.id}>
                  <td className="px-3 py-2 font-medium text-tinta">
                    {tipo.nombre}
                    {tipo.descripcion && <p className="text-xs text-tinta-suave">{tipo.descripcion}</p>}
                  </td>
                  <td className="px-3 py-2">
                    {tipo.dias_estimados} {tipo.dias_habiles ? 'hábiles' : 'corridos'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-azul-niebla px-2 py-0.5 text-xs text-azul-institucional">
                      {ETIQUETA_FORMULARIO[tipo.formulario as FormularioCodigo] ?? tipo.formulario}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        tipo.estado ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
                      }`}
                    >
                      {tipo.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-tinta-suave">{nombreDe(tipo.usuario_registro)}</td>
                  <td className="px-3 py-2 text-tinta-suave">{formatFecha(tipo.fecha_registro)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="font-medium text-azul-institucional hover:underline"
                      onClick={() => setModalTipo({ abierto: true, tipo })}
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

      <TipoSolicitudModal
        abierto={modalTipo.abierto}
        tipo={modalTipo.tipo}
        onCerrar={() => setModalTipo({ abierto: false, tipo: null })}
        onGuardado={invalidarTipos}
      />
    </div>
  )
}
