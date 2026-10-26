import { useState } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { CLASE_INPUT } from '../ui/Campo'

interface EtiquetasInputProps {
  valores: string[]
  onCambiar: (valores: string[]) => void
  /** Se ofrecen como atajos, pero se puede escribir cualquier otro texto. */
  sugerencias: string[]
  placeholder?: string
  maxLongitud: number
  /** Cantidad máxima de elementos, si el campo la define. */
  maximo?: number
  invalido?: boolean
}

/** Control de un campo ETIQUETAS: lista libre de textos (p. ej. logotipos), sin repetidos. */
export function EtiquetasInput({
  valores,
  onCambiar,
  sugerencias,
  placeholder,
  maxLongitud,
  maximo,
  invalido = false,
}: EtiquetasInputProps) {
  const [texto, setTexto] = useState('')
  const lleno = maximo !== undefined && valores.length >= maximo

  // La base descarta repetidos sin distinguir mayúsculas: aquí igual.
  const yaEsta = (etiqueta: string) => valores.some((v) => v.toLowerCase() === etiqueta.toLowerCase())

  function agregar(etiqueta: string) {
    const limpia = etiqueta.trim()
    if (!limpia || lleno) return
    if (yaEsta(limpia)) {
      toast.info('Ya está agregado.')
      return
    }
    onCambiar([...valores, limpia])
  }

  function quitar(etiqueta: string) {
    onCambiar(valores.filter((v) => v !== etiqueta))
  }

  const pendientes = sugerencias.filter((s) => !yaEsta(s))

  return (
    <div>
      {valores.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {valores.map((etiqueta) => (
            <span
              key={etiqueta}
              className="inline-flex items-center gap-1 rounded-full bg-azul-niebla px-2.5 py-1 text-xs text-azul-institucional"
            >
              {etiqueta}
              <button type="button" onClick={() => quitar(etiqueta)} aria-label={`Quitar ${etiqueta}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className={`${CLASE_INPUT} ${invalido ? 'border-coral' : ''}`}
        placeholder={lleno ? 'Llegaste al máximo de elementos' : (placeholder ?? 'Escribe y presiona Enter…')}
        value={texto}
        maxLength={maxLongitud}
        disabled={lleno}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            agregar(texto)
            setTexto('')
          } else if (e.key === 'Backspace' && texto === '' && valores.length > 0) {
            quitar(valores[valores.length - 1])
          }
        }}
        // Lo que quedó escrito sin presionar Enter también cuenta.
        onBlur={() => {
          if (texto.trim()) {
            agregar(texto)
            setTexto('')
          }
        }}
      />
      {pendientes.length > 0 && !lleno && (
        <div className="mt-2 flex flex-wrap gap-2">
          {pendientes.map((sugerencia) => (
            <button
              key={sugerencia}
              type="button"
              onClick={() => agregar(sugerencia)}
              className="rounded-full border border-dashed border-azul-institucional px-2.5 py-1 text-xs text-azul-institucional"
            >
              + {sugerencia}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
