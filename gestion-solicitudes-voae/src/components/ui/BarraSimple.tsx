interface BarraSimpleProps {
  datos: { etiqueta: string; valor: number }[]
}

export function BarraSimple({ datos }: BarraSimpleProps) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor))

  return (
    <div className="space-y-2">
      {datos.map((dato) => (
        <div key={dato.etiqueta} className="flex items-center gap-3">
          <span className="w-36 truncate text-xs text-tinta-suave">{dato.etiqueta}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-azul-niebla">
            <div
              className="h-full rounded-full bg-azul-institucional transition-all duration-300"
              style={{ width: `${(dato.valor / maximo) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-xs text-tinta">{dato.valor}</span>
        </div>
      ))}
    </div>
  )
}
