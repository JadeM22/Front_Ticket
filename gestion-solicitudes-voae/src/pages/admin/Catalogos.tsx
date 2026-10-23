import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import {
  actualizarArea,
  actualizarCampus,
  listarAreas,
  listarCampus,
  listarTiposSolicitud,
  type Campus,
  type TipoSolicitud,
} from '../../data/catalogos'
import { mensajeError } from '../../lib/errors'
import { formatFecha } from '../../lib/date'
import { useNombresUsuarios } from '../../hooks/useNombresUsuarios'
import { TipoSolicitudModal } from '../../components/TipoSolicitudModal'
import { CamposTipoModal } from '../../components/CamposTipoModal'
import { CampusModal } from '../../components/CampusModal'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { ETIQUETA_FLUJO, type Flujo } from '../../types/domain'

export function AdminCatalogosPage() {
  const queryClient = useQueryClient()
  const { nombreDe } = useNombresUsuarios()
  const [modalTipo, setModalTipo] = useState<{ abierto: boolean; tipo: TipoSolicitud | null }>({
    abierto: false,
    tipo: null,
  })
  const [tipoCampos, setTipoCampos] = useState<TipoSolicitud | null>(null)
  const [modalCampus, setModalCampus] = useState<{ abierto: boolean; campus: Campus | null }>({
    abierto: false,
    campus: null,
  })
  const [ordenandoCampus, setOrdenandoCampus] = useState(false)

  const { data: areas = [], isLoading: cargandoAreas } = useQuery({ queryKey: ['catalogos', 'areas'], queryFn: listarAreas })
  const { data: tipos = [], isLoading: cargandoTipos } = useQuery({
    queryKey: ['catalogos', 'tipos-solicitud'],
    queryFn: listarTiposSolicitud,
  })
  const { data: campus = [], isLoading: cargandoCampus } = useQuery({ queryKey: ['catalogos', 'campus'], queryFn: listarCampus })

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

  function invalidarCampus() {
    void queryClient.invalidateQueries({ queryKey: ['catalogos', 'campus'] })
  }

  async function manejarEstadoCampus(c: Campus) {
    try {
      await actualizarCampus(c.id, { estado: !c.estado })
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo actualizar el campus.'))
    } finally {
      invalidarCampus()
    }
  }

  /** Renumera 1, 2, 3… con el campus movido en su nuevo lugar; solo actualiza los que cambian. */
  async function moverCampus(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion
    if (destino < 0 || destino >= campus.length) return
    const nuevoOrden = [...campus]
    ;[nuevoOrden[indice], nuevoOrden[destino]] = [nuevoOrden[destino], nuevoOrden[indice]]
    setOrdenandoCampus(true)
    try {
      for (const [i, c] of nuevoOrden.entries()) {
        if (c.orden !== i + 1) await actualizarCampus(c.id, { orden: i + 1 })
      }
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo cambiar el orden.'))
    } finally {
      setOrdenandoCampus(false)
      invalidarCampus()
    }
  }

  if (cargandoAreas || cargandoTipos || cargandoCampus) return <SkeletonLista filas={4} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Catálogos</h1>
        <p className="text-sm text-tinta-suave">Áreas, campus y tipos de solicitud.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-azul-noche">Áreas</h2>
        <ul className="divide-y divide-azul-niebla/60">
          {areas.map((area) => (
            <li key={area.id} className="flex items-center justify-between py-2">
              <p className="font-medium text-tinta">{area.nombre}</p>
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
          <div>
            <h2 className="font-semibold text-azul-noche">Campus</h2>
            <p className="text-xs text-tinta-suave">Opciones del "Alcance" en cada solicitud. No se borran: se desactivan.</p>
          </div>
          <Button onClick={() => setModalCampus({ abierto: true, campus: null })}>
            <Plus size={14} /> Crear campus
          </Button>
        </div>
        {campus.length === 0 ? (
          <p className="text-sm text-tinta-suave">Todavía no hay campus registrados.</p>
        ) : (
          <ul className="divide-y divide-azul-niebla/60">
            {campus.map((c, indice) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Subir"
                    disabled={ordenandoCampus || indice === 0}
                    onClick={() => moverCampus(indice, -1)}
                    className="text-tinta-suave hover:text-azul-institucional disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Bajar"
                    disabled={ordenandoCampus || indice === campus.length - 1}
                    onClick={() => moverCampus(indice, 1)}
                    className="text-tinta-suave hover:text-azul-institucional disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <p className="flex-1 font-medium text-tinta">
                  {c.nombre}
                  {c.siglas && <span className="ml-1 text-xs font-normal text-tinta-suave">({c.siglas})</span>}
                </p>
                <button
                  type="button"
                  onClick={() => manejarEstadoCampus(c)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    c.estado ? 'bg-menta-bruma text-menta-profundo' : 'bg-coral-bruma text-coral'
                  }`}
                >
                  {c.estado ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-azul-institucional hover:underline"
                  onClick={() => setModalCampus({ abierto: true, campus: c })}
                >
                  Editar
                </button>
              </li>
            ))}
          </ul>
        )}
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

      <CampusModal
        abierto={modalCampus.abierto}
        campus={modalCampus.campus}
        ordenSiguiente={campus.reduce((maximo, c) => Math.max(maximo, c.orden), 0) + 1}
        onCerrar={() => setModalCampus({ abierto: false, campus: null })}
        onGuardado={invalidarCampus}
      />
    </div>
  )
}
