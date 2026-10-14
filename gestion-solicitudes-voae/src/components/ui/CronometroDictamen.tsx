import { useEffect, useState } from 'react'
import { Hourglass } from 'lucide-react'
import { useHorarioHabil } from '../../hooks/useHorarioHabil'
import { formatFechaHora, formatoHHMM, formatoHorasHabiles } from '../../lib/date'

/** 24 horas hábiles = la ventana completa de aprobación automática. */
const MAXIMO_MINUTOS = 24 * 60

interface CronometroDictamenProps {
  minutos: number | null
  fechaAprobacion: string | null
  /** Versión de una línea para las tarjetas: "Dictamen: 23:30". */
  compacto?: boolean
}

/**
 * Cuenta regresiva del plazo de dictamen. La base manda `minutos` cada 60 s (vía `refetchInterval`
 * en la consulta del ticket); entre una consulta y la siguiente, este componente resta 1 minuto por
 * su cuenta cada 60 s — pero solo si `useHorarioHabil()` dice que es horario hábil, porque fuera de
 * horario el tiempo hábil está detenido y restar igual mostraría una cuenta que no corresponde a la
 * que calcula la base.
 */
export function CronometroDictamen({ minutos, fechaAprobacion, compacto = false }: CronometroDictamenProps) {
  const horarioHabil = useHorarioHabil()
  const [minutosLocal, setMinutosLocal] = useState(minutos)
  // Patrón de React para "resetear estado cuando cambia una prop": se ajusta en el propio render
  // (no en un efecto) para evitar un repintado en cascada cada vez que llega un `minutos` nuevo.
  const [minutosPrevios, setMinutosPrevios] = useState(minutos)
  if (minutos !== minutosPrevios) {
    setMinutosPrevios(minutos)
    setMinutosLocal(minutos)
  }

  useEffect(() => {
    if (horarioHabil !== true) return
    const intervalo = window.setInterval(() => {
      setMinutosLocal((prev) => (prev == null ? prev : Math.max(0, prev - 1)))
    }, 60_000)
    return () => window.clearInterval(intervalo)
  }, [horarioHabil])

  const vencido = minutosLocal == null || minutosLocal === 0

  if (compacto) {
    return (
      <p className="text-xs font-medium text-ambar">Dictamen: {vencido ? 'vencido' : formatoHHMM(minutosLocal)}</p>
    )
  }

  if (vencido) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-azul-niebla/40 p-3">
        <Hourglass size={20} className="flex-none text-tinta-suave" />
        <p className="text-sm font-medium text-tinta">Plazo de dictamen vencido: aprobado automáticamente</p>
      </div>
    )
  }

  const colorAnillo =
    minutosLocal > 480 ? 'var(--color-menta)' : minutosLocal > 120 ? 'var(--color-ambar)' : 'var(--color-coral)'
  const radio = 26
  const circunferencia = 2 * Math.PI * radio
  const recorrido = circunferencia * Math.min(1, minutosLocal / MAXIMO_MINUTOS)

  return (
    <div className="flex items-center gap-3 rounded-lg bg-azul-niebla/40 p-3">
      <div className="relative flex h-16 w-16 flex-none items-center justify-center">
        <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90">
          <circle cx="30" cy="30" r={radio} fill="none" stroke="var(--color-azul-niebla)" strokeWidth="6" />
          <circle
            cx="30"
            cy="30"
            r={radio}
            fill="none"
            stroke={colorAnillo}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${recorrido} ${circunferencia}`}
            className="transition-all duration-200"
          />
        </svg>
        <span className="absolute font-mono text-xs font-semibold tabular-nums text-tinta">
          {formatoHHMM(minutosLocal)}
        </span>
      </div>
      <div className="text-sm text-tinta-suave">
        <p>
          Quedan {formatoHorasHabiles(minutosLocal)} hábiles para dictaminar. Si el jefe de área no dictamina antes
          del <span className="font-medium text-tinta">{formatFechaHora(fechaAprobacion)}</span>, el ticket se
          aprueba automáticamente.
        </p>
        {horarioHabil === false && <p className="mt-1 text-xs font-medium text-ambar">Pausado: fuera de horario hábil</p>}
      </div>
    </div>
  )
}
