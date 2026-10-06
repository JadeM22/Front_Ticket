import { useState } from 'react'
import { X } from 'lucide-react'
import { CLASE_INPUT } from '../ui/Campo'

const SUGERENCIAS = ['Logo de VOAE', 'Logo de la UNAH', 'Logo de la Facultad']

interface EtiquetasInputProps {
  valores: string[]
  onCambiar: (valores: string[]) => void
}

export function EtiquetasInput({ valores, onCambiar }: EtiquetasInputProps) {
  const [texto, setTexto] = useState('')

  function agregar(etiqueta: string) {
    const limpia = etiqueta.trim()
    if (!limpia || valores.includes(limpia)) return
    onCambiar([...valores, limpia])
  }

  function quitar(etiqueta: string) {
    onCambiar(valores.filter((v) => v !== etiqueta))
  }

  return (
    <div>
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
      <input
        className={CLASE_INPUT}
        placeholder="Escribe y presiona Enter…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            agregar(texto)
            setTexto('')
          }
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {SUGERENCIAS.filter((s) => !valores.includes(s)).map((sugerencia) => (
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
    </div>
  )
}
