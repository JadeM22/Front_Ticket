import { Clock } from 'lucide-react'
import { etiquetaEstado, type PerspectivaEstado } from '../lib/estados'
import type { EstadoReal } from '../types/domain'

/** El color sigue al estado real, no a la etiqueta: "En proceso" del solicitante puede ser una Corrección. */
const ESTILOS: Record<EstadoReal, string> = {
  Enviado: 'bg-azul-niebla text-azul-medio',
  'En revisión': 'bg-indigo-bruma text-indigo-suave',
  'En proceso': 'bg-azul-niebla text-azul-institucional',
  Finalizado: 'bg-violeta-bruma text-violeta',
  Corrección: 'bg-ambar-bruma text-ambar',
  Aprobado: 'bg-menta-bruma text-menta-profundo',
  'Aprobado (Automático)': 'bg-menta-bruma text-menta-profundo',
  Retrasado: 'bg-coral-bruma text-coral',
  Rechazado: 'bg-tinta-suave/20 text-tinta-suave',
}

/** El solicitante ve su Corrección como "En proceso": también con el color de En proceso. */
const ESTILO_CORRECCION_SOLICITANTE = ESTILOS['En proceso']

interface EstadoChipProps {
  /** `estado_real` tal cual viene de la base. */
  estado: string
  /** Quién mira: decide el texto visible (`lib/estados.ts`). */
  perspectiva: PerspectivaEstado
  /** Flujo del ticket (`TipoSolicitud.flujo`): en Aprobación, "Rechazado" se lee "Denegado". */
  flujo?: string | null
  /** Para colocarlo sobre la franja azul oscura del boleto: fondo semitransparente, texto blanco. */
  sobreOscuro?: boolean
}

export function EstadoChip({ estado, perspectiva, flujo, sobreOscuro = false }: EstadoChipProps) {
  const estiloEstado = sobreOscuro
    ? 'bg-white/15 text-white ring-1 ring-inset ring-white/30'
    : perspectiva === 'solicitante' && estado === 'Corrección'
      ? ESTILO_CORRECCION_SOLICITANTE
      : (ESTILOS[estado as EstadoReal] ?? 'bg-azul-niebla text-tinta-suave')

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${estiloEstado}`}>
      {estado === 'Aprobado (Automático)' && <Clock size={12} />}
      {etiquetaEstado(estado, perspectiva, flujo)}
    </span>
  )
}
