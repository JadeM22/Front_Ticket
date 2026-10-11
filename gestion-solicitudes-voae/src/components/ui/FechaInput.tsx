import { useRef, useState } from 'react'
import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { CLASE_INPUT } from './Campo'
import { hoyTegucigalpaISO } from '../../lib/date'
import { posicionDesplegable } from '../../lib/desplegable'
import { enmascararFecha, isoATextoFecha, textoFechaAIso } from '../../lib/fechaInput'

interface FechaInputProps {
  /** Fecha como 'YYYY-MM-DD', o '' si está vacía (igual que un `<input type="date">`). */
  valor: string
  onCambiar: (valor: string) => void
  min?: string
  max?: string
  required?: boolean
  disabled?: boolean
  id?: string
  className?: string
}

const ANCHO_CALENDARIO = 288
const ALTO_CALENDARIO = 340
const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

const formateadorMes = new Intl.DateTimeFormat('es-HN', { timeZone: 'UTC', month: 'long', year: 'numeric' })

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Campo de fecha único del sistema: se puede escribir (DD/MM/AAAA, las barras se ponen solas) o
 * elegir en el calendario desplegable, y ambos van sincronizados.
 *
 * Hacia afuera solo sale una fecha real y completa, o '' cuando el campo queda vacío o se abandona
 * a medio escribir; mientras se teclea no se emite nada. Una fecha fuera de `min`/`max` sí se emite
 * (con su aviso), igual que el input nativo, para que la validación del formulario y la de la base
 * sigan dando su propio mensaje.
 */
