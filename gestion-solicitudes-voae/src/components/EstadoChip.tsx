import { Clock } from 'lucide-react'
import type { EstadoReal } from '../types/domain'

const ESTILOS: Record<EstadoReal, string> = {
  Enviado: 'bg-azul-niebla text-azul-medio',
  'En revisión': 'bg-indigo-bruma text-indigo-suave',
  'En proceso': 'bg-azul-niebla text-azul-institucional',
  Finalizado: 'bg-menta-bruma text-menta-profundo',
  Corrección: 'bg-ambar-bruma text-ambar',
  Aprobado: 'bg-menta-bruma text-menta-profundo',
  'Aprobado (Automático)': 'bg-menta-bruma text-menta-profundo',
  Retrasado: 'bg-coral-bruma text-coral',
}

export function EstadoChip({ estado }: { estado: string }) {
  const estiloEstado = ESTILOS[estado as EstadoReal] ?? 'bg-azul-niebla text-tinta-suave'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${estiloEstado}`}>
      {estado === 'Aprobado (Automático)' && <Clock size={12} />}
      {estado}
    </span>
  )
}
