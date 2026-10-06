import { formatFecha } from '../../lib/date'
import type { DetalleFormulario } from '../../types/domain'

const ETIQUETAS: Record<string, string> = {
  dimensiones: 'Dimensiones',
  orientacion: 'Orientación',
  texto_principal: 'Texto principal',
  titulo: 'Título',
  contenido_comunicado: 'Contenido',
  dirigido_a: 'Dirigido a',
  titulo_aviso: 'Título del aviso',
  urgencia: 'Urgencia',
  medio_difusion: 'Medio de difusión',
  nombre_evento: 'Evento',
  lugar: 'Lugar',
  fecha_inicio: 'Inicio',
  fecha_fin: 'Fin',
  cantidad_fotos: 'Cantidad de fotos',
  estilo_edicion: 'Estilo de edición',
  enlace_drive: 'Enlace de Drive',
  plataformas: 'Plataformas',
  texto_copy: 'Texto / copy',
  hora_sugerida: 'Hora sugerida',
}

const CAMPOS_FECHA = new Set(['fecha_inicio', 'fecha_fin'])

export function DetalleFormularioVista({ detalle }: { detalle: DetalleFormulario }) {
  return (
    <dl className="space-y-2 text-sm">
      {Object.entries(detalle)
        .filter(([clave]) => clave !== 'formulario_id')
        .map(([clave, valor]) => (
          <div key={clave} className="flex flex-col gap-0.5 border-b border-azul-niebla/60 pb-2 sm:flex-row sm:justify-between">
            <dt className="text-tinta-suave">{ETIQUETAS[clave] ?? clave}</dt>
            <dd className="font-medium text-tinta sm:text-right">
              {Array.isArray(valor)
                ? valor.join(', ')
                : CAMPOS_FECHA.has(clave) && valor
                  ? formatFecha(valor as string)
                  : String(valor ?? '—')}
            </dd>
          </div>
        ))}
    </dl>
  )
}
