import { useEffect } from 'react'

export const MINUTOS_INACTIVIDAD = 20

const LIMITE_INACTIVIDAD_MS = MINUTOS_INACTIVIDAD * 60 * 1000
const INTERVALO_REVISION_MS = 15 * 1000
const INTERVALO_REGISTRO_MS = 5 * 1000
const CLAVE_ULTIMA_ACTIVIDAD = 'voae:ultima-actividad'
const EVENTOS_ACTIVIDAD = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const

export type EstadoSesion = 'pendiente' | 'activa' | 'sin-sesion'

function leerUltimaActividad(): number | null {
  try {
    const valor = Number(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD))
    return Number.isFinite(valor) && valor > 0 ? valor : null
  } catch {
    return null
  }
}

function guardarUltimaActividad(momento: number) {
  try {
    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(momento))
  } catch {
    // Sin localStorage (modo privado estricto) el control sigue funcionando, pero solo en esta pestaña.
  }
}

function borrarUltimaActividad() {
  try {
    localStorage.removeItem(CLAVE_ULTIMA_ACTIVIDAD)
  } catch {
    // Nada que borrar.
  }
}

/**
 * Cierra la sesión tras `MINUTOS_INACTIVIDAD` sin que el usuario toque la página.
 *
 * La última actividad se guarda en `localStorage`, no en memoria, por dos razones: todas las
 * pestañas del sistema comparten el mismo reloj (trabajar en una mantiene vivas las demás) y el
 * plazo sigue contando con la pestaña cerrada, así que volver al día siguiente pide iniciar sesión.
 *
 * `alExpirar` debe ser estable (`useCallback`). Si falla (p. ej. sin red al despertar el equipo),
 * se reintenta en la siguiente revisión porque la marca de actividad sigue vencida.
 */
export function useCierrePorInactividad(estado: EstadoSesion, alExpirar: () => Promise<void>) {
  useEffect(() => {
    if (estado === 'pendiente') return
    if (estado === 'sin-sesion') {
      // Sin esto, la marca vieja de la sesión anterior cerraría la próxima sesión nada más entrar.
      borrarUltimaActividad()
      return
    }

    let ultimaActividad = leerUltimaActividad()
    if (ultimaActividad === null) {
      ultimaActividad = Date.now()
      guardarUltimaActividad(ultimaActividad)
    }
    let ultimoRegistro = 0
    let cerrando = false

    function revisar(): boolean {
      const referencia = Math.max(ultimaActividad ?? 0, leerUltimaActividad() ?? 0)
      if (Date.now() - referencia < LIMITE_INACTIVIDAD_MS) return false
      if (!cerrando) {
        cerrando = true
        void alExpirar().finally(() => {
          cerrando = false
        })
      }
      return true
    }

    function registrarActividad() {
      const ahora = Date.now()
      if (ahora - ultimoRegistro < INTERVALO_REGISTRO_MS) return
      // Los temporizadores se congelan con el equipo suspendido o la pestaña en segundo plano: el
      // primer movimiento al volver no debe revivir una sesión que ya venció.
      if (revisar()) return
      ultimoRegistro = ahora
      ultimaActividad = ahora
      guardarUltimaActividad(ahora)
    }

    function alVolverAPestana() {
      if (document.visibilityState === 'visible') revisar()
    }

    revisar()
    const intervalo = window.setInterval(revisar, INTERVALO_REVISION_MS)
    for (const evento of EVENTOS_ACTIVIDAD) {
      window.addEventListener(evento, registrarActividad, { passive: true, capture: true })
    }
    document.addEventListener('visibilitychange', alVolverAPestana)

    return () => {
      window.clearInterval(intervalo)
      for (const evento of EVENTOS_ACTIVIDAD) {
        window.removeEventListener(evento, registrarActividad, { capture: true })
      }
      document.removeEventListener('visibilitychange', alVolverAPestana)
    }
  }, [estado, alExpirar])
}
