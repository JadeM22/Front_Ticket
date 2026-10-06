import { formatFecha, formatHora } from '../../lib/date'
import type { DetalleFormulario } from '../../types/domain'

const ETIQUETAS: Record<string, string> = {
  titulo: 'Título',
  fecha: 'Fecha',
  hora_inicio: 'Hora de inicio',
  hora_fin: 'Hora de fin',
  lugar: 'Lugar',
  modalidad: 'Modalidad',
  aplica_articulo_140: 'Aplica Artículo 140',
  enlace_qr: 'Enlace del QR',
  alcance: 'Alcance',
  informacion_adicional: 'Información adicional',
  logotipos: 'Logotipos',
  objetivo: 'Objetivo',
  fecha_entrega_publicacion: 'Fecha de entrega/publicación',
  participacion_estudiantes: 'Participación de estudiantes',
  informacion_producto: 'Información del producto',
  encargado_actividad: 'Encargado de la actividad',
  tipo_material: 'Tipo de material',
  fecha_necesaria: 'Fecha necesaria',
  informacion_valor: 'Contexto y valor',
  necesita_dictamen: 'Necesita dictamen',
  nombre_actividad: 'Actividad',
  lugar_propuesto: 'Lugar propuesto',
  cantidad_invitados: 'Cantidad de invitados',
  hora: 'Hora',
  elaborar_invitacion: 'Elaborar invitación',
  informacion_programa: 'Información del programa',
  necesita_maestro_ceremonia: 'Necesita maestro de ceremonia',
  maestro_ceremonia_preferido: 'Maestro de ceremonia preferido',
  equipo_requerido: 'Equipo requerido',
  necesita_edecanes: 'Necesita edecanes',
  necesita_pumas: 'Necesita Pumas',
  descripcion: 'Descripción',
  fecha_requerida: 'Fecha requerida',
  observaciones: 'Observaciones',
}

const CAMPOS_FECHA = new Set(['fecha', 'fecha_entrega_publicacion', 'fecha_necesaria', 'fecha_requerida'])
const CAMPOS_HORA = new Set(['hora_inicio', 'hora_fin', 'hora'])

function renderValor(clave: string, valor: unknown): string {
  if (valor == null || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (Array.isArray(valor)) return valor.length > 0 ? valor.join(', ') : '—'
  if (CAMPOS_FECHA.has(clave)) return formatFecha(valor as string)
  if (CAMPOS_HORA.has(clave)) return formatHora(`1970-01-01T${valor}`)
  return String(valor)
}

export function DetalleFormularioVista({ detalle }: { detalle: DetalleFormulario }) {
  return (
    <dl className="space-y-2 text-sm">
      {Object.entries(detalle)
        .filter(([clave]) => clave !== 'formulario_id')
        .map(([clave, valor]) => (
          <div key={clave} className="flex flex-col gap-0.5 border-b border-azul-niebla/60 pb-2 sm:flex-row sm:justify-between">
            <dt className="text-tinta-suave">{ETIQUETAS[clave] ?? clave}</dt>
            <dd className="font-medium text-tinta sm:text-right">{renderValor(clave, valor)}</dd>
          </div>
        ))}
    </dl>
  )
}
