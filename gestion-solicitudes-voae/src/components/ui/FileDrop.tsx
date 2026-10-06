import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { LIMITE_BYTES_ENTREGABLE } from '../../lib/entregables'

interface FileDropProps {
  archivo: File | null
  onArchivo: (archivo: File | null) => void
  aceptar?: string
  error?: string | null
}

export function FileDrop({ archivo, onArchivo, aceptar, error }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)

  function manejarArchivo(nuevo: File | null) {
    if (nuevo && nuevo.size > LIMITE_BYTES_ENTREGABLE) {
      onArchivo(null)
      return
    }
    onArchivo(nuevo)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          manejarArchivo(e.dataTransfer.files[0] ?? null)
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-150 ${
          arrastrando ? 'border-menta bg-menta-bruma' : 'border-azul-niebla bg-azul-niebla/30 hover:bg-azul-niebla/50'
        }`}
      >
        <UploadCloud className="text-azul-institucional" size={24} />
        <span className="text-sm font-medium text-tinta">
          {archivo ? archivo.name : 'Haz clic o arrastra un archivo (máx. 50 MB)'}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={aceptar}
        className="hidden"
        onChange={(e) => manejarArchivo(e.target.files?.[0] ?? null)}
      />
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </div>
  )
}
