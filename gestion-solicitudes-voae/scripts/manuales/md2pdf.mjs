// Convierte un manual en Markdown a PDF con portada, índice y número de página.
// Uso: node scripts/manuales/md2pdf.mjs <manual.md> <salida.pdf> "<Título>" "<Subtítulo>" [versión] [fecha]
// Requiere: npm i -D marked puppeteer-core   (usa el Google Chrome instalado; no descarga navegadores)
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { marked } from 'marked'
import puppeteer from 'puppeteer-core'

const [, , mdPath, outPath, titulo, subtitulo, version = '1.0', fecha = new Date().toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })] = process.argv
const md = fs.readFileSync(mdPath, 'utf8')

// Índice (títulos # y ##) con anclas
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const toc = md.split('\n').filter((l) => /^#{1,2} /.test(l)).map((l) => {
  const nivel = l.startsWith('## ') ? 2 : 1
  const texto = l.replace(/^#+ /, '').replace(/`/g, '')
  return `<li class="n${nivel}"><a href="#${slug(texto)}">${texto}</a></li>`
}).join('')
const cuerpo = marked.parse(md).replace(/<h([123])>(.*?)<\/h\1>/g,
  (_, n, t) => `<h${n} id="${slug(t.replace(/<[^>]+>/g, ''))}">${t}</h${n}>`)
  .replace(/<p>(<img [^>]*alt="([^"]*)"[^>]*>)<\/p>/g, (_, img, alt) => `<figure>${img}${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`)

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1f2933; }
header#title-block-header { border-bottom: 3px solid #3ecf8e; padding-bottom: 10px; margin-bottom: 18px; }
h1.title { font-size: 22pt; color: #0f3d2e; margin: 0 0 4px 0; }
p.subtitle { font-size: 12pt; color: #52606d; margin: 0; }
h1 { font-size: 16pt; color: #ffffff; background: #1c7c54; padding: 6px 10px; margin-top: 26px; page-break-after: avoid; }
h2 { font-size: 12.5pt; color: #1c7c54; border-bottom: 1px solid #c9e9d9; padding-bottom: 3px; margin-top: 20px; page-break-after: avoid; }
pre { background: #f5f7fa; border: 1px solid #d9e2ec; border-left: 4px solid #3ecf8e; padding: 8px 10px; font-size: 8.3pt; line-height: 1.3; white-space: pre-wrap; word-wrap: break-word; }
code { font-family: "DejaVu Sans Mono", monospace; font-size: 9pt; }
p code, li code, td code { background: #eef2f6; padding: 0 3px; border-radius: 3px; }
pre code { background: none; padding: 0; font-size: 8.3pt; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; page-break-inside: avoid; }
th { background: #1c7c54; color: #fff; text-align: left; padding: 5px 7px; }
td { border: 1px solid #d9e2ec; padding: 5px 7px; vertical-align: top; }
tr:nth-child(even) td { background: #f5f7fa; }
strong { color: #102a43; }
table { page-break-inside: auto; } tr { page-break-inside: avoid; } thead { display: table-header-group; }
.portada { page-break-after: always; text-align: center; padding-top: 40px; }
.portada .franja { background: #12397a; color: #fff; border-radius: 18px; padding: 34px 20px; margin: 0 40px 60px; }
.portada .sup { letter-spacing: 4px; font-size: 10pt; color: #bcd3f5; margin: 0; }
.portada .marca { font-size: 54pt; font-weight: 900; margin: 6px 0 0; }
.portada .marca .i { color: #4fe0b0; }
.portada .tit { color: #12397a; font-size: 30pt; font-weight: bold; margin: 0 0 8px; }
.portada .sub { font-size: 13pt; color: #334e68; }
.portada .inst { font-size: 11pt; color: #52606d; margin: 40px 0; }
.portada table.meta { width: 60%; margin: 30px auto 0; }
.portada table.meta td { border: none; border-bottom: 1px solid #d9e2ec; text-align: left; background: none !important; }
nav#TOC { page-break-after: always; }
nav#TOC ul { list-style: none; padding-left: 14px; }
nav#TOC > ul > li { margin-top: 4px; font-weight: bold; }
nav#TOC > ul > li > ul > li { font-weight: normal; }
nav#TOC a { color: #1c3d6e; text-decoration: none; }
h1 { background: #12397a !important; }
th { background: #12397a !important; }
h2 { color: #12397a !important; border-bottom-color: #c9daf5 !important; }
img { max-width: 100%; border: 1px solid #d9e2ec; border-radius: 6px; display: block; margin: 10px auto 2px; }
figure { margin: 10px 0 14px; page-break-inside: avoid } figcaption { display:block; text-align:center; font-size: 9pt; color:#52606d; }
blockquote { background:#eaf7f2; border-left:4px solid #2fbf8f; margin:10px 0; padding:6px 12px; }
nav.toc ul { list-style:none; padding:0 } nav.toc li.n1 { font-weight:bold; margin-top:6px } nav.toc li.n2 { padding-left:16px }
nav.toc a { color:#1c3d6e; text-decoration:none } nav.toc { page-break-after: always }
</style></head><body>
<div class="portada"><div class="franja"><p class="sup">SOLICITUDES DE DISEÑO Y COMUNICACIÓN</p>
<p class="marca"><span class="i">i</span>Tickets</p></div>
<p class="tit">${titulo}</p><p class="sub">${subtitulo}</p>
<p class="inst">Vicerrectoría de Orientación y Asuntos Estudiantiles (VOAE)<br>Universidad Nacional Autónoma de Honduras (UNAH)</p>
<table class="meta"><tr><td>Versión</td><td>${version}</td></tr><tr><td>Fecha</td><td>${fecha}</td></tr>
<tr><td>Elaborado por</td><td>Jade Miralda y Angie Enamorado</td></tr></table></div>
<nav class="toc"><h2>Contenido</h2><ul>${toc}</ul></nav>
${cuerpo}</body></html>`

// El HTML se guarda junto al .md para que las imágenes con ruta relativa se encuentren
const tmp = path.join(path.dirname(path.resolve(mdPath)), `.${path.basename(mdPath)}.tmp.html`)
fs.writeFileSync(tmp, html)
const browser = await puppeteer.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome' })
const page = await browser.newPage()
await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle0' })
await page.pdf({
  path: outPath, format: 'Letter', printBackground: true,
  margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
  displayHeaderFooter: true,
  headerTemplate: `<div style="font-size:7pt;color:#52606d;width:100%;text-align:right;padding-right:14mm">iTickets · ${titulo}</div>`,
  footerTemplate: '<div style="font-size:7pt;color:#52606d;width:100%;text-align:center">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
})
await browser.close()
fs.unlinkSync(tmp)
console.log('ok', outPath)
