import { AlertTriangle, CalendarDays, Image, ImagePlus, Megaphone, Share2 } from 'lucide-react'
import type { TipoSolicitudNombre } from '../../types/domain'

export const ICONO_POR_TIPO: Record<TipoSolicitudNombre, typeof Image> = {
  Afiche: Image,
  'Edición fotográfica': ImagePlus,
  'Cobertura de eventos': CalendarDays,
  Comunicado: Megaphone,
  'Publicación en redes sociales': Share2,
  Aviso: AlertTriangle,
}
