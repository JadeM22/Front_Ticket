import { Check } from 'lucide-react'

export interface PasoAsistente {
  etiqueta: string
  /** Sin tipo elegido no hay formulario: los pasos siguientes no se pueden abrir. */
  habilitado: boolean
  /** Tiene campos obligatorios sin llenar: se marca, pero igual se puede visitar. */
  incompleto: boolean
}

interface StepperAsistenteProps {
  pasos: PasoAsistente[]
  /** 1-based, igual que el `paso` del asistente. */
  actual: number
  onIr: (paso: number) => void
}

/**
 * Pasos del asistente como botones: se puede ir hacia atrás y hacia adelante sin perder nada. En móvil
 * solo se ven los números (la etiqueta queda para lectores de pantalla).
 */
export function StepperAsistente({ pasos, actual, onIr }: StepperAsistenteProps) {
  return (
    <nav aria-label="Pasos de la solicitud">
      <ol className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {pasos.map((paso, indice) => {
          const numero = indice + 1
          const esActual = numero === actual
          return (
            <li key={paso.etiqueta}>
              <button
                type="button"
                disabled={!paso.habilitado}
                aria-current={esActual ? 'step' : undefined}
                title={paso.incompleto ? `${paso.etiqueta}: incompleto` : paso.etiqueta}
                onClick={() => onIr(numero)}
                className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-institucional disabled:cursor-not-allowed disabled:opacity-50 ${
                  esActual
                    ? 'bg-azul-institucional text-white'
                    : 'bg-azul-niebla text-tinta-suave hover:bg-azul-niebla/70 hover:text-azul-institucional'
                }`}
              >
                <span className="font-semibold">{numero}</span>
                <span className="sr-only sm:not-sr-only">{paso.etiqueta}</span>
                {paso.incompleto && (
                  <>
                    <span aria-hidden className="h-2 w-2 rounded-full bg-coral" />
                    <span className="sr-only">(incompleto)</span>
                  </>
                )}
                {!paso.incompleto && !esActual && numero < actual && <Check size={12} aria-hidden />}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
