import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { actualizarArea, listarAreas, listarTiposSolicitud, type Area, type TipoSolicitud } from '../../data/catalogos'
import { mensajeError } from '../../lib/errors'
import { formatFecha } from '../../lib/date'
import { useNombresUsuarios } from '../../hooks/useNombresUsuarios'
import { TipoSolicitudModal } from '../../components/TipoSolicitudModal'
import { CamposTipoModal } from '../../components/CamposTipoModal'
import { AreaModal } from '../../components/AreaModal'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { CATEGORIAS_TIPO, ETIQUETA_FLUJO, type Flujo } from '../../types/domain'

interface ModalArea {
  abierto: boolean
  area: Area | null
  tipo: 'AREA' | 'COORDINACION'
}

export function AdminCatalogosPage() {
  const queryClient = useQueryClient()
  const { nombreDe } = useNombresUsuarios()
  const [modalTipo, setModalTipo] = useState<{ abierto: boolean; tipo: TipoSolicitud | null }>({
    abierto: false,
    tipo: null,
  })
  const [tipoCampos, setTipoCampos] = useState<TipoSolicitud | null>(null)
  const [modalArea, setModalArea] = useState<ModalArea>({ abierto: false, area: null, tipo: 'AREA' })
  // Desactivar un área o coordinación se confirma antes; activarla no.
  const [areaPorDesactivar, setAreaPorDesactivar] = useState<Area | null>(null)
  const [desactivando, setDesactivando] = useState(false)

  const { data: areas = [], isLoading: cargandoAreas } = useQuery({ queryKey: ['catalogos', 'areas'], queryFn: listarAreas })
  const { data: tipos = [], isLoading: cargandoTipos } = useQuery({
    queryKey: ['catalogos', 'tipos-solicitud'],
    queryFn: listarTiposSolicitud,
  })

  async function manejarGuardarArea(area: Area, estado: boolean) {
    const nombreTipo = area.tipo === 'COORDINACION' ? 'Coordinación' : 'Área'
    try {
      await actualizarArea(area.id, { estado })
      toast.success(`${nombreTipo} "${area.nombre}" ${estado ? 'activada' : 'desactivada'}.`)
      void queryClient.invalidateQueries({ queryKey: ['catalogos', 'areas'] })
    } catch (error) {
      toast.error(await mensajeError(error, `No se pudo actualizar ${area.tipo === 'COORDINACION' ? 'la coordinación' : 'el área'}.`))
    }
  }

  function alternarEstadoArea(area: Area) {
    if (area.estado) setAreaPorDesactivar(area)
    else void manejarGuardarArea(area, true)
  }

  async function confirmarDesactivar() {
    if (!areaPorDesactivar) return
    setDesactivando(true)
    await manejarGuardarArea(areaPorDesactivar, false)
    setDesactivando(false)
    setAreaPorDesactivar(null)
  }

  function invalidarTipos() {
    void queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-solicitud'] })
  }

  function invalidarAreas() {
    void queryClient.invalidateQueries({ queryKey: ['catalogos', 'areas'] })
  }

  if (cargandoAreas || cargandoTipos) return <SkeletonLista filas={4} />

  const soloAreas = areas.filter((a) => a.tipo === 'AREA')
  const coordinaciones = areas.filter((a) => a.tipo === 'COORDINACION')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Catálogos</h1>
        <p className="text-sm text-tinta-suave">Áreas, coordinaciones y tipos de solicitud.</p>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-azul-noche">Áreas</h2>
          <Button onClick={() => setModalArea({ abierto: true, area: null, tipo: 'AREA' })}>
            <Plus size={14} /> Crear área
          </Button>
        </div>
        <TablaAreas
          areas={soloAreas}
          vacio="Todavía no hay áreas registradas."
          onEditar={(area) => setModalArea({ abierto: true, area, tipo: 'AREA' })}
          onToggleEstado={alternarEstadoArea}
        />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-azul-noche">Coordinaciones</h2>
          <Button onClick={() => setModalArea({ abierto: true, area: null, tipo: 'COORDINACION' })}>
            <Plus size={14} /> Crear coordinación
          </Button>
        </div>
        <TablaAreas
          areas={coordinaciones}
          vacio="Todavía no hay coordinaciones registradas."
          onEditar={(area) => setModalArea({ abierto: true, area, tipo: 'COORDINACION' })}
          onToggleEstado={alternarEstadoArea}
        />
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
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Flujo</th>
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
                  <td className="px-3 py-2 text-tinta-suave">
                    {CATEGORIAS_TIPO.find((c) => c.valor === tipo.categoria)?.etiqueta ?? tipo.categoria}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-azul-niebla px-2 py-0.5 text-xs text-azul-institucional">
                      {ETIQUETA_FLUJO[tipo.flujo as Flujo] ?? tipo.flujo}
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
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="font-medium text-azul-institucional hover:underline"
                        onClick={() => setTipoCampos(tipo)}
                      >
                        Campos
                      </button>
                      <button
                        type="button"
                        className="font-medium text-azul-institucional hover:underline"
                        onClick={() => setModalTipo({ abierto: true, tipo })}
                      >
                        Editar
                      </button>
                    </div>
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

      <CamposTipoModal tipo={tipoCampos} tipos={tipos} onCerrar={() => setTipoCampos(null)} />

      <AreaModal
        abierto={modalArea.abierto}
        area={modalArea.area}
        tipo={modalArea.tipo}
        onCerrar={() => setModalArea({ abierto: false, area: null, tipo: 'AREA' })}
        onGuardado={invalidarAreas}
      />

      <Modal
        abierto={areaPorDesactivar !== null}
        onCerrar={() => !desactivando && setAreaPorDesactivar(null)}
        titulo={areaPorDesactivar?.tipo === 'COORDINACION' ? 'Desactivar coordinación' : 'Desactivar área'}
      >
        <p className="text-sm text-tinta-suave">
          ¿Desactivar <strong className="text-tinta">{areaPorDesactivar?.nombre}</strong>? Dejará de ofrecerse al crear o
          editar usuarios. Puedes volver a activarla cuando quieras.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variante="secundario" onClick={() => setAreaPorDesactivar(null)} disabled={desactivando}>
            Cancelar
          </Button>
          <Button variante="peligro" cargando={desactivando} onClick={() => void confirmarDesactivar()}>
            Desactivar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function TablaAreas({
  areas,
  vacio,
  onEditar,
  onToggleEstado,
}: {
  areas: Area[]
  vacio: string
  onEditar: (area: Area) => void
  onToggleEstado: (area: Area) => void
}) {
  if (areas.length === 0) return <p className="text-sm text-tinta-suave">{vacio}</p>

  return (
    <ul className="divide-y divide-azul-niebla/60">
      {areas.map((area) => (
        <li key={area.id} className="flex items-center gap-3 py-2">
          <div className="flex-1">
            <p className="font-medium text-tinta">{area.nombre}</p>
            {area.prefijo && <p className="font-mono text-xs text-tinta-suave">{area.prefijo}</p>}
          </div>
          <button
            type="button"
            onClick={() => onToggleEstado(area)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              area.estado ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
            }`}
          >
            {area.estado ? 'Activa' : 'Inactiva'}
          </button>
          <button
            type="button"
            className="text-sm font-medium text-azul-institucional hover:underline"
            onClick={() => onEditar(area)}
          >
            Editar
          </button>
        </li>
      ))}
    </ul>
  )
}
