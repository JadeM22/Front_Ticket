// Toma las capturas de los manuales de usuario con Puppeteer contra la app publicada: un contexto de
// navegador aislado por usuario, ventana de 1440 × 900 (390 × 844 en las capturas móviles).
//
// Uso:
//   MANUALES_PASS='…' [MANUALES_PASS_NUEVO='…'] node scripts/manuales/capturas.mjs <rol> [prefijo…]
//     rol: comunes | empleado | jefe | disenador | asignador | validador | analista | administrador
//     prefijo: opcional, solo toma las capturas cuyo nombre empieza así (p. ej. "03" o "05_dictaminar")
//   MANUALES_PASS='…' node scripts/manuales/capturas.mjs explorar <usuario> <ruta> [ruta…]
//     Captura de página completa de cada ruta en MANUALES_EXPLORAR (por defecto ./.explorar), para revisar
//     pantallas antes de escribir el guion de un rol.
//
// Las contraseñas se leen SOLO de variables de entorno: nunca se escriben en este archivo, en logs ni en
// capturas (el campo de contraseña es de tipo password). MANUALES_PASS es la de las cuentas demo y
// MANUALES_PASS_NUEVO la temporal de nuevo.demo (primer ingreso).
//
// Reglas de los guiones: no cambiar el estado de los tickets [DEMO]. Los diálogos (Dictaminar, Aceptar,
// Rechazar, Pedir corrección…) se abren, se llenan, se capturan y se cancelan.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(__dirname, '..', '..')
const dirCapturas = path.join(raiz, 'docs', 'manuales', 'capturas')

export const URL_APP = process.env.MANUALES_URL ?? 'https://front-ticket.pages.dev'
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ESCRITORIO = { width: 1440, height: 900, deviceScaleFactor: 1 }
const MOVIL = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

export const USUARIOS = {
  admin: 'admin.demo@voae.test',
  jefe: 'jefe.demo@voae.test',
  coordinador: 'coordinador.demo@voae.test',
  empleada: 'empleada.demo@voae.test',
  empleadoUccr: 'empleado.uccr@voae.test',
  disenadora: 'disenadora.demo@voae.test',
  disenador2: 'disenador2.demo@voae.test',
  asignadora: 'asignadora.demo@voae.test',
  validadora: 'validadora.demo@voae.test',
  analista: 'analista.demo@voae.test',
  nuevo: 'nuevo.demo@voae.test',
}

function passwordDe(usuario) {
  const variable = usuario === 'nuevo' ? 'MANUALES_PASS_NUEVO' : 'MANUALES_PASS'
  const valor = process.env[variable]
  if (!valor) throw new Error(`Falta la variable de entorno ${variable}.`)
  return valor
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

/** Espera a que no queden esqueletos ni spinners y la red esté tranquila. */
export async function esperarListo(page, { extra = 400 } = {}) {
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 20000 }).catch(() => {})
  await page
    .waitForFunction(() => document.querySelectorAll('.animate-pulse, .animate-spin').length === 0, { timeout: 20000 })
    .catch(() => {})
  await esperar(extra)
}

/** Espera a que se vayan los toasts (sonner los quita solos a los ~4 s). */
export async function esperarSinToasts(page) {
  await page.waitForFunction(() => document.querySelectorAll('[data-sonner-toast]').length === 0, { timeout: 15000 }).catch(() => {})
  await esperar(300)
}

export async function ir(page, ruta) {
  await page.goto(`${URL_APP}${ruta}`, { waitUntil: 'networkidle2', timeout: 60000 })
  await esperarListo(page)
}

/** Clic en el primer elemento visible cuyo texto (sin espacios de más) sea o contenga `texto`. */
export async function clicTexto(page, texto, { selector = 'button, a, [role="tab"], label, li', exacto = false, indice = 0 } = {}) {
  const ok = await page.evaluate(
    (texto, selector, exacto, indice) => {
      const normal = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
      const visibles = [...document.querySelectorAll(selector)].filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      })
      const hallados = visibles.filter((el) => (exacto ? normal(el.textContent) === texto : normal(el.textContent).includes(texto)))
      // El más interno: evita hacer clic en un contenedor que también contiene el texto.
      const internos = hallados.filter((el) => !hallados.some((otro) => otro !== el && el.contains(otro)))
      const el = internos[indice]
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      el.click()
      return true
    },
    texto,
    selector,
    exacto,
    indice,
  )
  if (!ok) throw new Error(`No encontré "${texto}" (${selector}).`)
  await esperar(350)
}

/** Desplaza <main> para que el primer elemento con ese texto quede arriba (con `margen` px de aire). */
export async function verTexto(page, texto, { margen = 24 } = {}) {
  const ok = await page.evaluate(
    (texto, margen) => {
      const main = document.querySelector('main')
      const el = [...document.querySelectorAll('main h1, main h2, main h3, main p, main span, main div')].find(
        (e) => e.children.length === 0 && e.textContent.trim().toLowerCase().startsWith(texto.toLowerCase()),
      )
      if (!main || !el) return false
      main.scrollTop += el.getBoundingClientRect().top - main.getBoundingClientRect().top - margen
      return true
    },
    texto,
    margen,
  )
  if (!ok) throw new Error(`No encontré "${texto}" para desplazar la vista.`)
  await esperar(400)
}

