import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { listarTiposSolicitud } from '../../data/catalogos'
import { crearSolicitud } from '../../data/formularios'
import { detalleInicial, normalizarDetalleParaEnvio, validarDetalle } from '../../lib/validacionFormularios'
import { mensajeError } from '../../lib/errors'
import { ICONO_POR_TIPO } from '../../components/formularios/iconosTipo'
import {
  CamposAfiche,
  CamposAviso,
  CamposComunicado,
  CamposCoberturaEventos,
  CamposEdicionFotografica,
  CamposPublicacionRedesSociales,
} from '../../components/formularios/CamposFormulario'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SkeletonLista } from '../../components/ui/Skeleton'
import type {
  DetalleFormulario,
  DetalleFormularioAfiche,
  DetalleFormularioAviso,
  DetalleFormularioComunicado,
  DetalleFormularioCoberturaEventos,
  DetalleFormularioEdicionFotografica,
  DetalleFormularioPublicacionRedesSociales,
  TipoSolicitudNombre,
} from '../../types/domain'

export function NuevaSolicitudPage() {
  const navigate = useNavigate()
  const { data: tipos = [], isLoading } = useQuery({ queryKey: ['catalogos', 'tipos-solicitud'], queryFn: listarTiposSolicitud })

  const [paso, setPaso] = useState(1)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<{ id: number; nombre: TipoSolicitudNombre } | null>(null)
  const [detalle, setDetalle] = useState<DetalleFormulario | null>(null)
  const [enviando, setEnviando] = useState(false)

  function elegirTipo(id: number, nombre: TipoSolicitudNombre) {
    setTipoSeleccionado({ id, nombre })
    setDetalle(detalleInicial(nombre))
    setPaso(2)
  }

  function continuarAPaso3() {
    if (!tipoSeleccionado || !detalle) return
    const error = validarDetalle(tipoSeleccionado.nombre, detalle)
    if (error) {
      toast.error(error)
      return
    }
    setPaso(3)
  }

  async function enviarSolicitud() {
    if (!tipoSeleccionado || !detalle) return
    setEnviando(true)
    try {
      const detalleFinal = normalizarDetalleParaEnvio(tipoSeleccionado.nombre, detalle)
      const ticketId = await crearSolicitud(tipoSeleccionado.id, detalleFinal)
      toast.success(`Solicitud #${ticketId} enviada.`)
      navigate(`/tickets/${ticketId}`)
    } catch (error) {
      toast.error(await mensajeError(error, 'No se pudo crear la solicitud.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">Nueva solicitud</h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-tinta-suave">
          {['Tipo', 'Formulario', 'Revisar y enviar'].map((etiqueta, indice) => (
            <span
              key={etiqueta}
              className={`rounded-full px-2.5 py-1 ${paso === indice + 1 ? 'bg-azul-institucional text-white' : 'bg-azul-niebla'}`}
            >
              {indice + 1}. {etiqueta}
            </span>
          ))}
        </div>
      </div>

      {paso === 1 &&
        (isLoading ? (
          <SkeletonLista />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tipos
              .filter((tipo) => tipo.estado)
              .map((tipo) => {
                const Icono = ICONO_POR_TIPO[tipo.nombre as TipoSolicitudNombre]
                return (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => elegirTipo(tipo.id, tipo.nombre as TipoSolicitudNombre)}
                    className="flex items-center gap-3 rounded-xl border border-azul-niebla bg-white p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-menta hover:shadow-md"
                  >
                    <span className="rounded-full bg-azul-niebla p-2 text-azul-institucional">
                      <Icono size={20} />
                    </span>
                    <span>
                      <p className="font-semibold text-tinta">{tipo.nombre}</p>
                      <p className="text-xs text-tinta-suave">{tipo.dias_estimados} día(s) estimados</p>
                    </span>
                  </button>
                )
              })}
          </div>
        ))}

      {paso === 2 && tipoSeleccionado && detalle && (
        <Card>
          <h2 className="mb-4 font-semibold text-azul-noche">{tipoSeleccionado.nombre}</h2>
          <CamposFormularioPorTipo tipo={tipoSeleccionado.nombre} detalle={detalle} onCambiar={setDetalle} />
          <div className="mt-6 flex justify-between">
            <Button variante="fantasma" onClick={() => setPaso(1)}>
              <ArrowLeft size={16} /> Volver
            </Button>
            <Button onClick={continuarAPaso3}>
              Continuar <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {paso === 3 && tipoSeleccionado && detalle && (
        <Card>
          <h2 className="mb-4 font-semibold text-azul-noche">Revisa tu solicitud</h2>
          <p className="mb-3 text-sm text-tinta-suave">
            Tipo: <span className="font-medium text-tinta">{tipoSeleccionado.nombre}</span>
          </p>
          <dl className="space-y-2 text-sm">
            {Object.entries(detalle).map(([clave, valor]) => (
              <div key={clave} className="flex justify-between gap-4 border-b border-azul-niebla/60 py-1">
                <dt className="text-tinta-suave">{clave}</dt>
                <dd className="text-right text-tinta">{Array.isArray(valor) ? valor.join(', ') : String(valor ?? '—')}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex justify-between">
            <Button variante="fantasma" onClick={() => setPaso(2)}>
              <ArrowLeft size={16} /> Volver
            </Button>
            <Button onClick={enviarSolicitud} cargando={enviando}>
              <Check size={16} /> Enviar solicitud
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function CamposFormularioPorTipo({
  tipo,
  detalle,
  onCambiar,
}: {
  tipo: TipoSolicitudNombre
  detalle: DetalleFormulario
  onCambiar: (valor: DetalleFormulario) => void
}) {
  switch (tipo) {
    case 'Afiche':
      return <CamposAfiche valor={detalle as DetalleFormularioAfiche} onCambiar={onCambiar} />
    case 'Comunicado':
      return <CamposComunicado valor={detalle as DetalleFormularioComunicado} onCambiar={onCambiar} />
    case 'Aviso':
      return <CamposAviso valor={detalle as DetalleFormularioAviso} onCambiar={onCambiar} />
    case 'Cobertura de eventos':
      return <CamposCoberturaEventos valor={detalle as DetalleFormularioCoberturaEventos} onCambiar={onCambiar} />
    case 'Edición fotográfica':
      return <CamposEdicionFotografica valor={detalle as DetalleFormularioEdicionFotografica} onCambiar={onCambiar} />
    case 'Publicación en redes sociales':
      return (
        <CamposPublicacionRedesSociales valor={detalle as DetalleFormularioPublicacionRedesSociales} onCambiar={onCambiar} />
      )
  }
}
