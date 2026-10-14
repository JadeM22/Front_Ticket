import type { LucideIcon } from 'lucide-react'
import { Building2, CalendarClock, CalendarDays, Layers, PartyPopper, User } from 'lucide-react'
import { EstadoChip } from '../EstadoChip'
import { TagAsignado, TagExcepcional } from './Etiquetas'
import { CronometroDictamen } from '../ui/CronometroDictamen'
import { formatFecha, formatFechaHora } from '../../lib/date'
import { useAuth } from '../../auth/useAuth'
import type { TicketEstadoReal } from '../../types/domain'

const CORRECCIONES_MAXIMAS = 5

interface TicketBoletoProps {
  ticket: TicketEstadoReal
  onClick?: () => void
  mostrarDisenador?: boolean
}

/**
 * Ticket estilo boleto para "Resumen" y "Mis solicitudes": franja azul a la izquierda (arriba en
 * móvil) con código/estado/insignias, perforación con muescas y el resto de los datos en columnas.
 * Conserva todos los campos de `TicketCard`, incluida la visibilidad por rol (el solicitante puro
 * no ve el contador de correcciones).
 */
export function TicketBoleto({ ticket, onClick, mostrarDisenador = true }: TicketBoletoProps) {
  const { tieneRol } = useAuth()
  const correccionesUsadas = ticket.correcciones_usadas ?? 0
  const puedeVerGestion = tieneRol('Jefe de Área') || tieneRol('Diseñador') || tieneRol('Administrador')
  const muestraCorrecciones = puedeVerGestion && correccionesUsadas > 0
  const muestraCronometro = (tieneRol('Jefe de Área') || tieneRol('Diseñador')) && ticket.minutos_habiles_restantes_dictamen != null

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={`Ticket ${ticket.codigo}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-azul-niebla transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menta sm:flex-row"
    >
      {/* Franja azul */}
      <div className="relative flex shrink-0 items-center justify-between gap-3 bg-gradient-to-br from-azul-institucional to-azul-noche px-5 py-3 text-white sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:py-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Ticket</p>
          <p className="font-mono text-lg font-bold tracking-wider">{ticket.codigo}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <EstadoChip estado={ticket.estado_real ?? ''} sobreOscuro />
          {ticket.es_excepcional && <TagExcepcional compacto />}
          {ticket.asignado_por_asignador && (
            <TagAsignado por={ticket.asignado_por_nombre} fecha={ticket.fecha_asignacion} />
          )}
        </div>

        {/* Muescas: semicírculos dentro de la franja azul (arriba y abajo), recortados por el
           overflow-hidden del <article>. Usan el color de fondo real de la página. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-3 left-1/2 hidden h-6 w-6 -translate-x-1/2 rounded-full bg-fondo sm:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-3 left-1/2 hidden h-6 w-6 -translate-x-1/2 rounded-full bg-fondo sm:block"
        />

        {/* Troquelado: línea punteada en el límite entre la franja azul y el cuerpo blanco */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden border-r-2 border-dashed border-white/70 sm:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 border-b-2 border-dashed border-white/70 sm:hidden"
        />
      </div>

      <div className="flex-1">
        {(muestraCorrecciones || (ticket.es_excepcional && ticket.excepcional_estado === 'PENDIENTE')) && (
          <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3 sm:pt-4">
            {muestraCorrecciones && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  correccionesUsadas >= CORRECCIONES_MAXIMAS ? 'bg-coral-bruma text-coral' : 'bg-ambar-bruma text-ambar'
                }`}
              >
                Correcciones {correccionesUsadas}/{CORRECCIONES_MAXIMAS}
              </span>
            )}
            {ticket.es_excepcional && ticket.excepcional_estado === 'PENDIENTE' && (
              <span className="text-xs font-medium text-ambar">Pendiente de aceptación</span>
            )}
          </div>
        )}

        {/* Datos en columnas */}
        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-3 xl:grid-cols-6">
          <Dato icono={Layers} etiqueta="Tipo" valor={ticket.tipo_solicitud ?? '—'} />
          <Dato icono={Building2} etiqueta="Área" valor={ticket.area ?? '—'} />
          <Dato icono={CalendarDays} etiqueta="Creada" valor={formatFechaHora(ticket.fecha_registro)} />
          <Dato icono={PartyPopper} etiqueta="Evento" valor={formatFecha(ticket.fecha_evento)} />
          <Dato icono={CalendarClock} etiqueta="Vence" valor={formatFecha(ticket.fecha_limite)} alerta={Boolean(ticket.fuera_de_plazo)} />
          {mostrarDisenador && (
            <Dato icono={User} etiqueta="Diseñador" valor={ticket.disenador ?? 'Sin asignar'} tenue={!ticket.disenador} />
          )}
        </dl>

        {muestraCronometro && (
          <div className="border-t border-azul-niebla/60 px-5 py-3">
            <CronometroDictamen
              minutos={ticket.minutos_habiles_restantes_dictamen}
              fechaAprobacion={ticket.fecha_aprobacion_automatica}
              compacto
            />
          </div>
        )}
      </div>
    </article>
  )
}

function Dato({
  icono: Icono,
  etiqueta,
  valor,
  alerta,
  tenue,
}: {
  icono: LucideIcon
  etiqueta: string
  valor: string
  alerta?: boolean
  tenue?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-tinta-suave [&_svg]:h-3.5 [&_svg]:w-3.5">
        <Icono /> {etiqueta}
      </dt>
      <dd
        title={valor}
        className={`truncate text-sm ${alerta ? 'font-semibold text-coral' : tenue ? 'italic text-tinta-suave' : 'text-tinta'}`}
      >
        {valor}
      </dd>
    </div>
  )
}
