import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'
import { Button } from '../components/ui/Button'

/** Página a la que llega el enlace de "¿Olvidaste tu contraseña?"; Supabase ya crea la sesión de recuperación desde la URL. */
export function RestablecerPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function manejarEnviar(evento: FormEvent) {
    evento.preventDefault()

    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmar) {
      toast.error('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setEnviando(false)

    if (error) {
      toast.error(await mensajeError(error, 'No se pudo restablecer la contraseña.'))
      return
    }

    toast.success('Contraseña restablecida. Ya puedes iniciar sesión.')
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-azul-noche">Restablecer contraseña</h1>
        <p className="mb-6 text-sm text-tinta-suave">Elige una contraseña nueva para tu cuenta.</p>

        <form onSubmit={manejarEnviar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-tinta" htmlFor="nueva">
              Contraseña nueva
            </label>
            <input
              id="nueva"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-azul-niebla px-3 py-2 text-sm outline-none focus:border-azul-institucional"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-tinta" htmlFor="confirmar">
              Confirmar contraseña
            </label>
            <input
              id="confirmar"
              type="password"
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full rounded-lg border border-azul-niebla px-3 py-2 text-sm outline-none focus:border-azul-institucional"
            />
          </div>

          <Button type="submit" cargando={enviando} className="w-full">
            Restablecer contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}
