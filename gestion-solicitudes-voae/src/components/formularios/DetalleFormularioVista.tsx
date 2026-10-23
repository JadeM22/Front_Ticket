import type { ReactNode } from 'react'
import { formatFecha, formatFechaLarga, formatHora } from '../../lib/date'
import { estaVacio } from '../../lib/validacionFormularios'
import type { DefinicionCampo, DetalleFormulario, ValorCampo } from '../../types/domain'

function renderValor(campo: DefinicionCampo | null, valor: ValorCampo | undefined): ReactNode {
  if (campo?.tipo_campo === 'BOOLEANO') return valor === true ? 'Sí' : 'No'
  if (valor == null || estaVacio(valor)) return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (Array.isArray(valor)) return valor.join(', ')
  const texto = String(valor)
  switch (campo?.tipo_campo) {
    case 'FECHA':
      return formatFecha(texto)
    case 'HORA':
      return formatHora(`1970-01-01T${texto}`)
    case 'URL':
      return (
        <a href={texto} target="_blank" rel="noopener noreferrer" className="break-all text-azul-institucional hover:underline">
          {texto}
        </a>
      )
    default:
      return texto
  }
}

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-azul-niebla/60 pb-2 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-tinta-suave">{etiqueta}</dt>
      <dd className="whitespace-pre-line font-medium text-tinta sm:text-right">{children}</dd>
    </div>
  )
}

/**
 * Generalidades + respuestas de una solicitud. Las etiquetas y tipos salen de `detalle.campos`, que
 * para un ticket ya enviado es su `campos_snapshot`: si el Administrador cambia o desactiva un campo
 * después, el ticket se sigue viendo como se envió.
 */
export function DetalleFormularioVista({ detalle }: { detalle: DetalleFormulario }) {
  const clavesConocidas = new Set(detalle.campos.map((c) => c.clave))
  // Respuestas sin definición en el snapshot (p. ej. tickets anteriores a los formularios configurables).
  const huerfanas = Object.entries(detalle.respuestas).filter(([clave]) => !clavesConocidas.has(clave))

  return (
    <dl className="space-y-2 text-sm">
      <Fila etiqueta="Título">{detalle.titulo || '—'}</Fila>
      <Fila etiqueta="Fecha del evento">{detalle.fecha_evento ? formatFechaLarga(detalle.fecha_evento) : '—'}</Fila>
      <Fila etiqueta="Dirigido a">{detalle.dirigido_a || '—'}</Fila>
      <Fila etiqueta="Alcance">{detalle.campus.length > 0 ? detalle.campus.join(', ') : '—'}</Fila>
      {detalle.campos.map((campo) => (
        <Fila key={campo.clave} etiqueta={campo.etiqueta}>
          {renderValor(campo, detalle.respuestas[campo.clave])}
        </Fila>
      ))}
      {huerfanas.map(([clave, valor]) => (
        <Fila key={clave} etiqueta={clave}>
          {renderValor(null, valor)}
        </Fila>
      ))}
    </dl>
  )
}
