export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-azul-niebla ${className}`} />
}

export function SkeletonLista({ filas = 3 }: { filas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: filas }).map((_, indice) => (
        <Skeleton key={indice} className="h-20 w-full" />
      ))}
    </div>
  )
}
