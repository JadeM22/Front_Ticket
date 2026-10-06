import { formatFechaHora } from '../../lib/date'

export interface EventoTimeline {
  id: number
  descripcion: string
  fecha: string
  autor?: string
}

export function Timeline({ eventos }: { eventos: EventoTimeline[] }) {
  if (eventos.length === 0) return null

  return (
    <ol className="relative ml-2 border-l-2 border-dashed border-azul-niebla pl-6">
      {eventos.map((evento) => (
        <li key={evento.id} className="mb-6 last:mb-0">
          <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-menta bg-menta-bruma" />
          <p className="text-sm text-tinta">{evento.descripcion}</p>
          <p className="font-mono text-xs text-tinta-suave">
            {formatFechaHora(evento.fecha)}
            {evento.autor && <> · {evento.autor}</>}
          </p>
        </li>
      ))}
    </ol>
  )
}
