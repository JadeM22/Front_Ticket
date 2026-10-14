interface MarcaITicketsProps {
  tamano?: 'pequeno' | 'grande'
  /** Color de "Tickets": por defecto hereda `currentColor` del contenedor (sidebar sobre fondo oscuro, etc). */
  className?: string
}

/** Logotipo de texto reutilizable: "i" en verde menta + "Tickets" en el color del contexto. */
export function MarcaITickets({ tamano = 'pequeno', className = '' }: MarcaITicketsProps) {
  const clasePeso = tamano === 'grande' ? 'text-4xl sm:text-5xl font-black' : 'text-lg font-bold'

  return (
    <p className={`${clasePeso} leading-none tracking-tight ${className}`}>
      <span className="text-menta">i</span>
      <span>Tickets</span>
    </p>
  )
}
