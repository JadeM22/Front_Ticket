import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Calendar, Clock, PartyPopper, User } from 'lucide-react'
import { EstadoChip } from './EstadoChip'
import { TagAsignado, TagExcepcional, TagLiberado } from './tickets/Etiquetas'
import { CronometroDictamen } from './ui/CronometroDictamen'
import { formatFecha, formatFechaHora } from '../lib/date'
import { esTicketLiberado } from '../lib/tableroDisenador'
import { puedeVerAsignacion } from '../lib/permisos'
import { useAuth } from '../auth/useAuth'
import type { TicketEstadoReal } from '../types/domain'

const CORRECCIONES_MAXIMAS = 5

interface TicketCardProps {
  ticket: TicketEstadoReal
  onClick?: () => void
  /** Pie de la tarjeta: botones como "Tomar" o el selector "Asignar a…", fuera del área clicable principal. */
  accion?: ReactNode
}

export function TicketCard({ ticket, onClick, accion }: TicketCardProps) {
  const { tieneRol, perfil } = useAuth()
  const correccionesUsadas = ticket.correcciones_usadas ?? 0
  const muestraCronometro =
    (tieneRol('Jefe de Área') || tieneRol('Diseñador')) && ticket.minutos_habiles_restantes_dictamen != null
  const liberado = esTicketLiberado(ticket)
  const muestraAsignacion = puedeVerAsignacion(perfil?.roles ?? [])
  const muestraInsignias =
    ticket.es_excepcional || (muestraAsignacion && ticket.asignado_por_asignador) || correccionesUsadas > 0 || liberado

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={`Ticket ${ticket.codigo}`}
      className="flex h-full flex-col rounded-xl bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-institucional"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap rounded-md bg-azul-niebla px-2 py-0.5 font-mono text-xs font-semibold text-azul-institucional">
          {ticket.codigo}
        </span>
        <EstadoChip estado={ticket.estado_real ?? ''} />
      </div>

      {muestraInsignias && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {ticket.es_excepcional && <TagExcepcional />}
          {muestraAsignacion && ticket.asignado_por_asignador && (
            <TagAsignado por={ticket.asignado_por_nombre} fecha={ticket.fecha_asignacion} />
          )}
          {liberado && <TagLiberado />}
          {correccionesUsadas > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                correccionesUsadas >= CORRECCIONES_MAXIMAS ? 'bg-coral-bruma text-coral' : 'bg-ambar-bruma text-ambar'
              }`}
            >
              {ticket.flujo === 'APROBACION_IA' ? 'Rechazos' : 'Correcciones'} {correccionesUsadas}/{CORRECCIONES_MAXIMAS}
            </span>
          )}
        </div>
      )}

      {ticket.es_excepcional && ticket.excepcional_estado === 'PENDIENTE' && (
        <p className="mt-1 text-xs font-medium text-ambar">Pendiente de aceptación</p>
      )}

      <p className="mt-3 truncate font-semibold text-tinta" title={ticket.titulo ?? ticket.tipo_solicitud ?? undefined}>
        {ticket.titulo || ticket.tipo_solicitud}
      </p>
      {ticket.titulo && (
        <p className="truncate text-sm text-tinta-suave" title={ticket.tipo_solicitud ?? undefined}>
          {ticket.tipo_solicitud}
        </p>
      )}
      {ticket.area && (
        <p className="truncate text-sm text-tinta-suave" title={ticket.area}>
          {ticket.area}
        </p>
      )}

      <div className="mt-3 space-y-1.5 border-t border-azul-niebla/60 pt-3">
        <FilaCampo icono={Calendar} etiqueta="Creada" valor={formatFechaHora(ticket.fecha_registro)} />
        <FilaCampo icono={PartyPopper} etiqueta="Evento" valor={formatFecha(ticket.fecha_evento)} />
        <FilaCampo icono={Clock} etiqueta="Vence" valor={formatFecha(ticket.fecha_limite)} vencido={Boolean(ticket.fuera_de_plazo)} />
        {muestraAsignacion && ticket.flujo !== 'APROBACION_IA' && (
          <FilaCampo
            icono={User}
            etiqueta="Diseñador"
            valor={ticket.disenador ?? 'Sin asignar'}
            sinAsignar={!ticket.disenador}
          />
        )}
      </div>

      {muestraCronometro && (
        <div className="mt-3 border-t border-azul-niebla/60 pt-3">
          <CronometroDictamen
            minutos={ticket.minutos_habiles_restantes_dictamen}
            fechaAprobacion={ticket.fecha_aprobacion_automatica}
            compacto
          />
        </div>
      )}

      {accion && (
        <div className="mt-auto border-t border-azul-niebla/60 pt-3" onClick={(e) => e.stopPropagation()}>
          {accion}
        </div>
      )}
    </article>
  )
}

function FilaCampo({
  icono: Icono,
  etiqueta,
  valor,
  vencido,
  sinAsignar,
}: {
  icono: LucideIcon
  etiqueta: string
  valor: string
  vencido?: boolean
  sinAsignar?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex flex-none items-center gap-1.5 text-xs text-tinta-suave">
        <Icono size={13} /> {etiqueta}
      </span>
      <span
        className={`truncate text-sm ${vencido ? 'font-medium text-coral' : sinAsignar ? 'italic text-tinta-suave' : 'text-tinta'}`}
        title={valor}
      >
        {valor}
      </span>
    </div>
  )
}
