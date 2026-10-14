import { useQuery } from '@tanstack/react-query'
import { esHorarioHabil } from '../data/formularios'

const INTERVALO_MS = 60 * 1000

/**
 * `null` mientras se resuelve la primera consulta. Se vuelve a preguntar cada 60 s porque el
 * horario hábil (L-V 8:00 a. m.-4:00 p. m., sin feriados) lo calcula la base, no el reloj del
 * navegador. Usa TanStack Query (clave `['horario-habil']`) para que varias instancias a la vez
 * (p. ej. cada `CronometroDictamen` de un tablero) compartan una sola consulta en vez de sondear
 * la base por separado.
 */
export function useHorarioHabil(): boolean | null {
  const { data } = useQuery({
    queryKey: ['horario-habil'],
    queryFn: esHorarioHabil,
    staleTime: INTERVALO_MS,
    refetchInterval: INTERVALO_MS,
  })

  return data ?? null
}
