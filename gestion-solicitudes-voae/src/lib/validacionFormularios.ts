import type { DetalleFormulario, TipoSolicitudNombre } from '../types/domain'

export function detalleInicial(tipo: TipoSolicitudNombre): DetalleFormulario {
  switch (tipo) {
    case 'Afiche':
      return { dimensiones: '', orientacion: 'Vertical', texto_principal: '' }
    case 'Comunicado':
      return { titulo: '', contenido_comunicado: '', dirigido_a: '' }
    case 'Aviso':
      return { titulo_aviso: '', urgencia: 'Media', medio_difusion: '' }
    case 'Cobertura de eventos':
      return { nombre_evento: '', lugar: '', fecha_inicio: '', fecha_fin: '' }
    case 'Edición fotográfica':
      return { cantidad_fotos: 1, estilo_edicion: '', enlace_drive: '' }
    case 'Publicación en redes sociales':
      return { plataformas: [], texto_copy: '', hora_sugerida: null }
  }
}

/** Valida en el cliente antes de llamar al RPC; la base vuelve a validar todo igual. */
export function validarDetalle(tipo: TipoSolicitudNombre, detalle: DetalleFormulario): string | null {
  switch (tipo) {
    case 'Afiche': {
      const d = detalle as { dimensiones: string; texto_principal: string }
      if (!d.dimensiones.trim() || !d.texto_principal.trim()) return 'Completa las dimensiones y el texto principal.'
      return null
    }
    case 'Comunicado': {
      const d = detalle as { titulo: string; contenido_comunicado: string; dirigido_a: string }
      if (!d.titulo.trim() || !d.contenido_comunicado.trim() || !d.dirigido_a.trim())
        return 'Completa el título, el contenido y a quién va dirigido.'
      return null
    }
    case 'Aviso': {
      const d = detalle as { titulo_aviso: string; medio_difusion: string }
      if (!d.titulo_aviso.trim() || !d.medio_difusion.trim()) return 'Completa el título y el medio de difusión.'
      return null
    }
    case 'Cobertura de eventos': {
      const d = detalle as { nombre_evento: string; lugar: string; fecha_inicio: string; fecha_fin: string }
      if (!d.nombre_evento.trim() || !d.lugar.trim() || !d.fecha_inicio || !d.fecha_fin)
        return 'Completa el evento, el lugar y las fechas.'
      if (new Date(d.fecha_fin) < new Date(d.fecha_inicio)) return 'La fecha de fin debe ser posterior a la de inicio.'
      return null
    }
    case 'Edición fotográfica': {
      const d = detalle as { cantidad_fotos: number; estilo_edicion: string; enlace_drive: string }
      if (d.cantidad_fotos <= 0) return 'La cantidad de fotos debe ser mayor a 0.'
      if (!d.estilo_edicion.trim()) return 'Indica el estilo de edición.'
      if (!/^https?:\/\//i.test(d.enlace_drive)) return 'El enlace de Drive debe iniciar con http:// o https://.'
      return null
    }
    case 'Publicación en redes sociales': {
      const d = detalle as { plataformas: string[]; texto_copy: string }
      if (d.plataformas.length === 0) return 'Selecciona al menos una plataforma.'
      if (!d.texto_copy.trim()) return 'Escribe el texto / copy de la publicación.'
      return null
    }
  }
}

/**
 * Los <input type="datetime-local"> no llevan zona horaria: el navegador los interpretaría
 * con SU propia zona local, que no es necesariamente America/Tegucigalpa (UTC-6 todo el año,
 * sin horario de verano). Por eso se fija el offset -06:00 explícitamente antes de convertir a ISO.
 */
function localTegucigalpaAIso(valorDatetimeLocal: string): string {
  return new Date(`${valorDatetimeLocal}:00-06:00`).toISOString()
}

export function normalizarDetalleParaEnvio(tipo: TipoSolicitudNombre, detalle: DetalleFormulario): DetalleFormulario {
  if (tipo === 'Cobertura de eventos') {
    const d = detalle as { nombre_evento: string; lugar: string; fecha_inicio: string; fecha_fin: string }
    return {
      ...d,
      fecha_inicio: localTegucigalpaAIso(d.fecha_inicio),
      fecha_fin: localTegucigalpaAIso(d.fecha_fin),
    }
  }
  return detalle
}
