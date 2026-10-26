// Genera los 7 manuales de usuario de iTickets en PDF a partir de los .md de docs/manuales/.
// Uso: npm run manuales   (o: node scripts/manuales/generar-todos.mjs [Empleado|Jefe_de_Area|…] para uno solo)
// Las versiones 1.0 en Word quedaron en docs/manuales/v1/.
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(__dirname, '..', '..')
const manuales = path.join(raiz, 'docs', 'manuales')

const VERSION = '2.0'
const FECHA = '26 de octubre de 2026'

const ROLES = [
  { archivo: 'Manual_Usuario_Empleado', subtitulo: 'Rol: Empleado' },
  { archivo: 'Manual_Usuario_Jefe_de_Area', subtitulo: 'Rol: Jefe de Área' },
  { archivo: 'Manual_Usuario_Disenador', subtitulo: 'Rol: Diseñador' },
  { archivo: 'Manual_Usuario_Asignador', subtitulo: 'Rol: Asignador' },
  { archivo: 'Manual_Usuario_Validador', subtitulo: 'Rol: Validador' },
  { archivo: 'Manual_Usuario_Analista', subtitulo: 'Rol: Analista' },
  { archivo: 'Manual_Usuario_Administrador', subtitulo: 'Rol: Administrador' },
]

const filtro = process.argv[2]
const elegidos = filtro ? ROLES.filter((r) => r.archivo.endsWith(filtro)) : ROLES

for (const { archivo, subtitulo } of elegidos) {
  console.log(`\n→ ${archivo}`)
  execFileSync(
    process.execPath,
    [
      path.join(__dirname, 'md2pdf.mjs'),
      path.join(manuales, `${archivo}.md`),
      path.join(manuales, `${archivo}.pdf`),
      'Manual de Usuario',
      subtitulo,
      VERSION,
      FECHA,
    ],
    { stdio: 'inherit' },
  )
}

console.log(`\nListo: ${elegidos.length} PDF generado(s) en docs/manuales/.`)
