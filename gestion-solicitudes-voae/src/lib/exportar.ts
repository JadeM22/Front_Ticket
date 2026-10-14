import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { descargarCsv } from './csv'
import { formatFechaHora } from './date'

export interface ColumnaExportar<T> {
  etiqueta: string
  valor: (fila: T) => string | number | null | undefined
}

/** CSV con BOM UTF-8, una sola definición de columnas reutilizada también por `exportarPDF`. */
export function exportarCSV<T>(filas: T[], columnas: ColumnaExportar<T>[], nombreArchivo: string): void {
  descargarCsv(
    nombreArchivo,
    columnas.map((c) => c.etiqueta),
    filas.map((fila) => columnas.map((c) => c.valor(fila) ?? '—')),
  )
}

interface ExportarPdfInput<T> {
  titulo: string
  /** Una o varias líneas bajo el título: rango, filtros aplicados, KPIs… */
  subtitulo?: string | string[]
  columnas: ColumnaExportar<T>[]
  filas: T[]
  nombreArchivo: string
}

/** PDF horizontal con título, subtítulo(s), fecha de generación, tabla y numeración de páginas. */
export function exportarPDF<T>({ titulo, subtitulo, columnas, filas, nombreArchivo }: ExportarPdfInput<T>): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const anchoPagina = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.text(titulo, 14, 15)

  doc.setFontSize(9)
  let y = 22
  const lineas = subtitulo == null ? [] : Array.isArray(subtitulo) ? subtitulo : [subtitulo]
  for (const linea of lineas) {
    doc.text(linea, 14, y, { maxWidth: anchoPagina - 28 })
    y += 5
  }
  doc.text(`Generado: ${formatFechaHora(new Date().toISOString())}`, 14, y)

  autoTable(doc, {
    startY: y + 5,
    head: [columnas.map((c) => c.etiqueta)],
    body: filas.map((fila) => columnas.map((c) => String(c.valor(fila) ?? '—'))),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [20, 66, 122] },
  })

  const totalPaginas = doc.getNumberOfPages()
  const altoPagina = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(`Página ${i} de ${totalPaginas}`, anchoPagina - 32, altoPagina - 6)
  }

  doc.save(nombreArchivo)
}