/**
 * Marca con [data-captura] el elemento más pequeño que coincide con `contenedor` y contiene `texto`, para
 * recortarlo con `capturar(..., { selector: '[data-captura]' })`.
 */
export async function marcar(page, texto, contenedor = '.rounded-xl') {
  const ok = await page.evaluate(
    (texto, contenedor) => {
      document.querySelectorAll('[data-captura]').forEach((el) => el.removeAttribute('data-captura'))
      const hallados = [...document.querySelectorAll(contenedor)].filter((el) => el.textContent.includes(texto))
      const el = hallados.find((h) => !hallados.some((otro) => otro !== h && h.contains(otro)))
      if (!el) return false
      el.setAttribute('data-captura', '1')
      return true
    },
    texto,
    contenedor,
  )
  if (!ok) throw new Error(`No encontré "${texto}" dentro de ${contenedor}.`)
}

/** Escribe en el input/textarea cuyo label o placeholder contenga `etiqueta`. */
export async function escribir(page, etiqueta, valor) {
  const handle = await page.evaluateHandle((etiqueta) => {
    const campos = [...document.querySelectorAll('input, textarea')].filter((el) => el.getBoundingClientRect().width > 0)
    const porPlaceholder = campos.find((el) => (el.getAttribute('placeholder') ?? '').includes(etiqueta))
    if (porPlaceholder) return porPlaceholder
    const label = [...document.querySelectorAll('label')].find((l) => l.textContent.includes(etiqueta))
    if (!label) return null
    if (label.htmlFor) return document.getElementById(label.htmlFor)
    return label.querySelector('input, textarea') ?? label.parentElement?.querySelector('input, textarea') ?? null
  }, etiqueta)
  const el = handle.asElement()
  if (!el) throw new Error(`No encontré el campo "${etiqueta}".`)
  await el.click({ clickCount: 3 })
  await el.type(valor, { delay: 15 })
}

/**
 * Privacidad: difumina (sin cambiar el texto) los elementos cuyo texto propio contiene alguno de `textos`,
 * p. ej. cuentas reales que aparecen mezcladas con las de demostración.
 */
