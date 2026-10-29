import type { KeyboardEvent, MouseEvent } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'

/** Clic con Ctrl/Cmd o con el botón central: el detalle se abre en otra pestaña, como en un enlace. */
function abrirEnPestanaNueva(ruta: string) {
  window.open(ruta, '_blank', 'noopener,noreferrer')
}

/**
 * Props para que toda la superficie de una card abra `ruta`, con la accesibilidad de un enlace
 * (`role="link"`, Enter y Espacio). No se usa un `<a>` envolvente porque las cards llevan botones y
 * selects adentro: esos deben hacer `e.stopPropagation()` en su `onClick` para no abrir el detalle.
 * Las teclas solo cuentan sobre la card misma, no sobre un control interno con el foco.
 */
export function useCardEnlace(ruta: string) {
  return propsCardEnlace(ruta, useNavigate())
}

/** Igual que `useCardEnlace`, para cards que se dibujan dentro de un `.map()` (no pueden llamar hooks). */
export function propsCardEnlace(ruta: string, navigate: NavigateFunction) {
  return {
    role: 'link' as const,
    tabIndex: 0,
    onClick: (e: MouseEvent) => {
      if (e.ctrlKey || e.metaKey) abrirEnPestanaNueva(ruta)
      else navigate(ruta)
    },
    onAuxClick: (e: MouseEvent) => {
      if (e.button === 1) abrirEnPestanaNueva(ruta)
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        navigate(ruta)
      }
    },
  }
}

/** Clases comunes de una card cliqueable: cursor, hover visible y foco de teclado. */
export const CLASE_CARD_ENLACE =
  'cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-institucional'
