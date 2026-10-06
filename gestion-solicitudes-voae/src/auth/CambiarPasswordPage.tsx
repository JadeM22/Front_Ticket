import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'
import { Button } from '../components/ui/Button'
import { useAuth } from './useAuth'

function calcularFuerza(password: string): { puntaje: number; etiqueta: string; color: string } {
  let puntaje = 0
  if (password.length >= 8) puntaje++
  if (password.length >= 12) puntaje++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) puntaje++
  if (/\d/.test(password)) puntaje++
  if (/[^A-Za-z0-9]/.test(password)) puntaje++

  if (puntaje <= 1) return { puntaje, etiqueta: 'Débil', color: 'bg-coral' }
  if (puntaje <= 3) return { puntaje, etiqueta: 'Aceptable', color: 'bg-ambar' }
  return { puntaje, etiqueta: 'Fuerte', color: 'bg-menta-profundo' }
}

export function CambiarPasswordPage() {
  const { perfil, recargarPerfil } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (perfil && !perfil.debe_cambiar_password) return <Navigate to="/" replace />

  const fuerza = calcularFuerza(password)

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
    if (error) {
      toast.error(await mensajeError(error, 'No se pudo cambiar la contraseña.'))
      setEnviando(false)
      return
    }

    await recargarPerfil()
    setEnviando(false)
    toast.success('Contraseña actualizada.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-azul-noche">Cambia tu contraseña</h1>
        <p className="mb-6 text-sm text-tinta-suave">
          Es tu primer ingreso. Debes definir una contraseña nueva antes de continuar.
        </p>

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
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-azul-niebla">
                  <div
                    className={`h-full transition-all duration-200 ${fuerza.color}`}
                    style={{ width: `${(fuerza.puntaje / 5) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-tinta-suave">Seguridad: {fuerza.etiqueta}</p>
              </div>
            )}
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
            Guardar contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}
