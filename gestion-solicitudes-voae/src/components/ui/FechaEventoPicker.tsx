import { useEffect, useRef, useState } from 'react'
import type { FocusEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { CLASE_INPUT } from './Campo'
import { Skeleton } from './Skeleton'
import { hoyTegucigalpaISO } from '../../lib/date'
import { isoATextoFecha } from '../../lib/fechaInput'
import { posicionDesplegable } from '../../lib/desplegable'
import { obtenerFechaEventoMinima } from '../../data/formularios'
import { listarFeriados } from '../../data/catalogos'

interface FechaEventoPickerProps {
  tipoId: number
  excepcional: boolean
  /** Días hábiles de producción que se muestran en la ayuda y el tooltip del periodo (2 si es excepcional). */
  diasProduccion: number
  value: string
  onChange: (value: string) => void
  id?: string
}

const ANCHO_CALENDARIO = 300
const ALTO_CALENDARIO = 360
const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const REVISION_MINIMO_MS = 5 * 60 * 1000

const formateadorMes = new Intl.DateTimeFormat('es-HN', { timeZone: 'UTC', month: 'long', year: 'numeric' })
const formateadorDiaSemana = new Intl.DateTimeFormat('es-HN', { timeZone: 'UTC', weekday: 'long' })

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Calendario de la fecha del evento: deshabilita todo lo anterior al mínimo que calcula la base
 * (`fnFechaEventoMinimaEscalar`) y marca visualmente el periodo de producción y los feriados. Nunca
 * reimplementa el cálculo del mínimo en el cliente — solo lo consulta y lo refresca cada 5 minutos
 * (y al abrir el calendario), porque la ventana se mueve con el tiempo.
 */
export function FechaEventoPicker({ tipoId, excepcional, diasProduccion, value, onChange, id }: FechaEventoPickerProps) {
  const [abierto, setAbierto] = useState(false)
  const [mesElegido, setMesElegido] = useState<string | null>(null)
  const [posicion, setPosicion] = useState({ arriba: false, derecha: false })
  const contenedor = useRef<HTMLDivElement>(null)
  const yaUbicoMes = useRef<string | null>(null)

  const {
    data: minimo,
    isLoading: cargandoMinimo,
    isError: errorMinimo,
    refetch: refrescarMinimo,
  } = useQuery({
    queryKey: ['solicitudes', 'fecha-evento-minima', tipoId, excepcional],
    queryFn: () => obtenerFechaEventoMinima(tipoId, excepcional),
    staleTime: REVISION_MINIMO_MS,
    refetchInterval: REVISION_MINIMO_MS,
  })

  const { data: feriados = [] } = useQuery({ queryKey: ['catalogos', 'feriados'], queryFn: listarFeriados })

  // Si el mínimo avanzó y la fecha elegida quedó corta (cambió el tipo, o pasó la medianoche), se limpia.
  useEffect(() => {
    if (minimo && value && value < minimo) onChange('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimo])

  // Abre el calendario en el mes del mínimo la primera vez que se conoce (clave distinta por tipo/excepcional).
  const claveMinimo = `${tipoId}-${excepcional}`
  useEffect(() => {
    if (!minimo || yaUbicoMes.current === claveMinimo) return
    yaUbicoMes.current = claveMinimo
    setMesElegido(minimo.slice(0, 7))
  }, [minimo, claveMinimo])

  const hoy = hoyTegucigalpaISO()
  const mesVisible = mesElegido ?? (minimo ?? hoy).slice(0, 7)
  const anio = Number(mesVisible.slice(0, 4))
  const mes = Number(mesVisible.slice(5, 7))
  const primerDiaSemana = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay()
  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate()

  function feriadoEn(iso: string) {
    return feriados.find((f) => f.estado && f.fecha_inicio <= iso && iso <= f.fecha_fin)
  }

  function esFinDeSemana(iso: string) {
    const dia = new Date(`${iso}T00:00:00Z`).getUTCDay()
    return dia === 0 || dia === 6
  }

  function abrir() {
    if (abierto) return
    const caja = contenedor.current?.getBoundingClientRect()
    if (caja) setPosicion(posicionDesplegable(caja, ANCHO_CALENDARIO, ALTO_CALENDARIO))
    void refrescarMinimo()
    setAbierto(true)
  }

  function elegir(iso: string) {
    onChange(iso)
    setAbierto(false)
  }

  function moverMes(delta: number) {
    const destino = new Date(Date.UTC(anio, mes - 1 + delta, 1))
    setMesElegido(`${destino.getUTCFullYear()}-${pad(destino.getUTCMonth() + 1)}`)
  }

  function manejarBlur(e: FocusEvent<HTMLDivElement>) {
    if (contenedor.current?.contains(e.relatedTarget)) return
    setAbierto(false)
  }

  if (cargandoMinimo) return <Skeleton className="h-[38px] w-full" />

  if (errorMinimo || !minimo) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-coral bg-coral-bruma px-3 py-2 text-sm text-coral">
        <AlertCircle size={16} />
        No se pudo calcular la fecha mínima del evento. Vuelve a intentar.
      </div>
    )
  }

  const diaSemanaMinimo = formateadorDiaSemana.format(new Date(`${minimo}T00:00:00Z`))

  return (
    <div ref={contenedor} className="relative" onBlur={manejarBlur}>
      <button
        type="button"
        id={id}
        onClick={abrir}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        className={`${CLASE_INPUT} flex items-center justify-between text-left ${value ? '' : 'text-tinta-suave'}`}
      >
        {value ? isoATextoFecha(value) : 'Selecciona la fecha del evento'}
        <CalendarDays size={16} className="text-tinta-suave" />
      </button>

      <p className="mt-1 text-xs text-tinta-suave">
        Primer día disponible: {diaSemanaMinimo} {isoATextoFecha(minimo)} ({diasProduccion} día(s) hábiles de
        producción)
      </p>

      {abierto && (
        <div
          role="dialog"
          aria-label="Elegir la fecha del evento"
          onMouseDown={(e) => e.preventDefault()}
          className={`absolute z-30 w-[300px] rounded-xl border border-azul-niebla bg-white p-3 text-tinta shadow-xl ${
            posicion.arriba ? 'bottom-full mb-1' : 'top-[38px] mt-1'
          } ${posicion.derecha ? 'right-0' : 'left-0'}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => moverMes(-1)}
              className="rounded-full p-1.5 text-tinta-suave transition-colors duration-150 hover:bg-azul-niebla hover:text-azul-noche"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="block text-sm font-semibold text-azul-noche first-letter:uppercase">
              {formateadorMes.format(new Date(Date.UTC(anio, mes - 1, 1)))}
            </span>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => moverMes(1)}
              className="rounded-full p-1.5 text-tinta-suave transition-colors duration-150 hover:bg-azul-niebla hover:text-azul-noche"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {DIAS_SEMANA.map((dia, i) => (
              <span key={i} className="py-1 text-xs font-medium text-tinta-suave">
                {dia}
              </span>
            ))}
            {Array.from({ length: primerDiaSemana }, (_, i) => (
              <span key={`hueco-${i}`} />
            ))}
            {Array.from({ length: diasDelMes }, (_, i) => {
              const iso = `${mesVisible}-${pad(i + 1)}`
              const elegido = iso === value
              const esPasado = iso < hoy
              const enProduccion = !esPasado && iso < minimo
              const bloqueado = iso < minimo
              const feriado = feriadoEn(iso)
              const finDeSemana = esFinDeSemana(iso)

              const titulo = feriado
                ? feriado.nombre
                : enProduccion
                  ? `Periodo de producción: ${diasProduccion} día(s) hábiles`
                  : undefined

              return (
                <button
                  key={iso}
                  type="button"
                  tabIndex={-1}
                  disabled={bloqueado}
                  onClick={() => elegir(iso)}
                  title={titulo}
                  aria-label={isoATextoFecha(iso)}
                  aria-pressed={elegido}
                  className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors duration-150 ${
                    elegido
                      ? 'bg-azul-institucional font-semibold text-white'
                      : bloqueado
                        ? enProduccion
                          ? 'cursor-not-allowed text-tinta-suave/70 [background-image:repeating-linear-gradient(135deg,rgba(100,116,139,0.18)_0_3px,transparent_3px_7px)]'
                          : 'cursor-not-allowed text-tinta-suave/40'
                        : `hover:bg-azul-niebla ${finDeSemana ? 'text-tinta-suave' : ''} ${iso === hoy ? 'font-semibold text-menta-profundo ring-1 ring-menta-profundo' : ''}`
                  }`}
                >
                  {i + 1}
                  {feriado && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-ambar" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
