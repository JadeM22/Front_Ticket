/**
 * Decide hacia dónde abre un desplegable anclado a un campo: hacia arriba si abajo no cabe y arriba
 * sí, y alineado a la derecha si por la izquierda se saldría de la pantalla.
 */
export function posicionDesplegable(caja: DOMRect, ancho: number, alto: number): { arriba: boolean; derecha: boolean } {
  return {
    arriba: window.innerHeight - caja.bottom < alto && caja.top > alto,
    derecha: caja.left + ancho > window.innerWidth && caja.right >= ancho,
  }
}
