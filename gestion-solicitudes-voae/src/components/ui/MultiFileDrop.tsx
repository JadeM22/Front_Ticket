import { useRef, useState } from 'react'
import { UploadCloud, X, Paperclip } from 'lucide-react'

interface MultiFileDropProps {
  archivos: File[]
  onCambiar: (archivos: File[]) => void
  espacioDisponible: number
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MultiFileDrop({ archivos, onCambiar, espacioDisponible }: MultiFileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const lleno = espacioDisponible <= 0

  function agregar(nuevos: FileList | null) {
    if (!nuevos || lleno) return
    const disponibles = Array.from(nuevos).slice(0, espacioDisponible)
    onCambiar([...archivos, ...disponibles])
  }

  function quitar(indice: number) {
    onCambiar(archivos.filter((_, i) => i !== indice))
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={lleno}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!lleno) setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          agregar(e.dataTransfer.files)
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
          arrastrando ? 'border-menta bg-menta-bruma' : 'border-azul-niebla bg-azul-niebla/30 hover:bg-azul-niebla/50'
        }`}
      >
        <UploadCloud className="text-azul-institucional" size={24} />
        <span className="text-sm font-medium text-tinta">
          {lleno ? 'Llegaste al máximo de adjuntos' : 'Haz clic o arrastra archivos (máx. 50 MB cada uno)'}
        </span>
      </button>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => agregar(e.target.files)} />

      {archivos.length > 0 && (
        <ul className="space-y-2">
          {archivos.map((archivo, indice) => (
            <li key={`${archivo.name}-${indice}`} className="flex items-center justify-between gap-3 rounded-lg border border-azul-niebla p-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <Paperclip size={14} className="flex-none text-azul-institucional" />
                <span className="truncate text-sm text-tinta">{archivo.name}</span>
                <span className="flex-none text-xs text-tinta-suave">{formatearTamano(archivo.size)}</span>
              </div>
              <button type="button" onClick={() => quitar(indice)} aria-label={`Quitar ${archivo.name}`}>
                <X size={16} className="text-tinta-suave hover:text-coral" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
