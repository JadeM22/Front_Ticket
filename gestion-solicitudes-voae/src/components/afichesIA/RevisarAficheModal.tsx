import { useState } from 'react'
import { ArrowRight, Zap } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { CLASE_INPUT } from '../ui/Campo'
import { INTENTOS_MAXIMOS_IA } from '../../data/afichesIA'
import type { DecisionIA } from '../../types/domain'

interface RevisarAficheModalProps {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: (decision: DecisionIA, comentario: string) => Promise<void>
  titulo: string
  /**
   * Intento del envío que se revisa (1 a 5): flujo de Aprobación (Aprobar / Denegar). Sin intento es la
   * decisión única de una confirmación (Confirmar / Rechazar): no hay reenvíos, así que rechazar es
   * definitivo.
   */
  intento?: number
  /** Solicitud excepcional: muestra el ⚡ y el plazo corto arriba del formulario. */
  excepcional?: boolean
  /**
   * Aprobación excepcional todavía sin responder (Parte 62): antes del dictamen hay que aceptarla o
   * rechazarla con `onResponderExcepcional`. Devuelve `true` si se aceptó y hay un archivo que dictaminar
   * (el diálogo pasa al paso 2); `false` lo deja como está.
   */
  pendienteAceptar?: boolean
  onResponderExcepcional?: (aceptar: boolean, motivo: string) => Promise<boolean>
}

const TEXTOS = {
  aprobacion: { aprobar: 'Aprobar', rechazar: 'Denegar' },
  confirmacion: { aprobar: 'Confirmar', rechazar: 'Rechazar' },
} as const

export function RevisarAficheModal({ abierto, titulo, excepcional = false, ...resto }: RevisarAficheModalProps) {
  return (
    <Modal abierto={abierto} onCerrar={resto.onCerrar} titulo={titulo}>
      {abierto && (
        <div className="space-y-4">
          {excepcional && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ambar-bruma/60 px-3 py-2 text-xs font-medium text-ambar">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Zap size={12} className="fill-current" aria-hidden /> Excepcional
              </span>
              Solicitud excepcional: plazo de 2 días hábiles.
            </div>
          )}
          <Pasos {...resto} />
        </div>
      )}
    </Modal>
  )
}

type PropsPasos = Pick<
  RevisarAficheModalProps,
  'onCerrar' | 'onConfirmar' | 'intento' | 'pendienteAceptar' | 'onResponderExcepcional'
>

/** Con una aprobación excepcional pendiente arranca en el paso 1 (aceptar); si no, va directo al dictamen. */
function Pasos({ pendienteAceptar = false, onResponderExcepcional, ...resto }: PropsPasos) {
  const [conPasos] = useState(pendienteAceptar && onResponderExcepcional != null)
  const [paso, setPaso] = useState<1 | 2>(conPasos ? 1 : 2)

  if (paso === 1 && onResponderExcepcional) {
    return (
      <>
        <PasosExcepcional actual={1} />
        <AceptarExcepcional
          onCerrar={resto.onCerrar}
          onResponder={async (aceptar, motivo) => {
            if (await onResponderExcepcional(aceptar, motivo)) setPaso(2)
          }}
        />
      </>
    )
  }
  return (
    <>
      {conPasos && <PasosExcepcional actual={2} />}
      <Formulario {...resto} />
    </>
  )
}

