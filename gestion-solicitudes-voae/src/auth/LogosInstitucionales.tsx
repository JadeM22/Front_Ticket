interface LogosInstitucionalesProps {
  className?: string
}

/**
 * UNAH a la izquierda, VOAE a la derecha, con un separador delgado entre los dos.
 * Los PNG tienen proporciones distintas (UNAH 930×598 ≈ 1.56:1, VOAE 988×410 ≈ 2.41:1): con la misma altura
 * el de UNAH se ve más pequeño, así que va ~25 % más alto para que los dos ocupen la misma área visual.
 */
export function LogosInstitucionales({ className = '' }: LogosInstitucionalesProps) {
  return (
    <div className={`flex items-center gap-5 sm:gap-7 ${className}`}>
      <img src="/logos/unah.png" alt="UNAH" loading="eager" draggable={false} className="h-20 w-auto object-contain lg:h-25" />
      <span aria-hidden className="h-14 w-px bg-current opacity-30 lg:h-16" />
      <img src="/logos/voae.png" alt="VOAE" loading="eager" draggable={false} className="h-16 w-auto object-contain lg:h-20" />
    </div>
  )
}