export function FechaInput({ valor, onCambiar, min, max, required, disabled, id, className }: FechaInputProps) {
  const [texto, setTexto] = useState(() => isoATextoFecha(valor))
  const [valorVisto, setValorVisto] = useState(valor)
  const [abierto, setAbierto] = useState(false)
  const [mesElegido, setMesElegido] = useState<string | null>(null)
  const [posicion, setPosicion] = useState({ arriba: false, derecha: false })
  const [salioIncompleto, setSalioIncompleto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const isoTexto = textoFechaAIso(texto)

  // Si el valor cambia desde afuera (limpiar filtros, reiniciar el formulario), el texto lo sigue.
  if (valor !== valorVisto) {
    setValorVisto(valor)
    if (valor !== (isoTexto ?? '')) {
      setTexto(isoATextoFecha(valor))
      setSalioIncompleto(false)
    }
  }

  const hoy = hoyTegucigalpaISO()
  const fueraDeRango = (iso: string) => (min !== undefined && iso < min) || (max !== undefined && iso > max)

  let error: string | null = null
  if (texto.length === 10 && !isoTexto) error = 'Esa fecha no es válida.'
  else if (salioIncompleto && texto && !isoTexto) error = 'Escribe la fecha completa: dd/mm/aaaa.'
  else if (isoTexto && min && isoTexto < min) error = `No puede ser anterior al ${isoATextoFecha(min)}.`
  else if (isoTexto && max && isoTexto > max) error = `No puede ser posterior al ${isoATextoFecha(max)}.`

  // Mes que muestra el calendario: el que se navegó a mano o, si no, el de la fecha escrita.
  const mesVisible = mesElegido ?? (isoTexto ?? (min && min > hoy ? min : hoy)).slice(0, 7)
  const anio = Number(mesVisible.slice(0, 4))
  const mes = Number(mesVisible.slice(5, 7))
  const primerDiaSemana = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay()
  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate()

  function abrir() {
    if (abierto || disabled) return
    const caja = contenedor.current?.getBoundingClientRect()
    if (caja) setPosicion(posicionDesplegable(caja, ANCHO_CALENDARIO, ALTO_CALENDARIO))
    setMesElegido(null)
    setAbierto(true)
  }

  function manejarCambio(e: ChangeEvent<HTMLInputElement>) {
    const nuevo = enmascararFecha(e.target.value)
    setTexto(nuevo)
    setSalioIncompleto(false)
    setMesElegido(null)
    abrir()
    const iso = textoFechaAIso(nuevo)
    if (iso) {
      if (iso !== valor) onCambiar(iso)
    } else if (nuevo === '' && valor !== '') {
      onCambiar('')
    }
  }

  function elegir(iso: string) {
    setTexto(isoATextoFecha(iso))
    setSalioIncompleto(false)
    setAbierto(false)
    if (iso !== valor) onCambiar(iso)
  }

  function manejarBlur(e: FocusEvent<HTMLDivElement>) {
    if (contenedor.current?.contains(e.relatedTarget)) return
    setAbierto(false)
    // Lo que quedó a medias no se guarda: el campo cuenta como vacío hasta que la fecha esté bien.
    if (texto !== '' && !isoTexto) {
      setSalioIncompleto(true)
      if (valor !== '') onCambiar('')
    }
  }

  function manejarTecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && abierto) {
      e.stopPropagation()
      setAbierto(false)
    } else if (e.key === 'ArrowDown') {
      abrir()
    }
  }

  function moverMes(delta: number) {
    const destino = new Date(Date.UTC(anio, mes - 1 + delta, 1))
    setMesElegido(`${destino.getUTCFullYear()}-${pad(destino.getUTCMonth() + 1)}`)
  }

  function alternarCalendario() {
    if (abierto) {
      setAbierto(false)
      return
    }
    input.current?.focus()
    abrir()
  }

  return (
    <div ref={contenedor} className={`relative ${className ?? ''}`} onBlur={manejarBlur}>
      <input
        ref={input}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        className={`${CLASE_INPUT} pr-10 ${error ? 'border-coral!' : ''}`}
        required={required}
        disabled={disabled}
        value={texto}
        onChange={manejarCambio}
        onFocus={abrir}
        onClick={abrir}
        onKeyDown={manejarTecla}
        aria-invalid={error ? true : undefined}
        aria-haspopup="dialog"
        aria-expanded={abierto}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        // Sin esto el clic le quita el foco al campo y el calendario se cerraría antes de abrirse.
        onMouseDown={(e) => e.preventDefault()}
        onClick={alternarCalendario}
        className="absolute right-0 top-0 flex h-[38px] w-10 items-center justify-center rounded-r-lg text-tinta-suave transition-colors duration-150 hover:text-azul-institucional"
        aria-label={abierto ? 'Cerrar calendario' : 'Abrir calendario'}
        title={abierto ? 'Cerrar calendario' : 'Abrir calendario'}
      >
        <Calendar size={16} />
      </button>

      {error && <span className="mt-1 block text-xs text-coral">{error}</span>}

      {abierto && (
        <div
          role="dialog"
          aria-label="Elegir fecha"
          // El foco se queda en el campo mientras se usa el calendario, así se puede seguir escribiendo.
          onMouseDown={(e) => e.preventDefault()}
          className={`absolute z-30 w-72 rounded-xl border border-azul-niebla bg-white p-3 text-tinta shadow-xl ${
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
              const elegido = iso === isoTexto
              const bloqueado = fueraDeRango(iso)
              return (
                <button
                  key={iso}
                  type="button"
                  tabIndex={-1}
                  disabled={bloqueado}
                  onClick={() => elegir(iso)}
                  aria-label={isoATextoFecha(iso)}
                  aria-pressed={elegido}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors duration-150 ${
                    elegido
                      ? 'bg-azul-institucional font-semibold text-white'
                      : bloqueado
                        ? 'cursor-not-allowed text-tinta-suave/40'
                        : `hover:bg-azul-niebla ${iso === hoy ? 'font-semibold text-menta-profundo ring-1 ring-menta-profundo' : ''}`
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-azul-niebla pt-2 text-xs font-medium">
            <button
              type="button"
              tabIndex={-1}
              disabled={fueraDeRango(hoy)}
              onClick={() => elegir(hoy)}
              className="rounded px-2 py-1 text-azul-institucional transition-colors duration-150 hover:bg-azul-niebla disabled:cursor-not-allowed disabled:opacity-40"
            >
              Hoy
            </button>
            {!required && texto !== '' && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => elegir('')}
                className="rounded px-2 py-1 text-tinta-suave transition-colors duration-150 hover:bg-azul-niebla"
              >
                Borrar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