function AceptarExcepcional({
  onCerrar,
  onResponder,
}: {
  onCerrar: () => void
  onResponder: (aceptar: boolean, motivo: string) => Promise<void>
}) {
  const [aceptar, setAceptar] = useState(true)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const faltaMotivo = !aceptar && !motivo.trim()

  async function confirmar() {
    if (faltaMotivo) return
    setEnviando(true)
    try {
      await onResponder(aceptar, motivo.trim())
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-tinta-suave">Antes de dictaminar el archivo, acepta o rechaza la solicitud excepcional.</p>
      <OpcionesDecision aprobar="Aceptar" rechazar="Rechazar" valor={aceptar} onCambiar={setAceptar} />
      {!aceptar && (
        <>
          <p className="text-xs font-semibold text-coral">La solicitud quedará rechazada y no se revisará el archivo.</p>
          <textarea
            className={CLASE_INPUT}
            rows={4}
            placeholder="Explica el motivo del rechazo (obligatorio)…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button variante="fantasma" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button variante={aceptar ? 'primario' : 'peligro'} cargando={enviando} disabled={faltaMotivo} onClick={confirmar}>
          {aceptar ? 'Aceptar y continuar' : 'Rechazar'}
        </Button>
      </div>
    </div>
  )
}

function Formulario({ onCerrar, onConfirmar, intento }: Pick<RevisarAficheModalProps, 'onCerrar' | 'onConfirmar' | 'intento'>) {
  const [decision, setDecision] = useState<DecisionIA>('APROBADO')
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const esDefinitivo = intento === undefined || intento >= INTENTOS_MAXIMOS_IA
  const faltaComentario = decision === 'RECHAZADO' && !comentario.trim()
  const textos = intento === undefined ? TEXTOS.confirmacion : TEXTOS.aprobacion

  async function confirmar() {
    if (faltaComentario) return
    setEnviando(true)
    try {
      await onConfirmar(decision, comentario)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <OpcionesDecision
        aprobar={textos.aprobar}
        rechazar={textos.rechazar}
        valor={decision === 'APROBADO'}
        onCambiar={(aprobar) => setDecision(aprobar ? 'APROBADO' : 'RECHAZADO')}
      />

      {intento !== undefined && (
        <p className="text-xs text-tinta-suave">
          Intento {intento} de {INTENTOS_MAXIMOS_IA}.
        </p>
      )}

      {decision === 'RECHAZADO' && (
        <p className={`text-xs ${esDefinitivo ? 'font-semibold text-coral' : 'text-ambar'}`}>
          {intento === undefined
            ? 'La decisión es definitiva: la solicitud quedará rechazada.'
            : esDefinitivo
              ? 'Es el último intento: si lo deniegas, la solicitud queda denegada definitivamente.'
              : 'El solicitante podrá corregir y reenviar el archivo.'}
        </p>
      )}

      <textarea
        className={CLASE_INPUT}
        rows={4}
        placeholder={
          decision === 'RECHAZADO'
            ? intento === undefined
              ? 'Explica el motivo del rechazo (obligatorio)…'
              : 'Explica qué debe corregir (obligatorio)…'
            : 'Comentario (opcional)'
        }
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
      />

      <div className="flex justify-end gap-2">
        <Button variante="fantasma" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          variante={decision === 'APROBADO' ? 'primario' : 'peligro'}
          cargando={enviando}
          disabled={faltaComentario}
          onClick={confirmar}
        >
          {decision === 'APROBADO' ? textos.aprobar : textos.rechazar}
        </Button>
      </div>
    </div>
  )
}

/** Dos botones excluyentes: la opción positiva (menta) y la negativa (coral). */
export function OpcionesDecision({
  aprobar,
  rechazar,
  valor,
  onCambiar,
}: {
  aprobar: string
  rechazar: string
  valor: boolean
  onCambiar: (aprobar: boolean) => void
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-pressed={valor}
        onClick={() => onCambiar(true)}
        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
          valor ? 'border-menta-profundo bg-menta-bruma text-menta-profundo' : 'border-azul-niebla text-tinta-suave'
        }`}
      >
        {aprobar}
      </button>
      <button
        type="button"
        aria-pressed={!valor}
        onClick={() => onCambiar(false)}
        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
          !valor ? 'border-coral bg-coral-bruma text-coral' : 'border-azul-niebla text-tinta-suave'
        }`}
      >
        {rechazar}
      </button>
    </div>
  )
}

/** Indicador de los dos pasos de una aprobación excepcional: aceptar la solicitud y luego dictaminarla. */
export function PasosExcepcional({ actual }: { actual: 1 | 2 }) {
  const clase = (paso: 1 | 2) =>
    paso === actual
      ? 'rounded-full bg-azul-institucional px-2.5 py-1 font-semibold text-white'
      : paso < actual
        ? 'rounded-full bg-menta-bruma px-2.5 py-1 font-semibold text-menta-profundo'
        : 'rounded-full bg-azul-niebla px-2.5 py-1 text-tinta-suave'
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs" aria-label="Pasos">
      <li className={clase(1)} aria-current={actual === 1 ? 'step' : undefined}>
        1. Aceptar solicitud
      </li>
      <li aria-hidden>
        <ArrowRight size={14} className="text-tinta-suave" />
      </li>
      <li className={clase(2)} aria-current={actual === 2 ? 'step' : undefined}>
        2. Dictamen
      </li>
    </ol>
  )
}
