// Revisa un manual en PDF sin poppler: cuenta páginas, busca "[Falta la imagen" y dibuja hojas de miniaturas
// (8 páginas por imagen) con pdf.js para revisarlo a ojo.
// Uso: node scripts/manuales/revisar-pdf.mjs <manual.pdf> [carpeta-salida] [páginas por fila]
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [, , pdfPath, salida = path.join(path.dirname(pdfPath), '.revision'), columnas = '4'] = process.argv
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(salida, { recursive: true })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 1000 })
const datos = fs.readFileSync(pdfPath).toString('base64')
await page.setContent(`<!doctype html><body style="margin:0;background:#8a8f94">
  <div id="hoja" style="display:grid;grid-template-columns:repeat(${columnas},1fr);gap:12px;padding:12px"></div>
  <script type="module">
    import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs'
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs'
    const bytes = Uint8Array.from(atob('${datos}'), (c) => c.charCodeAt(0))
    const doc = await pdfjs.getDocument({ data: bytes }).promise
    let texto = ''
    const hoja = document.getElementById('hoja')
    for (let i = 1; i <= doc.numPages; i++) {
      const pagina = await doc.getPage(i)
      texto += (await pagina.getTextContent()).items.map((t) => t.str).join(' ') + '\\n'
      const vista = pagina.getViewport({ scale: 380 / pagina.getViewport({ scale: 1 }).width })
      const c = document.createElement('canvas')
      c.width = vista.width; c.height = vista.height; c.style.background = '#fff'
      c.dataset.pagina = i
      await pagina.render({ canvasContext: c.getContext('2d'), viewport: vista }).promise
      hoja.appendChild(c)
    }
    window.resultado = { paginas: doc.numPages, faltan: (texto.match(/\\[Falta la imagen/g) ?? []).length }
  </script></body>`)
await page.waitForFunction(() => window.resultado, { timeout: 180000 })
const { paginas, faltan } = await page.evaluate(() => window.resultado)
const porHoja = Number(columnas) * 2
const base = path.basename(pdfPath, '.pdf')
for (let inicio = 1; inicio <= paginas; inicio += porHoja) {
  await page.evaluate((inicio, porHoja) => {
    document.querySelectorAll('canvas').forEach((c) => {
      const n = Number(c.dataset.pagina)
      c.style.display = n >= inicio && n < inicio + porHoja ? 'block' : 'none'
    })
  }, inicio, porHoja)
  const caja = await (await page.$('#hoja')).boundingBox()
  const destino = path.join(salida, `${base}_p${String(inicio).padStart(2, '0')}.png`)
  await page.screenshot({ path: destino, clip: { x: 0, y: 0, width: 1600, height: caja.height + 24 } })
}
console.log(JSON.stringify({ pdf: base, paginas, faltaLaImagen: faltan, hojas: Math.ceil(paginas / porHoja) }))
await browser.close()
