import { useMemo } from 'react'
import { useTicketsEstadoReal } from '../../hooks/useTickets'
import { Card } from '../../components/ui/Card'
import { SkeletonLista } from '../../components/ui/Skeleton'
import { BarraSimple } from '../../components/ui/BarraSimple'

function contarPor<T>(lista: T[], claveFn: (item: T) => string | null | undefined) {
  const conteos = new Map<string, number>()
  for (const item of lista) {
    const clave = claveFn(item) ?? 'Sin dato'
    conteos.set(clave, (conteos.get(clave) ?? 0) + 1)
  }
  return Array.from(conteos.entries())
    .map(([etiqueta, valor]) => ({ etiqueta, valor }))
    .sort((a, b) => b.valor - a.valor)
}

export function AdminDashboard() {
  const { data: tickets = [], isLoading } = useTicketsEstadoReal()

  const porEstado = useMemo(() => contarPor(tickets, (t) => t.estado_real), [tickets])
  const porArea = useMemo(() => contarPor(tickets, (t) => t.area), [tickets])
  const porTipo = useMemo(() => contarPor(tickets, (t) => t.tipo_solicitud), [tickets])

  const retrasados = tickets.filter((t) => t.fuera_de_plazo).length
  const aprobadosAutomaticos = tickets.filter((t) => t.aprobado_automatico).length

  if (isLoading) return <SkeletonLista filas={4} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-azul-noche">KPIs</h1>
        <p className="text-sm text-tinta-suave">Vista general de todas las solicitudes.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-tinta-suave">Total</p>
          <p className="font-mono text-2xl font-bold text-azul-noche">{tickets.length}</p>
          <span className="mt-1 block h-1 w-8 rounded-full bg-menta" />
        </Card>
        <Card>
          <p className="text-xs uppercase text-tinta-suave">Retrasados</p>
          <p className="font-mono text-2xl font-bold text-coral">{retrasados}</p>
          <span className="mt-1 block h-1 w-8 rounded-full bg-coral" />
        </Card>
        <Card>
          <p className="text-xs uppercase text-tinta-suave">Aprobados automáticos</p>
          <p className="font-mono text-2xl font-bold text-menta-profundo">{aprobadosAutomaticos}</p>
          <span className="mt-1 block h-1 w-8 rounded-full bg-menta" />
        </Card>
        <Card>
          <p className="text-xs uppercase text-tinta-suave">Áreas activas</p>
          <p className="font-mono text-2xl font-bold text-azul-institucional">{porArea.length}</p>
          <span className="mt-1 block h-1 w-8 rounded-full bg-azul-medio" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-azul-noche">Por estado</h2>
          <BarraSimple datos={porEstado} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-azul-noche">Por área</h2>
          <BarraSimple datos={porArea} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-azul-noche">Por tipo de solicitud</h2>
          <BarraSimple datos={porTipo} />
        </Card>
      </div>
    </div>
  )
}
