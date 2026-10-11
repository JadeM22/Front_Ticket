import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react'
import { Clock } from 'lucide-react'
import { CLASE_INPUT } from './Campo'
import { posicionDesplegable } from '../../lib/desplegable'
import { enmascararHora, etiquetaHora, hora24APartes, interpretarHora } from '../../lib/horaInput'

interface HoraInputProps {
  /** Hora como 'HH:MM' en 24 h, o '' si está vacía (igual que un `<input type="time">`). */
  valor: string
  onCambiar: (valor: string) => void
  required?: boolean
  disabled?: boolean
  id?: string
  className?: string
}

const ANCHO_LISTA = 160
const ALTO_LISTA = 240
const MINUTOS_POR_RANURA = 30
const RANURA_INICIAL = '08:00'

const pad = (n: number) => String(n).padStart(2, '0')

const RANURAS = Array.from({ length: (24 * 60) / MINUTOS_POR_RANURA }, (_, i) => {
  const minutos = i * MINUTOS_POR_RANURA
  return `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}`
})

/**
 * Campo de hora único del sistema, hermano de `FechaInput`: se escribe (hh:mm, los dos puntos se
 * ponen solos) con su botón a. m./p. m., o se elige en la lista desplegable, y ambos van
 * sincronizados. También acepta escribir en 24 h ("14:30" pasa a "02:30 p. m.").
 *
 * Emite igual que `FechaInput`: solo una hora real y completa, o '' cuando el campo queda vacío o se
 * abandona a medio escribir.
 */
