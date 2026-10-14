import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'
import { Button } from '../components/ui/Button'
import { PasswordInput } from '../components/ui/PasswordInput'
import { MarcaITickets } from '../components/MarcaITickets'
import { LoginBannerTicket } from './LoginBannerTicket'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { session, cargando } = useAuth()
  const ubicacion = useLocation()
  const [modo, setModo] = useState<'ingresar' | 'recuperar'>('ingresar')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!cargando && session) {
    const destino = (ubicacion.state as { desde?: Location })?.desde?.pathname ?? '/'
    return <Navigate to={destino} replace />
  }

  async function manejarIngresar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password })
    setEnviando(false)
    if (error) toast.error(await mensajeError(error, 'No se pudo iniciar sesión.'))
  }

  async function manejarRecuperar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/restablecer-password`,
    })
    setEnviando(false)
    if (error) {
      toast.error(await mensajeError(error, 'No se pudo enviar el correo.'))
    } else {
      toast.success('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.')
      setModo('ingresar')
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <LoginBannerTicket />

      <div className="flex flex-1 items-center justify-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* En móvil el banner está oculto, así que la marca y el motivo del sistema van aquí arriba. */}
          <div className="mb-6 lg:hidden">
            <MarcaITickets tamano="grande" className="text-azul-noche" />
            <p className="mt-1 text-sm text-tinta-suave">Gestión de solicitudes de diseño · VOAE</p>
          </div>
          <MarcaITickets className="mb-3 hidden text-azul-noche lg:block" />

          <h2 className="mb-1 text-2xl font-bold text-azul-noche">
            {modo === 'ingresar' ? 'Inicia sesión' : 'Recuperar contraseña'}
          </h2>
          <p className="mb-6 text-sm text-tinta-suave">
            {modo === 'ingresar'
              ? 'Usa el correo y la contraseña que te asignó el administrador.'
              : 'Te enviaremos un enlace a tu correo institucional.'}
          </p>

          <form onSubmit={modo === 'ingresar' ? manejarIngresar : manejarRecuperar} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-tinta" htmlFor="correo">
                Correo
              </label>
              <input
                id="correo"
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full rounded-lg border border-azul-niebla px-3 py-2 text-sm outline-none focus:border-azul-institucional"
              />
            </div>

            {modo === 'ingresar' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-tinta" htmlFor="password">
                  Contraseña
                </label>
                <PasswordInput
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" cargando={enviando} className="w-full">
              {modo === 'ingresar' ? 'Ingresar' : 'Enviar enlace'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setModo(modo === 'ingresar' ? 'recuperar' : 'ingresar')}
            className="mt-4 text-sm font-medium text-azul-institucional hover:underline"
          >
            {modo === 'ingresar' ? '¿Olvidaste tu contraseña?' : 'Volver a iniciar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
