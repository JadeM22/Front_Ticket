import { CalendarDays, FileText, Image, Megaphone, Video } from 'lucide-react'
import type { FormularioCodigo } from '../../types/domain'

export const ICONO_POR_FORMULARIO: Record<FormularioCodigo, typeof Image> = {
  ARTE: Image,
  VIDEO: Video,
  DIRCOM: Megaphone,
  PROTOCOLO: CalendarDays,
  GENERICO: FileText,
}

export const ETIQUETA_FORMULARIO: Record<FormularioCodigo, string> = {
  ARTE: 'Arte',
  VIDEO: 'Video',
  DIRCOM: 'DIRCOM',
  PROTOCOLO: 'Protocolo',
  GENERICO: 'Otros',
}