export function HoraInput({ valor, onCambiar, required, disabled, id, className }: HoraInputProps) {
  const inicial = hora24APartes(valor)
  const [texto, setTexto] = useState(inicial?.texto ?? '')
  const [pm, setPm] = useState(inicial?.pm ?? false)
  const [valorVisto, setValorVisto] = useState(valor)
  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState({ arriba: false, derecha: false })
  const [salioIncompleto, setSalioIncompleto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const lista = useRef<HTMLDivElement>(null)

  // La base devuelve 'HH:MM:SS'; hacia afuera siempre se compara y se emite 'HH:MM'.
  const valorActual = inicial?.valor ?? ''
  const horaTexto = interpretarHora(texto, pm)?.valor ?? ''

  // Si el valor cambia desde afuera (reiniciar el formulario), el texto lo sigue.
  if (valor !== valorVisto) {
    setValorVisto(valor)
    if (valorActual !== horaTexto) {
      setTexto(inicial?.texto ?? '')
      if (inicial) setPm(inicial.pm)
      setSalioIncompleto(false)
    }
  }

  let error: string | null = null
  if (texto.length === 5 && !horaTexto) error = 'Esa hora no es válida.'
  else if (salioIncompleto && texto && !horaTexto) error = 'Escribe la hora completa: hh:mm.'

  // Ranura de la lista a la que se desplaza: la de la hora escrita, redondeada hacia abajo.
  const ranuraCercana = horaTexto
    ? `${horaTexto.slice(0, 2)}:${pad(Math.floor(Number(horaTexto.slice(3)) / MINUTOS_POR_RANURA) * MINUTOS_POR_RANURA)}`
    : RANURA_INICIAL

  useEffect(() => {
    if (!abierto || !lista.current) return
    const fila = lista.current.querySelector<HTMLElement>(`[data-hora="${ranuraCercana}"]`)
    if (fila) lista.current.scrollTop = fila.offsetTop - lista.current.clientHeight / 2 + fila.clientHeight / 2
  }, [abierto, ranuraCercana])

  function abrir() {
    if (abierto || disabled) return
    const caja = contenedor.current?.getBoundingClientRect()
    if (caja) setPosicion(posicionDesplegable(caja, ANCHO_LISTA, ALTO_LISTA))
    setAbierto(true)
  }

  function manejarCambio(e: ChangeEvent<HTMLInputElement>) {
    const nuevo = enmascararHora(e.target.value)
    setSalioIncompleto(false)
    abrir()
    const hora = interpretarHora(nuevo, pm)
    if (hora) {
      setTexto(hora.texto)
      setPm(hora.pm)
      if (hora.valor !== valorActual) onCambiar(hora.valor)
    } else {
      setTexto(nuevo)
      if (nuevo === '' && valor !== '') onCambiar('')
    }
  }

  function cambiarMeridiano(nuevoPm: boolean) {
    setPm(nuevoPm)
    const hora = interpretarHora(texto, nuevoPm)
    if (hora && hora.valor !== valorActual) onCambiar(hora.valor)
  }

  function elegir(ranura: string) {
    const hora = hora24APartes(ranura)
    if (!hora) return
    setTexto(hora.texto)
    setPm(hora.pm)
    setSalioIncompleto(false)
    setAbierto(false)
    if (hora.valor !== valorActual) onCambiar(hora.valor)
  }

  function manejarBlur(e: FocusEvent<HTMLDivElement>) {
    if (contenedor.current?.contains(e.relatedTarget)) return
    setAbierto(false)
    // Lo que quedó a medias no se guarda: el campo cuenta como vacío hasta que la hora esté bien.
    if (texto !== '' && !horaTexto) {
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
    } else if (e.key === 'a' || e.key === 'A') {
      // Se cancela la tecla para que no dispare un `onChange` que pisaría el meridiano recién puesto.
      e.preventDefault()
      cambiarMeridiano(false)
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault()
      cambiarMeridiano(true)
    }
  }

  function alternarLista() {
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
        placeholder="hh:mm"
        className={`${CLASE_INPUT} pr-[5.5rem] ${error ? 'border-coral!' : ''}`}
        required={required}
        disabled={disabled}
        value={texto}
        onChange={manejarCambio}
        onFocus={abrir}
        onClick={abrir}
        onKeyDown={manejarTecla}
        aria-invalid={error ? true : undefined}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      />
      <div className="absolute right-0 top-0 flex h-[38px] items-center">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          // Sin esto el clic le quita el foco al campo y la lista se cerraría.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => cambiarMeridiano(!pm)}
          className="rounded-md bg-azul-niebla px-1.5 py-0.5 text-xs font-semibold text-azul-institucional transition-colors duration-150 hover:bg-azul-institucional hover:text-white"
          aria-label={pm ? 'p. m. — cambiar a a. m.' : 'a. m. — cambiar a p. m.'}
          title={pm ? 'Cambiar a a. m.' : 'Cambiar a p. m.'}
        >
          {pm ? 'p. m.' : 'a. m.'}
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={alternarLista}
          className="flex h-full w-9 items-center justify-center rounded-r-lg text-tinta-suave transition-colors duration-150 hover:text-azul-institucional"
          aria-label={abierto ? 'Cerrar lista de horas' : 'Abrir lista de horas'}
          title={abierto ? 'Cerrar lista de horas' : 'Abrir lista de horas'}
        >
          <Clock size={16} />
        </button>
      </div>

      {error && <span className="mt-1 block text-xs text-coral">{error}</span>}

      {abierto && (
        <div
          ref={lista}
          role="listbox"
          aria-label="Elegir hora"
          // El foco se queda en el campo mientras se usa la lista, así se puede seguir escribiendo.
          onMouseDown={(e) => e.preventDefault()}
          className={`absolute z-30 max-h-60 w-40 overflow-y-auto rounded-xl border border-azul-niebla bg-white p-1 text-tinta shadow-xl ${
            posicion.arriba ? 'bottom-full mb-1' : 'top-[38px] mt-1'
          } ${posicion.derecha ? 'right-0' : 'left-0'}`}
        >
          {RANURAS.map((ranura) => {
            const elegida = ranura === horaTexto
            return (
              <button
                key={ranura}
                type="button"
                role="option"
                aria-selected={elegida}
                tabIndex={-1}
                data-hora={ranura}
                onClick={() => elegir(ranura)}
                className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors duration-150 ${
                  elegida ? 'bg-azul-institucional font-semibold text-white' : 'hover:bg-azul-niebla'
                }`}
              >
                {etiquetaHora(ranura)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
