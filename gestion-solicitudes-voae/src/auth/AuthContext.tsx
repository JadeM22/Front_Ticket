import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { obtenerPerfilActual } from '../data/perfil'
import { mensajeError } from '../lib/errors'
import type { Perfil, RolNombre } from '../types/domain'
import { AuthContext } from './contexto'
import { MINUTOS_INACTIVIDAD, useCierrePorInactividad } from './useCierrePorInactividad'

export interface AuthContextValor {
  session: Session | null
  perfil: Perfil | null
  cargando: boolean
  /** `true` si la última carga del perfil falló (p. ej. error de red o de la base). */
  perfilConError: boolean
  tieneRol: (rol: RolNombre) => boolean
  recargarPerfil: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)
  const [perfilConError, setPerfilConError] = useState(false)

  const cargarPerfil = useCallback(async (authId: string | undefined) => {
    if (!authId) {
      setPerfil(null)
      setPerfilConError(false)
      return
    }
    try {
      const nuevoPerfil = await obtenerPerfilActual(authId)
      setPerfil(nuevoPerfil)
      setPerfilConError(false)
    } catch (error) {
      // Nunca se queda la pantalla de carga para siempre: si falla, se avisa y se libera cargando
      // (ver el `finally` de `sincronizar`), aunque el perfil quede en null.
      setPerfil(null)
      setPerfilConError(true)
      toast.error(await mensajeError(error, 'No se pudo cargar tu perfil. Intenta recargar la página.'))
    }
  }, [])

  // `undefined` = sin sesión; `null` = todavía no se ha resuelto la primera sesión.
  const authIdCargado = useRef<string | undefined | null>(null)

  useEffect(() => {
    let activo = true

    /**
     * Supabase emite eventos de sesión cada vez que la pestaña vuelve a estar visible o se renueva
     * el token. Solo se muestra la pantalla de carga (que desmonta la página y borraría cualquier
     * formulario a medio llenar) cuando de verdad cambia el usuario; si es el mismo, la sesión se
     * actualiza en silencio.
     */
    async function sincronizar(nuevaSession: Session | null) {
      if (!activo) return
      setSession(nuevaSession)

      const authId = nuevaSession?.user.id
      if (authIdCargado.current === authId) return
      authIdCargado.current = authId

      setCargando(true)
      try {
        await cargarPerfil(authId)
      } finally {
        if (activo && authIdCargado.current === authId) setCargando(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => sincronizar(data.session))

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, nuevaSession) => {
      void sincronizar(nuevaSession)
    })

    return () => {
      activo = false
      suscripcion.subscription.unsubscribe()
    }
  }, [cargarPerfil])

  const recargarPerfil = useCallback(async () => {
    await cargarPerfil(session?.user.id)
  }, [cargarPerfil, session])

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // Solo se cierra la sesión de este navegador (`local`): la misma cuenta abierta en otro equipo
  // lleva su propio conteo de inactividad.
  const cerrarPorInactividad = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (!error) toast.info(`Tu sesión se cerró tras ${MINUTOS_INACTIVIDAD} minutos sin actividad.`)
  }, [])

  useCierrePorInactividad(session ? 'activa' : cargando ? 'pendiente' : 'sin-sesion', cerrarPorInactividad)

  const tieneRol = useCallback((rol: RolNombre) => perfil?.roles.includes(rol) ?? false, [perfil])

  const valor = useMemo<AuthContextValor>(
    () => ({ session, perfil, cargando, perfilConError, tieneRol, recargarPerfil, cerrarSesion }),
    [session, perfil, cargando, perfilConError, tieneRol, recargarPerfil, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
