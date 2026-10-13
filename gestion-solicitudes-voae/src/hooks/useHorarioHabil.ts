import { useEffect, useState } from 'react'
import { esHorarioHabil } from '../data/formularios'

const INTERVALO_MS = 60 * 1000

/**
 * `null` mientras se resuelve la primera consulta. Se vuelve a preguntar cada 60 s porque el
 * horario hábil (L-V 8:00 a. m.-4:00 p. m., sin feriados) lo calcula la base, no el reloj del navegador.
 */
export function useHorarioHabil(): boolean | null {
  const [horarioHabil, setHorarioHabil] = useState<boolean | null>(null)

  useEffect(() => {
    let activo = true

    async function consultar() {
      try {
        const valor = await esHorarioHabil()
        if (activo) setHorarioHabil(valor)
      } catch {
        // Sin red: se mantiene el último valor conocido y se reintenta en la siguiente revisión.
      }
    }

    void consultar()
    const intervalo = window.setInterval(consultar, INTERVALO_MS)
    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [])

  return horarioHabil
}
