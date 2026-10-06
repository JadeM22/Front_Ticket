import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'
import { Button } from '../components/ui/Button'
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
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-azul-noche p-10 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #3dd9b3 0, transparent 35%), radial-gradient(circle at 80% 70%, #2f6fb5 0, transparent 40%)',
          }}
        />
        <div className="relative z-10 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-menta">
          <ShieldCheck size={18} /> VOAE
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold leading-tight">Sistema de Gestión de Solicitudes</h1>
          <p className="mt-3 max-w-md text-white/70">
            Vicerrectoría de Orientación y Asuntos Estudiantiles. Solicita, diseña y aprueba piezas de
            comunicación en un solo lugar.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} VOAE</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-sm">
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
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-azul-niebla px-3 py-2 text-sm outline-none focus:border-azul-institucional"
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
