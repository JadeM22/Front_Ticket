interface LogosInstitucionalesProps {
  className?: string
}

/** VOAE a la izquierda, UNAH a la derecha, con un separador delgado entre los dos. */
export function LogosInstitucionales({ className = '' }: LogosInstitucionalesProps) {
  return (
    <div className={`flex items-center gap-7 ${className}`}>
      <img src="/logos/voae.png" alt="VOAE" loading="eager" draggable={false} className="h-16 w-auto object-contain lg:h-20" />
      <span aria-hidden className="h-12 w-px bg-current opacity-30 lg:h-14" />
      <img src="/logos/unah.png" alt="UNAH" loading="eager" draggable={false} className="h-16 w-auto object-contain lg:h-20" />
    </div>
  )
}
