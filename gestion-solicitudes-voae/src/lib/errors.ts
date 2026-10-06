interface ErrorConContexto {
  message?: string
  context?: { json?: () => Promise<unknown> }
}

function esErrorConContexto(error: unknown): error is ErrorConContexto {
  return typeof error === 'object' && error !== null && 'message' in error
}

/**
 * Los triggers de la base devuelven mensajes en español explicando la regla violada
 * (p. ej. "Transición de estado no permitida"). Para errores de Edge Functions, el detalle
 * útil viene en error.context (una Response) en vez de error.message.
 */
export async function mensajeError(error: unknown, fallback = 'Ocurrió un error inesperado.'): Promise<string> {
  if (!esErrorConContexto(error)) return fallback

  if (error.context?.json) {
    try {
      const detalle = await error.context.json()
      if (detalle && typeof detalle === 'object' && 'error' in detalle && typeof (detalle as { error?: unknown }).error === 'string') {
        return (detalle as { error: string }).error
      }
    } catch {
      // sin cuerpo JSON legible; se usa error.message más abajo
    }
  }

  return error.message ?? fallback
}
