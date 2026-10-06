function escaparCelda(valor: unknown): string {
  const texto = valor == null ? '' : String(valor)
  if (/[",\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`
  return texto
}

/** Descarga un CSV con BOM UTF-8 para que Excel lea bien las tildes. */
export function descargarCsv(nombreArchivo: string, columnas: string[], filas: unknown[][]): void {
  const lineas = [columnas, ...filas].map((fila) => fila.map(escaparCelda).join(','))
  const contenido = '﻿' + lineas.join('\r\n')
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}
