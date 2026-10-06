import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { obtenerPerfilActual } from '../data/perfil'
import type { Perfil, RolNombre } from '../types/domain'
import { AuthContext } from './contexto'

export interface AuthContextValor {
  session: Session | null
  perfil: Perfil | null
  cargando: boolean
  tieneRol: (rol: RolNombre) => boolean
  recargarPerfil: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargarPerfil = useCallback(async (authId: string | undefined) => {
    if (!authId) {
      setPerfil(null)
      return
    }
    const nuevoPerfil = await obtenerPerfilActual(authId)
    setPerfil(nuevoPerfil)
  }, [])

  useEffect(() => {
    let activo = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!activo) return
      setSession(data.session)
      await cargarPerfil(data.session?.user.id)
      if (activo) setCargando(false)
    })

    const { data: suscripcion } = supabase.auth.onAuthStateChange(async (_evento, nuevaSession) => {
      if (!activo) return
      setSession(nuevaSession)
      setCargando(true)
      await cargarPerfil(nuevaSession?.user.id)
      if (activo) setCargando(false)
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

  const tieneRol = useCallback((rol: RolNombre) => perfil?.roles.includes(rol) ?? false, [perfil])

  const valor = useMemo<AuthContextValor>(
    () => ({ session, perfil, cargando, tieneRol, recargarPerfil, cerrarSesion }),
    [session, perfil, cargando, tieneRol, recargarPerfil, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
