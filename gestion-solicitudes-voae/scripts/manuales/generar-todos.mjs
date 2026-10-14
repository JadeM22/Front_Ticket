// Genera los 12 documentos (6 .docx + 6 .pdf) de los manuales de usuario de iTickets a partir de
// los .md en docs/manuales/. Uso: npm run manuales
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(__dirname, '..', '..')
const manuales = path.join(raiz, 'docs', 'manuales')

const VERSION = '1.0'
const FECHA = new Date().toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })

const ROLES = [
  { archivo: 'Manual_Usuario_Empleado', titulo: 'Manual de Usuario', subtitulo: 'Rol: Empleado' },
  { archivo: 'Manual_Usuario_Jefe_de_Area', titulo: 'Manual de Usuario', subtitulo: 'Rol: Jefe de Área' },
  { archivo: 'Manual_Usuario_Disenador', titulo: 'Manual de Usuario', subtitulo: 'Rol: Diseñador' },
  { archivo: 'Manual_Usuario_Asignador', titulo: 'Manual de Usuario', subtitulo: 'Rol: Asignador' },
  { archivo: 'Manual_Usuario_Analista', titulo: 'Manual de Usuario', subtitulo: 'Rol: Analista' },
  { archivo: 'Manual_Usuario_Administrador', titulo: 'Manual de Usuario', subtitulo: 'Rol: Administrador' },
]

for (const { archivo, titulo, subtitulo } of ROLES) {
  const md = path.join(manuales, `${archivo}.md`)
  const docx = path.join(manuales, `${archivo}.docx`)
  const pdf = path.join(manuales, `${archivo}.pdf`)

  console.log(`\n→ ${archivo}`)
  execFileSync(
    process.execPath,
    [path.join(__dirname, 'md2docx.cjs'), md, docx, titulo, subtitulo, VERSION, FECHA],
    { stdio: 'inherit' },
  )
  execFileSync(
    process.execPath,
    [path.join(__dirname, 'md2pdf.mjs'), md, pdf, titulo, subtitulo, VERSION, FECHA],
    { stdio: 'inherit' },
  )
}

console.log('\nListo: 12 archivos generados en docs/manuales/.')
