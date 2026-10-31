import { AlertTriangle } from 'lucide-react'

/** Mismo texto con el que la base rechaza "Pedir corrección" en un cambio urgente (Parte 63). */
export const TEXTO_MODIFICACION_SIN_CORRECCIONES =
  'Las solicitudes excepcionales por modificación constan de una única instrucción directa sin ciclo de correcciones.'

/**
 * Aviso destacado de un cambio urgente (`ticket_origen_id`): una sola instrucción, sin correcciones. Se
 * muestra al pedirlo, en el detalle del ticket y al dictaminarlo.
 */
export function AlertaModificacion({ className = '' }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex gap-2 rounded-lg border border-ambar/40 bg-ambar-bruma p-3 text-sm font-medium text-ambar ${className}`}
    >
      <AlertTriangle size={18} className="mt-0.5 flex-none" aria-hidden />
      <p>{TEXTO_MODIFICACION_SIN_CORRECCIONES}</p>
    </div>
  )
}
