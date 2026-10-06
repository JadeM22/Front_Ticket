interface ProgressRingProps {
  horasRestantes: number
  horasTotal?: number
}

/** Anillo de cuenta regresiva de 24h: menta -> ámbar (<6h) -> coral (<2h). */
export function ProgressRing({ horasRestantes, horasTotal = 24 }: ProgressRingProps) {
  const horas = Math.max(0, horasRestantes)
  const proporcion = Math.min(1, horas / horasTotal)
  const radio = 26
  const circunferencia = 2 * Math.PI * radio
  const recorrido = circunferencia * proporcion

  const color = horas < 2 ? 'var(--color-coral)' : horas < 6 ? 'var(--color-ambar)' : 'var(--color-menta)'

  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90">
        <circle cx="30" cy="30" r={radio} fill="none" stroke="var(--color-azul-niebla)" strokeWidth="6" />
        <circle
          cx="30"
          cy="30"
          r={radio}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${recorrido} ${circunferencia}`}
          className="transition-all duration-200"
        />
      </svg>
      <span className="absolute font-mono text-xs font-semibold text-tinta">{horas.toFixed(1)}h</span>
    </div>
  )
}
