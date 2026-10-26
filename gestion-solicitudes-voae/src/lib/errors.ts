interface ErrorConContexto {
  message?: string
  /** PostgREST: código SQLSTATE (p. ej. `23505`). Supabase Auth: código como `invalid_credentials`. */
  code?: string
  context?: { json?: () => Promise<unknown> }
}

/** Los errores de Supabase Auth llegan en inglés: se traducen por código o, si no trae, por mensaje (E-11). */
const ERRORES_AUTH: { codigo: string; mensaje: RegExp; texto: string }[] = [
  { codigo: 'invalid_credentials', mensaje: /invalid login credentials/i, texto: 'Correo o contraseña incorrectos.' },
  { codigo: 'email_not_confirmed', mensaje: /email not confirmed/i, texto: 'El correo todavía no está confirmado.' },
  {
    codigo: 'over_email_send_rate_limit',
    mensaje: /email rate limit/i,
    texto: 'Se enviaron demasiados correos. Espera unos minutos y vuelve a intentarlo.',
  },
  {
    codigo: 'over_request_rate_limit',
    mensaje: /rate limit|too many requests/i,
    texto: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
  },
  {
    codigo: 'same_password',
    mensaje: /should be different from the old password/i,
    texto: 'La nueva contraseña debe ser distinta de la anterior.',
  },
  { codigo: 'weak_password', mensaje: /password should be at least/i, texto: 'La contraseña es demasiado débil o corta.' },
]

/** Valor repetido en una restricción única (`23505`): nunca se muestra el mensaje crudo de Postgres (E-12). */
const MENSAJES_UNICIDAD: Record<string, string> = {
  ukArea_Prefijo: 'Ese prefijo ya está en uso.',
}

function traducirConocido(error: ErrorConContexto): string | null {
  const mensaje = error.message ?? ''
  const auth = ERRORES_AUTH.find((e) => e.codigo === error.code || e.mensaje.test(mensaje))
  if (auth) return auth.texto
  if (error.code === '23505' || /duplicate key value violates unique constraint/i.test(mensaje)) {
    const restriccion = /unique constraint "([^"]+)"/.exec(mensaje)?.[1]
    return (restriccion && MENSAJES_UNICIDAD[restriccion]) || 'Ya existe un registro con ese valor.'
  }
  return null
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

  const conocido = traducirConocido(error)
  if (conocido) return conocido

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
