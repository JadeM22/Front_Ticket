import { hoyTegucigalpaISO } from './date'
import { esUrlHttp } from './archivos'
import type {
  DetalleArte,
  DetalleDircom,
  DetalleFormulario,
  DetalleGenerico,
  DetalleProtocolo,
  DetalleVideo,
  FormularioCodigo,
} from '../types/domain'

export function detalleInicial(formulario: FormularioCodigo): DetalleFormulario {
  switch (formulario) {
    case 'ARTE':
      return {
        titulo: '',
        fecha: null,
        hora_inicio: null,
        hora_fin: null,
        lugar: null,
        modalidad: null,
        aplica_articulo_140: false,
        enlace_qr: null,
        alcance: null,
        informacion_adicional: null,
        logotipos: [],
      }
    case 'VIDEO':
      return {
        objetivo: '',
        fecha_entrega_publicacion: '',
        participacion_estudiantes: 'No aplica',
        informacion_producto: null,
        encargado_actividad: '',
        logotipos: ['Logo de VOAE', 'Logo de la UNAH'],
      }
    case 'DIRCOM':
      return {
        tipo_material: '',
        fecha_necesaria: '',
        informacion_valor: '',
        necesita_dictamen: false,
        logotipos: ['Logo de VOAE', 'Logo de la UNAH'],
      }
    case 'PROTOCOLO':
      return {
        nombre_actividad: '',
        lugar_propuesto: '',
        cantidad_invitados: null,
        fecha: '',
        hora: '',
        elaborar_invitacion: false,
        informacion_programa: null,
        necesita_maestro_ceremonia: false,
        maestro_ceremonia_preferido: null,
        equipo_requerido: null,
        necesita_edecanes: false,
        necesita_pumas: false,
      }
    case 'GENERICO':
      return {
        titulo: '',
        descripcion: '',
        fecha_requerida: null,
        informacion_producto: null,
        logotipos: [],
        observaciones: null,
      }
  }
}

function fechaNoPasada(fecha: string | null | undefined): boolean {
  if (!fecha) return true
  return fecha >= hoyTegucigalpaISO()
}

/** Valida en el cliente antes de llamar al RPC; la base vuelve a validar todo igual. */
export function validarDetalle(formulario: FormularioCodigo, detalle: DetalleFormulario): string | null {
  switch (formulario) {
    case 'ARTE': {
      const d = detalle as DetalleArte
      if (!d.titulo.trim()) return 'Escribe un título.'
      if (!fechaNoPasada(d.fecha)) return 'La fecha no puede ser anterior a hoy.'
      if (d.hora_inicio && d.hora_fin && d.hora_fin < d.hora_inicio) return 'La hora de fin debe ser posterior a la de inicio.'
      if (d.enlace_qr && !esUrlHttp(d.enlace_qr)) return 'El enlace del QR debe iniciar con http:// o https://.'
      return null
    }
    case 'VIDEO': {
      const d = detalle as DetalleVideo
      if (!d.objetivo.trim() || !d.encargado_actividad.trim()) return 'Completa el objetivo y el encargado de la actividad.'
      if (!d.fecha_entrega_publicacion) return 'Indica la fecha de entrega/publicación.'
      if (!fechaNoPasada(d.fecha_entrega_publicacion)) return 'La fecha de entrega no puede ser anterior a hoy.'
      return null
    }
    case 'DIRCOM': {
      const d = detalle as DetalleDircom
      if (!d.tipo_material.trim() || !d.informacion_valor.trim()) return 'Completa el tipo de material y el contexto del requerimiento.'
      if (!d.fecha_necesaria) return 'Indica la fecha en que lo necesitas.'
      if (!fechaNoPasada(d.fecha_necesaria)) return 'La fecha no puede ser anterior a hoy.'
      return null
    }
    case 'PROTOCOLO': {
      const d = detalle as DetalleProtocolo
      if (!d.nombre_actividad.trim() || !d.lugar_propuesto.trim()) return 'Completa el nombre de la actividad y el lugar propuesto.'
      if (!d.fecha || !d.hora) return 'Indica la fecha y la hora.'
      if (!fechaNoPasada(d.fecha)) return 'La fecha no puede ser anterior a hoy.'
      if (d.cantidad_invitados != null && d.cantidad_invitados <= 0) return 'La cantidad de invitados debe ser mayor a 0.'
      if (d.necesita_maestro_ceremonia && !d.maestro_ceremonia_preferido?.trim())
        return 'Indica el maestro de ceremonia preferido, o desmarca la opción.'
      return null
    }
    case 'GENERICO': {
      const d = detalle as DetalleGenerico
      if (!d.titulo.trim() || !d.descripcion.trim()) return 'Completa el título y la descripción.'
      if (!fechaNoPasada(d.fecha_requerida)) return 'La fecha requerida no puede ser anterior a hoy.'
      return null
    }
  }
}