export async function difuminar(page, textos) {
  await page.evaluate((textos) => {
    const propio = (el) =>
      [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(' ') +
      (el instanceof HTMLSelectElement ? el.selectedOptions[0]?.textContent ?? '' : '')
    for (const el of document.querySelectorAll('body *')) {
      if (textos.some((t) => propio(el).includes(t))) el.style.filter = 'blur(5px)'
    }
  }, textos)
}

/** Difumina los elementos que coinciden con `selector` (p. ej. una imagen con datos personales). */
export async function difuminarSelector(page, selector) {
  await page.evaluate((selector) => {
    for (const el of document.querySelectorAll(selector)) el.style.filter = 'blur(10px)'
  }, selector)
}

/** Elige en el <select> cuyo label contiene `etiqueta` (o el n-ésimo select visible) la opción con ese texto. */
export async function seleccionar(page, etiqueta, textoOpcion, { indice = 0 } = {}) {
  const valor = await page.evaluate(
    (etiqueta, textoOpcion, indice) => {
      document.querySelectorAll('[data-captura-select]').forEach((el) => el.removeAttribute('data-captura-select'))
      const visibles = [...document.querySelectorAll('select')].filter((el) => el.getBoundingClientRect().width > 0)
      let select = null
      if (etiqueta) {
        const label = [...document.querySelectorAll('label, legend, p, span')].find(
          (l) => l.textContent.trim().startsWith(etiqueta) && (l.querySelector('select') || l.parentElement?.querySelector('select')),
        )
        select = label?.querySelector('select') ?? label?.parentElement?.querySelector('select') ?? null
      } else {
        select = visibles[indice] ?? null
      }
      if (!select) return null
      const opcion = [...select.options].find((o) => o.textContent.trim().includes(textoOpcion))
      if (!opcion) return null
      select.setAttribute('data-captura-select', '1')
      return opcion.value
    },
    etiqueta,
    textoOpcion,
    indice,
  )
  if (valor === null) throw new Error(`No encontré el select "${etiqueta ?? indice}" con la opción "${textoOpcion}".`)
  await page.select('[data-captura-select]', valor)
  await esperarListo(page, { extra: 300 })
}

/** Abre un contexto aislado, inicia sesión como `usuario` y deja la página en la ruta de inicio. */
export async function abrirSesion(browser, usuario, { movil = false, ruta = '/' } = {}) {
  const contexto = await browser.createBrowserContext()
  const page = await contexto.newPage()
  await page.setViewport(movil ? MOVIL : ESCRITORIO)
  await page.goto(`${URL_APP}/login`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.type('#correo', USUARIOS[usuario])
  await page.type('#password', passwordDe(usuario))
  await Promise.all([
    page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ])
  await esperarListo(page)
  if (ruta !== '/') await ir(page, ruta)
  return { contexto, page }
}

/** Página sin sesión (para el login). */
export async function abrirAnonimo(browser, { movil = false } = {}) {
  const contexto = await browser.createBrowserContext()
  const page = await contexto.newPage()
  await page.setViewport(movil ? MOVIL : ESCRITORIO)
  return { contexto, page }
}

/**
 * Guarda una captura en docs/manuales/capturas/<carpeta>/<nombre>.png.
 * - `selector`: recorta a ese elemento (con `margen` px alrededor).
 * - `modal: true`: recorta al cuadro del modal abierto.
 * - `completa: true`: página completa (scroll incluido).
 */
export async function capturar(page, carpeta, nombre, { selector, modal = false, margen = 12, completa = false, clip } = {}) {
  const dir = path.join(dirCapturas, carpeta)
  fs.mkdirSync(dir, { recursive: true })
  const destino = path.join(dir, `${nombre}.png`)
  const sel = modal ? '[role="dialog"] > div' : selector
  if (sel) {
    const el = await page.$(sel)
    if (!el) throw new Error(`No encontré ${sel} para ${nombre}.`)
    const vp = page.viewport()
    await el.scrollIntoView()
    await esperar(200)
    let caja = await el.boundingBox()
    // Un elemento más alto que la ventana (dentro del scroll de <main>) no se pinta completo: se agranda la
    // ventana lo necesario, se vuelve a medir y se restaura al final.
    const agrandar = caja.height + margen * 2 > vp.height
    if (agrandar) {
      await page.setViewport({ ...vp, height: Math.ceil(caja.height + margen * 2 + 200) })
      await esperar(400)
      await el.scrollIntoView()
      await esperar(200)
      caja = await el.boundingBox()
    }
    const x = Math.max(0, caja.x - margen)
    const y = Math.max(0, caja.y - margen)
    await page.screenshot({
      path: destino,
      clip: { x, y, width: Math.min(page.viewport().width - x, caja.width + margen * 2), height: caja.height + margen * 2 },
    })
    if (agrandar) await page.setViewport(vp)
  } else if (completa) {
    await capturaLarga(page, destino)
  } else {
    await page.screenshot({ path: destino, clip })
  }
  console.log(`  ✓ ${carpeta}/${nombre}.png`)
}

/**
 * El scroll de la app vive dentro de <main> (el layout mide 100vh), así que `fullPage` no baja: se agranda
 * la ventana al alto del contenido, se captura y se restaura.
 */
async function capturaLarga(page, destino, { maximo = 3600 } = {}) {
  const vp = page.viewport()
  const alto = await page.evaluate(() => {
    const main = document.querySelector('main')
    return main ? main.scrollHeight + main.getBoundingClientRect().top : document.documentElement.scrollHeight
  })
  await page.setViewport({ ...vp, height: Math.min(maximo, Math.max(vp.height, Math.ceil(alto))) })
  await esperar(500)
  await page.screenshot({ path: destino })
  await page.setViewport(vp)
  await esperar(300)
}

/** Ejecuta los pasos de un guion; si hay prefijos, solo los que coinciden. Un paso que falla no detiene los demás. */
export async function correrPasos(pasos, prefijos) {
  const fallidos = []
  for (const [nombre, fn] of pasos) {
    if (prefijos.length && !prefijos.some((p) => nombre.startsWith(p))) continue
    try {
      await fn(nombre)
    } catch (error) {
      fallidos.push(nombre)
      console.error(`  ✗ ${nombre}: ${error.message}`)
    }
  }
  return fallidos
}

async function explorar(browser, usuario, rutas) {
  const dir = path.resolve(process.env.MANUALES_EXPLORAR ?? '.explorar')
  fs.mkdirSync(dir, { recursive: true })
  const { page } = await abrirSesion(browser, usuario)
  for (const ruta of rutas) {
    await ir(page, ruta)
    const nombre = `${usuario}${ruta.replace(/[^a-z0-9]+/gi, '_')}.png`
    await capturaLarga(page, path.join(dir, nombre))
    console.log(`  ✓ ${path.join(dir, nombre)}`)
  }
}

async function main() {
  const [, , modo, ...resto] = process.argv
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--lang=es-HN'] })
  try {
    if (modo === 'explorar') {
      const [usuario, ...rutas] = resto
      await explorar(browser, usuario, rutas)
      return
    }
    const { GUIONES } = await import('./guiones.mjs')
    const guion = GUIONES[modo]
    if (!guion) throw new Error(`Rol desconocido: ${modo}. Opciones: ${Object.keys(GUIONES).join(', ')}`)
    console.log(`→ ${modo}`)
    const fallidos = await guion(browser, resto)
    if (fallidos?.length) {
      console.error(`\nFallaron ${fallidos.length}: ${fallidos.join(', ')}`)
      process.exitCode = 1
    }
  } finally {
    await browser.close()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
