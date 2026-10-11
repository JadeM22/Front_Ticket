import { AlertTriangle, Check } from 'lucide-react'

export interface PasoStepper {
  etiqueta: string
  descripcion?: string
  estado: 'completado' | 'actual' | 'pendiente'
  /** El paso actual va fuera de plazo: se pinta en coral en vez de azul. */
  alerta?: boolean
}

/** Barra de progreso por etapas: horizontal en escritorio, lista vertical en móvil. */
export function Stepper({ pasos }: { pasos: PasoStepper[] }) {
  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:gap-0">
      {pasos.map((paso, indice) => {
        const claseCirculo =
          paso.estado === 'completado'
            ? 'border-menta bg-menta text-white'
            : paso.estado === 'actual'
              ? paso.alerta
                ? 'border-coral bg-coral-bruma text-coral'
                : 'border-azul-institucional bg-azul-niebla text-azul-institucional'
              : 'border-azul-niebla bg-white text-tinta-suave'

        return (
          <li
            key={paso.etiqueta}
            aria-current={paso.estado === 'actual' ? 'step' : undefined}
            className="relative flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
          >
            {indice < pasos.length - 1 && (
              <span
                className={`absolute left-1/2 top-4 hidden h-0.5 w-full sm:block ${
                  paso.estado === 'completado' ? 'bg-menta' : 'bg-azul-niebla'
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 text-xs font-semibold ${claseCirculo}`}
            >
              {paso.estado === 'completado' ? <Check size={14} /> : paso.alerta ? <AlertTriangle size={14} /> : indice + 1}
            </span>
            <div className="sm:px-1">
              <p className={`text-sm ${paso.estado === 'pendiente' ? 'text-tinta-suave' : 'font-semibold text-tinta'}`}>
                {paso.etiqueta}
              </p>
              {paso.descripcion && <p className="text-xs text-tinta-suave">{paso.descripcion}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
