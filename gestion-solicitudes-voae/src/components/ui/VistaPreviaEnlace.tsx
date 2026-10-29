import { normalizarEnlace } from '../../lib/enlaces'

/** Debajo de cualquier input de enlace: muestra cómo quedará normalizado, o el aviso si no es válido. */
export function VistaPreviaEnlace({ valor }: { valor: string }) {
  const texto = valor.trim()
  if (!texto) return null

  const normalizado = normalizarEnlace(texto)
  if (normalizado) {
    return <p className="mt-1 break-all text-xs text-tinta-suave">Se guardará como: {normalizado}</p>
  }
  return <p className="mt-1 text-xs text-coral">Escribe un enlace válido, por ejemplo drive.google.com/…</p>
}
