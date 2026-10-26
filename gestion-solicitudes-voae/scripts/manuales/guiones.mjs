// Guiones de captura por rol para scripts/manuales/capturas.mjs. Cada paso es [nombre, fn]: el nombre es el
// archivo (docs/manuales/capturas/<carpeta>/<nombre>.png) y el orden en que aparece en el manual.
//
// Tickets [DEMO] usados (id → código): 1-5 AOAA-0001..0005 Enviado · 6 AOAA-0006 En proceso · 7 AOAA-0007
// asignado · 8 AOAA-0008 Finalizado · 9 AOAA-0009 Corrección · 10 AOAA-0010 Aprobado · 11 AOAA-0011
// Retrasado · 12 AOAA-0012 Aprobado (Automático) · 13 UCCR-0001 Finalizado · 14 AOAA-0013 excepcional
// pendiente · 15 AOAA-0014 aceptada · 16 AOAA-0015 rechazada · 17-19 AOAA-0016..0018 coberturas ·
// 20-22 AOAA-0019..0021 afiches IA.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  abrirAnonimo,
  abrirSesion,
  capturar,
  clicTexto,
  correrPasos,
  difuminar,
  difuminarSelector,
  escribir,
  esperar,
  esperarListo,
  esperarSinToasts,
  ir,
  marcar,
  seleccionar,
  verTexto,
  URL_APP,
  USUARIOS,
} from './capturas.mjs'

/** Cuentas reales que aparecen mezcladas con las de demostración: siempre se difuminan. */
const TEXTOS_PRIVADOS = ['angienam2004']
/** El afiche de AOAA-0019 (id 20) es la foto de un documento con nombre, cuenta y firma: se difumina. */
const SELECTOR_AFICHE_PRIVADO = 'img[src*="/20/"], img[alt*="AOAA-0019"]'

/** Sesiones abiertas una sola vez por guion (un contexto aislado por usuario). */
function sesiones(browser) {
  const abiertas = new Map()
  return async (usuario, opciones = {}) => {
    const clave = `${usuario}${opciones.movil ? ':movil' : ''}`
    if (!abiertas.has(clave)) {
      const sesion = await abrirSesion(browser, usuario, opciones)
      // Al salir del asistente con cambios, el navegador pregunta si se quiere salir: se acepta.
      sesion.page.on('dialog', (d) => void d.accept())
      abiertas.set(clave, sesion)
    }
    return abiertas.get(clave).page
  }
}

async function privacidad(page) {
  await difuminar(page, TEXTOS_PRIVADOS)
}

/** Abre la tarjeta de un tipo de solicitud en el paso 1 del asistente. */
async function elegirTipo(page, nombre) {
  await clicTexto(page, nombre, { selector: 'button', exacto: false })
  await esperarListo(page)
  // El paso 2 conserva el desplazamiento de la lista de tipos: se vuelve arriba para que los recortes cuadren.
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0))
  await esperar(300)
}

async function nuevaSolicitud(page, ruta = '/empleado/nueva') {
  await ir(page, ruta)
}

/** Abre el calendario de la fecha (primer selector de fecha del paso 2) y elige el primer día habilitado. */
async function elegirPrimeraFecha(page) {
  await page.click('button[aria-haspopup="dialog"]')
  await esperar(400)
  await page.evaluate(() => {
    const dia = [...document.querySelectorAll('[role="dialog"] button')].find(
      (b) => !b.disabled && /^\d+$/.test(b.textContent.trim()),
    )
    dia?.click()
  })
  await esperar(400)
}

/** Llena las generalidades mínimas de una solicitud de demostración. */
async function llenarGeneralidades(page, titulo) {
  await escribir(page, 'Título', titulo)
  await elegirPrimeraFecha(page)
  await escribir(page, 'Dirigido a', 'Estudiantes de la UNAH')
  await clicTexto(page, 'CIUDAD UNIVERSITARIA', { selector: 'label' })
}

/** Genera un afiche de ejemplo (PNG) para las capturas de "Afiche con IA". */
async function afichePng(browser) {
  const destino = path.join(os.tmpdir(), 'itickets-afiche-demo.png')
  if (fs.existsSync(destino)) return destino
  const contexto = await browser.createBrowserContext()
  const page = await contexto.newPage()
  await page.setViewport({ width: 600, height: 850 })
  await page.setContent(`<body style="margin:0;font-family:Arial;background:linear-gradient(160deg,#12397a,#0b1f3a);color:#fff;
    height:850px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
    <p style="letter-spacing:6px;color:#4fe0b0;margin:0">VOAE · UNAH</p>
    <h1 style="font-size:58px;margin:24px 40px">Feria de voluntariado</h1>
    <p style="font-size:26px;margin:0">Jueves 19 de noviembre · 9:00 a. m.</p>
    <p style="font-size:22px;opacity:.8">Plaza de la Libertad, Ciudad Universitaria</p>
    <p style="margin-top:80px;font-size:16px;opacity:.6">[DEMO] Afiche de ejemplo para el manual de usuario</p></body>`)
  await page.screenshot({ path: destino })
  await contexto.close()
  return destino
}

// ---------------------------------------------------------------------------------------------- comunes
async function comunes(browser, prefijos) {
  const sesion = sesiones(browser)
  const C = 'comunes'
  return correrPasos(
    [
      ['01_login', async (n) => {
        const { page } = await abrirAnonimo(browser)
        await page.goto(`${URL_APP}/login`, { waitUntil: 'networkidle0' })
        await esperar(800)
        await capturar(page, C, n)
      }],
      ['02_login_error', async (n) => {
        const { page } = await abrirAnonimo(browser)
        await page.goto(`${URL_APP}/login`, { waitUntil: 'networkidle0' })
        await page.type('#correo', USUARIOS.empleada)
        await page.type('#password', 'contraseña-equivocada')
        await page.click('button[type="submit"]')
        await page.waitForSelector('[data-sonner-toast]', { timeout: 15000 })
        await esperar(600)
        await capturar(page, C, n)
      }],
      ['03_primer_ingreso', async (n) => {
        const page = await sesion('nuevo')
        await esperarListo(page)
        await capturar(page, C, n)
      }],
      ['04_menu_desplegado', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/empleado')
        await capturar(page, C, n)
      }],
      ['06_notificaciones', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/empleado')
        await page.click('[aria-label="Notificaciones"]')
        await esperarListo(page)
        await capturar(page, C, n)
        await page.click('[aria-label="Notificaciones"]')
      }],
      ['07_cerrar_sesion', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/empleado')
        await capturar(page, C, n, { selector: 'header', margen: 0 })
      }],
      ['08_menu_movil', async (n) => {
        const page = await sesion('empleada', { movil: true })
        await ir(page, '/empleado')
        await page.click('[aria-label="Abrir menú"]')
        await esperar(500)
        await capturar(page, C, n)
      }],
    ],
    prefijos,
  )
}

/**
 * El texto de ayuda del buscador del historial publicado todavía dice "diseñador" (corregido en el código,
 * pendiente de publicar; ver OBSERVACIONES): se escribe el prefijo del área para que no aparezca.
 */
async function taparAyudaBuscador(page, texto = 'AOAA') {
  await page.type('input[placeholder^="Código, tipo"]', texto)
  await esperar(400)
}

/** Primera tarjeta del detalle de un ticket (código, estado, fechas y acciones). */
const ENCABEZADO_TICKET = 'main .rounded-xl.bg-white'

/** Marca y recorta la tarjeta (Card) de <main> que contiene `texto`. */
async function tarjeta(page, carpeta, nombre, texto) {
  await marcar(page, texto, 'main .rounded-xl.bg-white')
  await capturar(page, carpeta, nombre, { selector: '[data-captura]' })
}

// --------------------------------------------------------------------------------------------- empleado
async function empleado(browser, prefijos) {
  const sesion = sesiones(browser)
  const E = 'empleado'
  return correrPasos(
    [
      ['01_resumen', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/empleado')
        await capturar(page, E, n)
      }],
      ['02_nueva_tipos', async (n) => {
        const page = await sesion('empleada')
        await nuevaSolicitud(page)
        await capturar(page, E, n)
      }],
      ['03_nueva_buscador', async (n) => {
        const page = await sesion('empleada')
        await nuevaSolicitud(page)
        await page.type('input[placeholder="Buscar tipo de solicitud…"]', 'video')
        await esperar(500)
        await capturar(page, E, n)
      }],
      ['04_afiche', async () => {
        const page = await sesion('empleada')
        await nuevaSolicitud(page)
        await elegirTipo(page, 'Afiche')
        await escribir(page, 'Título', '[DEMO] Feria de emprendimiento estudiantil')
        await escribir(page, 'Dirigido a', 'Estudiantes de la UNAH')
        await clicTexto(page, 'CIUDAD UNIVERSITARIA', { selector: 'label' })
        await capturar(page, E, '04_generalidades')
        await clicTexto(page, '+ Logo de VOAE', { selector: 'button' })
        await clicTexto(page, '+ Logo de la UNAH', { selector: 'button' })
        await verTexto(page, 'Hora de inicio', { margen: 60 })
        await capturar(page, E, '05_campos_afiche')
      }],
      ['06_calendario', async (n) => {
        const page = await sesion('empleada')
        await nuevaSolicitud(page)
        await elegirTipo(page, 'Afiche')
        await page.click('button[aria-haspopup="dialog"]')
        await esperar(500)
        await capturar(page, E, n)
      }],
      ['07_trifolio_fecha_entrega', async (n) => {
        const page = await sesion('empleada')
        await nuevaSolicitud(page)
        await elegirTipo(page, 'Trifolio')
        await capturar(page, E, n, { clip: { x: 500, y: 80, width: 700, height: 440 } })
      }],
      // 08 → 13: una solicitud de video de punta a punta. Solo se envía de verdad con MANUALES_ENVIAR=1
      // (crea un ticket [DEMO] nuevo); sin esa variable se detiene en el modal "Antes de enviar".
      ['08_video', async () => {
        const page = await sesion('empleada')
        await nuevaSolicitud(page)
        await elegirTipo(page, 'Grabación y edición')
        await capturar(page, E, '08_video_aviso', { clip: { x: 500, y: 80, width: 700, height: 230 } })
        await llenarGeneralidades(page, '[DEMO] Video de bienvenida a nuevo ingreso')
        await clicTexto(page, 'Continuar', { selector: 'button' })
        await esperar(400)
        await verTexto(page, 'Objetivo', { margen: 120 })
        await capturar(page, E, '09_campo_obligatorio')
        await esperarSinToasts(page)
        await escribir(page, 'Objetivo', 'Dar la bienvenida a los estudiantes de nuevo ingreso del primer período.')
        await escribir(page, 'Encargado de la actividad', 'Área de Orientación y Asesoría Académica')
        await clicTexto(page, 'Continuar', { selector: 'button' })
        await esperarListo(page)
        await escribir(page, 'Título (ej. Fotos del evento)', 'Guion de referencia')
        await escribir(page, 'drive.google.com/…', 'drive.google.com/drive/folders/demo-voae')
        await esperar(400)
        await tarjeta(page, E, '10_adjuntos_enlace', 'Agregar un enlace')
        await clicTexto(page, 'Agregar', { selector: 'button', exacto: true })
        await clicTexto(page, 'Continuar', { selector: 'button' })
        await esperarListo(page)
        await tarjeta(page, E, '11_revisar_y_enviar', 'Revisa tu solicitud')
        await clicTexto(page, 'Enviar solicitud', { selector: 'button' })
        await esperar(500)
        await capturar(page, E, '12_antes_de_enviar', { modal: true })
        if (process.env.MANUALES_ENVIAR !== '1') {
          console.log('  · Sin MANUALES_ENVIAR=1: no se envía (13_solicitud_enviada queda como estaba).')
          return
        }
        await clicTexto(page, 'Acepto, enviar solicitud', { selector: 'button' })
        await page.waitForSelector('[data-sonner-toast]', { timeout: 30000 })
        await esperarListo(page, { extra: 300 })
        const texto = await page.$eval('[data-sonner-toast]', (el) => el.textContent)
        console.log(`  · Ticket creado: ${texto}`)
        await capturar(page, E, '13_solicitud_enviada')
      }],
      ['14_mis_solicitudes', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/empleado/solicitudes')
        await capturar(page, E, n)
      }],
      ['15_filtros', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/empleado/solicitudes')
        await seleccionar(page, null, 'Corrección', { indice: 0 })
        await capturar(page, E, n, { clip: { x: 256, y: 64, width: 1184, height: 340 } })
      }],
      ['16_busqueda', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/empleado/solicitudes')
        await page.type('input[placeholder^="Buscar por código"]', 'AOAA-0010')
        await esperar(500)
        await capturar(page, E, n, { clip: { x: 256, y: 64, width: 1184, height: 340 } })
      }],
      ['18_entregables', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/tickets/10')
        await tarjeta(page, E, n, 'Entregables')
      }],
      ['19_agregar_adjunto', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/tickets/5')
        await clicTexto(page, 'Agregar', { selector: 'button', exacto: true })
        await esperar(400)
        await capturar(page, E, n, { modal: true })
        await page.keyboard.press('Escape')
      }],
      // 20 → 23: afiche con IA nuevo. Igual que el video: solo se envía con MANUALES_ENVIAR=1.
      ['20_ia', async () => {
        const page = await sesion('empleada')
        await nuevaSolicitud(page)
        await elegirTipo(page, 'Aprobación de afiches con IA')
        await llenarGeneralidades(page, '[DEMO] Feria de voluntariado')
        await capturar(page, E, '20_ia_formulario', { clip: { x: 500, y: 80, width: 700, height: 560 } })
        await clicTexto(page, 'Continuar', { selector: 'button' })
        await esperarListo(page)
        const input = await page.$('input[type="file"]')
        await input.uploadFile(await afichePng(browser))
        await esperarListo(page, { extra: 800 })
        await tarjeta(page, E, '21_ia_subir_afiche', 'Comentario para quien revisa')
        await clicTexto(page, 'Continuar', { selector: 'button' })
        await esperarListo(page)
        await tarjeta(page, E, '22_ia_revisar', 'Revisa tu solicitud')
        if (process.env.MANUALES_ENVIAR !== '1') {
          console.log('  · Sin MANUALES_ENVIAR=1: no se envía (23_ia_enviada queda como estaba).')
          return
        }
        await clicTexto(page, 'Enviar solicitud', { selector: 'button' })
        await page.waitForFunction(() => location.pathname.startsWith('/tickets/'), { timeout: 60000 })
        await esperarListo(page, { extra: 800 })
        console.log(`  · Ticket IA creado: ${page.url()}`)
        await tarjeta(page, E, '23_ia_enviada', 'Envíos y revisiones')
      }],
      ['24_ia_rechazado', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/tickets/21')
        await tarjeta(page, E, n, 'Envíos y revisiones')
      }],
      ['25_ia_aprobado', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/tickets/22')
        await tarjeta(page, E, n, 'Progreso de la solicitud')
      }],
      ['26_cobertura_formulario', async (n) => {
        const page = await sesion('empleada')
        await nuevaSolicitud(page)
        await elegirTipo(page, 'Cobertura de evento')
        await verTexto(page, 'Hora', { margen: 380 })
        await capturar(page, E, n)
      }],
      ['27_cobertura_aprobada', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/tickets/18')
        await tarjeta(page, E, n, 'Decisión de validación')
      }],
      ['28_cobertura_rechazada', async (n) => {
        const page = await sesion('empleada')
        await ir(page, '/tickets/19')
        await tarjeta(page, E, n, 'Decisión de validación')
      }],
      ['29_movil_mis_solicitudes', async (n) => {
        const page = await sesion('empleada', { movil: true })
        await ir(page, '/empleado/solicitudes')
        await capturar(page, E, n)
      }],
    ],
    prefijos,
  )
}

// ------------------------------------------------------------------------------------------ jefe de área
async function jefe(browser, prefijos) {
  const sesion = sesiones(browser)
  const J = 'jefe'
  return correrPasos(
    [
      ['01_por_dictaminar', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/jefe')
        await taparAyudaBuscador(page)
        await capturar(page, J, n)
      }],
      ['02_cronometro', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/tickets/8')
        await capturar(page, J, n, { selector: ENCABEZADO_TICKET })
      }],
      ['03_detalle_entregables', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/tickets/8')
        await tarjeta(page, J, n, 'Entregables')
      }],
      ['04_dictaminar', async () => {
        const page = await sesion('jefe')
        await ir(page, '/tickets/8')
        await clicTexto(page, 'Dictaminar', { selector: 'button', exacto: true })
        await esperar(400)
        await capturar(page, J, '04_dictaminar_aprobar', { modal: true })
        await clicTexto(page, 'Pedir corrección', { selector: '[role="dialog"] button' })
        await page.type('[role="dialog"] textarea', 'Por favor, agranda el logo de la VOAE y corrige la hora del evento.')
        await capturar(page, J, '05_dictaminar_correccion', { modal: true })
        await clicTexto(page, 'Cancelar', { selector: '[role="dialog"] button', exacto: true })
      }],
      ['06_correccion_contador', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/tickets/9')
        await capturar(page, J, n, { selector: ENCABEZADO_TICKET })
      }],
      ['07_historial', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/jefe')
        await page.type('input[placeholder^="Código, tipo"]', 'Afiche')
        await esperar(500)
        await verTexto(page, 'Historial')
        await capturar(page, J, n)
      }],
      ['08_exportar', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/jefe')
        await taparAyudaBuscador(page)
        await verTexto(page, 'Historial')
        await clicTexto(page, 'Exportar', { selector: 'button' })
        await capturar(page, J, n)
      }],
      ['09_excepcional_aviso', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/jefe/excepcional')
        await capturar(page, J, n)
      }],
      ['10_excepcional_calendario', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/jefe/excepcional')
        await elegirTipo(page, 'Afiche')
        await page.click('button[aria-haspopup="dialog"]')
        await esperar(500)
        await capturar(page, J, n)
      }],
      ['11_mis_excepcionales', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/jefe/excepcional')
        await verTexto(page, 'Mis solicitudes excepcionales')
        await capturar(page, J, n)
      }],
      ['12_excepcional_aceptada', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/tickets/15')
        await capturar(page, J, n, { selector: ENCABEZADO_TICKET })
      }],
      ['13_excepcional_rechazada', async (n) => {
        const page = await sesion('jefe')
        await ir(page, '/tickets/16')
        await capturar(page, J, n, { selector: ENCABEZADO_TICKET })
      }],
      ['14_coordinaciones_filtro', async (n) => {
        const page = await sesion('coordinador')
        await ir(page, '/jefe')
        await seleccionar(page, 'Área / Coordinación', 'Unidad Coordinadora')
        // El texto de ayuda del buscador publicado todavía menciona al diseñador (ver OBSERVACIONES): se
        // escribe una búsqueda para que no aparezca.
        await page.type('input[placeholder^="Código, tipo"]', 'UCCR')
        await esperar(400)
        await capturar(page, J, n)
      }],
      ['15_coordinaciones_ticket', async (n) => {
        const page = await sesion('coordinador')
        await ir(page, '/tickets/13')
        await capturar(page, J, n, { selector: ENCABEZADO_TICKET })
      }],
    ],
    prefijos,
  )
}

// --------------------------------------------------------------------------------------------- diseñador
async function disenador(browser, prefijos) {
  const sesion = sesiones(browser)
  const D = 'disenador'
  return correrPasos(
    [
      ['01_sin_asignacion', async (n) => {
        const page = await sesion('disenadora')
        await ir(page, '/disenador')
        await capturar(page, D, n)
      }],
      ['02_tomar_desde_detalle', async (n) => {
        const page = await sesion('disenadora')
        await ir(page, '/tickets/1')
        await capturar(page, D, n, { selector: ENCABEZADO_TICKET })
      }],
      ['03_mis_tickets', async (n) => {
        const page = await sesion('disenadora')
        await ir(page, '/disenador')
        await clicTexto(page, 'Mis tickets', { selector: 'button, [role="tab"]' })
        await esperarListo(page)
        await capturar(page, D, n)
      }],
      ['04_etiqueta_excepcional', async (n) => {
        const page = await sesion('disenadora')
        await ir(page, '/disenador')
        await clicTexto(page, 'Mis tickets', { selector: 'button, [role="tab"]' })
        await esperarListo(page)
        await marcar(page, 'AOAA-0014')
        await capturar(page, D, n, { selector: '[data-captura]' })
      }],
      ['05_excepcionales_pendientes', async (n) => {
        const page = await sesion('disenadora')
        await ir(page, '/disenador')
        await clicTexto(page, 'Excepcionales pendientes de aceptación', { selector: 'button, summary' })
        await esperar(400)
        await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 99999))
        await esperar(400)
        await capturar(page, D, n)
      }],
      ['06_detalle_en_proceso', async (n) => {
        const page = await sesion('disenadora')
        await ir(page, '/tickets/6')
        await capturar(page, D, n, { selector: ENCABEZADO_TICKET })
      }],
      ['07_subir_entregable', async () => {
        const page = await sesion('disenadora')
        await ir(page, '/tickets/6')
        await clicTexto(page, 'Subir entregable', { selector: 'button', exacto: true })
        await esperar(400)
        await capturar(page, D, '07_subir_entregable_archivo', { modal: true })
        await clicTexto(page, 'Enlace', { selector: '[role="dialog"] button', exacto: true })
        await escribir(page, 'drive.google.com/…', 'drive.google.com/file/d/version-1-demo')
        await escribir(page, 'Descripción (opcional)', 'Versión 1 del banner')
        await esperar(300)
        await capturar(page, D, '08_subir_entregable_enlace', { modal: true })
        await page.keyboard.press('Escape')
      }],
      ['09_correccion', async (n) => {
        const page = await sesion('disenadora')
        await ir(page, '/tickets/9')
        await tarjeta(page, D, n, 'Dictámenes')
      }],
      ['10_retrasado', async (n) => {
        const page = await sesion('disenadora')
        await ir(page, '/tickets/11')
        await capturar(page, D, n, { selector: ENCABEZADO_TICKET })
      }],
    ],
    prefijos,
  )
}

// --------------------------------------------------------------------------------------------- asignador
async function asignador(browser, prefijos) {
  const sesion = sesiones(browser)
  const A = 'asignador'
  async function abrir(ruta = '/asignador') {
    const page = await sesion('asignadora')
    await ir(page, ruta)
    await privacidad(page)
    return page
  }
  return correrPasos(
    [
      ['01_asignacion', async (n) => {
        const page = await abrir()
        await capturar(page, A, n)
      }],
      ['02_excepcional', async () => {
        const page = await abrir()
        await marcar(page, 'AOAA-0013', 'div.rounded-xl, div.rounded-lg')
        await page.evaluate(() => [...document.querySelector('[data-captura]').querySelectorAll('button')].find((b) => b.textContent.includes('Dictaminar'))?.click())
        await esperar(400)
        await seleccionar(page, 'Asignar a', 'diana')
        await capturar(page, A, '02_excepcional_aceptar', { modal: true })
        await clicTexto(page, 'Rechazar', { selector: '[role="dialog"] button', exacto: true })
        await page.type('[role="dialog"] textarea', 'No es posible atenderla en 2 días hábiles por la carga actual. Envíala como solicitud normal.')
        await capturar(page, A, '03_excepcional_rechazar', { modal: true })
        await page.keyboard.press('Escape')
      }],
      ['04_galeria_sin_asignar', async (n) => {
        const page = await abrir()
        await verTexto(page, '#1', { margen: 80 })
        await capturar(page, A, n)
      }],
      ['05_asignar_a', async (n) => {
        // "Asignar a…" asigna en cuanto se elige un nombre (no hay confirmación): solo se muestra el control.
        const page = await abrir()
        await marcar(page, 'AOAA-0001')
        await capturar(page, A, n, { selector: '[data-captura]' })
      }],
      ['06_pestana_disenador', async (n) => {
        const page = await abrir()
        await clicTexto(page, 'pedro diseñador demo', { selector: 'button, [role="tab"]' })
        await esperarListo(page)
        await privacidad(page)
        await capturar(page, A, n)
      }],
      ['07_reasignar', async (n) => {
        const page = await abrir()
        await clicTexto(page, 'pedro diseñador demo', { selector: 'button, [role="tab"]' })
        await esperarListo(page)
        // Seguridad: solo se toca un select de "Reasignar a…" (abre confirmación); "Asignar a…" asignaría al instante.
        const primero = await page.evaluate(() => {
          const s = [...document.querySelectorAll('select')].find((el) => el.getBoundingClientRect().width > 0)
          return s?.options[0]?.textContent.trim() ?? ''
        })
        if (primero !== 'Reasignar a…') throw new Error(`El primer select es "${primero}", no "Reasignar a…": no se toca.`)
        await seleccionar(page, null, 'diana', { indice: 0 })
        await esperar(400)
        await capturar(page, A, n, { modal: true })
        await clicTexto(page, 'Cancelar', { selector: '[role="dialog"] button', exacto: true })
      }],
    ],
    prefijos,
  )
}

// --------------------------------------------------------------------------------------------- validador
async function validador(browser, prefijos) {
  const sesion = sesiones(browser)
  const V = 'validador'
  async function bandeja(ruta) {
    const page = await sesion('validadora')
    await ir(page, ruta)
    await difuminarSelector(page, 'article[aria-label="Ticket AOAA-0019"] img')
    return page
  }
  async function dictaminarDesdeBandeja(page, codigo) {
    await page.evaluate((codigo) => {
      const tarjeta = document.querySelector(`article[aria-label="Ticket ${codigo}"]`)
      ;[...tarjeta.querySelectorAll('button')].find((b) => b.textContent.includes('Dictaminar'))?.click()
    }, codigo)
    await page.waitForFunction(() => location.pathname.startsWith('/tickets/'), { timeout: 20000 })
    await esperarListo(page, { extra: 800 })
  }
  return correrPasos(
    [
      ['01_afiches_pendientes', async (n) => {
        const page = await bandeja('/validador')
        await capturar(page, V, n)
      }],
      ['02_historial_intentos', async (n) => {
        const page = await bandeja('/tickets/21')
        await tarjeta(page, V, n, 'Envíos y revisiones')
      }],
      ['03_dictaminar_afiche', async () => {
        const page = await bandeja('/validador')
        await dictaminarDesdeBandeja(page, 'AOAA-0023')
        await capturar(page, V, '03_dictaminar_afiche_aprobar', { modal: true })
        await clicTexto(page, 'Rechazar', { selector: '[role="dialog"] button', exacto: true })
        await page.type('[role="dialog"] textarea', 'La fecha del evento no coincide con la solicitud. Corrígela y vuelve a enviarlo.')
        await capturar(page, V, '04_dictaminar_afiche_rechazar', { modal: true })
        await page.keyboard.press('Escape')
      }],
      ['05_solicitudes_pendientes', async (n) => {
        const page = await bandeja('/validador/solicitudes')
        await capturar(page, V, n)
      }],
      ['06_dictaminar_cobertura', async () => {
        const page = await bandeja('/validador/solicitudes')
        await dictaminarDesdeBandeja(page, 'AOAA-0016')
        await capturar(page, V, '06_dictaminar_cobertura_aprobar', { modal: true })
        await clicTexto(page, 'Rechazar', { selector: '[role="dialog"] button', exacto: true })
        await page.type('[role="dialog"] textarea', 'Ese día el equipo ya cubre otro evento institucional.')
        await capturar(page, V, '07_dictaminar_cobertura_rechazar', { modal: true })
        await page.keyboard.press('Escape')
      }],
      ['08_cobertura_aprobada', async (n) => {
        const page = await bandeja('/tickets/18')
        await tarjeta(page, V, n, 'Decisión de validación')
      }],
      ['09_cobertura_rechazada', async (n) => {
        const page = await bandeja('/tickets/19')
        await tarjeta(page, V, n, 'Decisión de validación')
      }],
    ],
    prefijos,
  )
}

// ---------------------------------------------------------------------------------------------- analista
async function analista(browser, prefijos) {
  const sesion = sesiones(browser)
  const N = 'analista'
  async function abrir(usuario = 'analista') {
    const page = await sesion(usuario)
    await ir(page, '/analista')
    await privacidad(page)
    return page
  }
  return correrPasos(
    [
      ['01_estadisticas', async (n) => {
        const page = await abrir()
        await capturar(page, N, n)
      }],
      ['02_filtro_flujo', async (n) => {
        const page = await abrir()
        await seleccionar(page, 'Flujo', 'Aprobación con IA')
        await capturar(page, N, n)
      }],
      ['03_graficas', async (n) => {
        const page = await abrir()
        await verTexto(page, 'Solicitudes por mes', { margen: 260 })
        await capturar(page, N, n)
      }],
      ['04_graficas_estado', async (n) => {
        const page = await abrir()
        await verTexto(page, 'Por área', { margen: 260 })
        await capturar(page, N, n)
      }],
      ['05_tabla_busqueda', async (n) => {
        const page = await abrir()
        await page.type('input[placeholder^="Buscar por código"]', 'AOAA-001')
        await esperar(500)
        await verTexto(page, 'Detalle', { margen: 290 })
        await capturar(page, N, n)
      }],
      ['06_exportar', async (n) => {
        const page = await abrir()
        await verTexto(page, 'Detalle', { margen: 290 })
        await clicTexto(page, 'Exportar', { selector: 'button' })
        await capturar(page, N, n)
      }],
      ['07_pdf_exportado', async (n) => {
        const page = await abrir()
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'itickets-pdf-'))
        // Cada sesión vive en su propio contexto: el permiso de descarga se da a ese contexto.
        const cdp = await browser.target().createCDPSession()
        await cdp.send('Browser.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: dir,
          browserContextId: page.browserContext().id,
        })
        await verTexto(page, 'Detalle', { margen: 290 })
        await clicTexto(page, 'Exportar', { selector: 'button' })
        await clicTexto(page, 'PDF', { selector: 'button', exacto: true })
        let pdf = null
        for (let i = 0; i < 40 && !pdf; i++) {
          await esperar(500)
          pdf = fs.readdirSync(dir).find((f) => f.endsWith('.pdf'))
        }
        if (!pdf) throw new Error('No se descargó el PDF.')
        await pdfComoImagen(browser, path.join(dir, pdf), N, n)
      }],
    ],
    prefijos,
  )
}

/** Dibuja la primera página de un PDF con pdf.js (el visor de PDF de Chrome no se ve en las capturas). */
async function pdfComoImagen(browser, archivo, carpeta, nombre) {
  const contexto = await browser.createBrowserContext()
  const page = await contexto.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const datos = fs.readFileSync(archivo).toString('base64')
  await page.setContent(`<!doctype html><body style="margin:0;background:#525659;display:flex;justify-content:center;padding:24px 0">
    <canvas id="c" style="box-shadow:0 2px 12px rgba(0,0,0,.4)"></canvas>
    <script type="module">
      import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs'
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs'
      const bytes = Uint8Array.from(atob('${datos}'), (c) => c.charCodeAt(0))
      const doc = await pdfjs.getDocument({ data: bytes }).promise
      const pagina = await doc.getPage(1)
      const vista = pagina.getViewport({ scale: 1300 / pagina.getViewport({ scale: 1 }).width })
      const c = document.getElementById('c')
      c.width = vista.width; c.height = vista.height
      await pagina.render({ canvasContext: c.getContext('2d'), viewport: vista }).promise
      document.body.dataset.listo = '1'
    </script></body>`)
  await page.waitForSelector('body[data-listo="1"]', { timeout: 60000 })
  const alto = await page.evaluate(() => document.getElementById('c').height + 48)
  await page.setViewport({ width: 1440, height: Math.min(1400, alto) })
  await capturar(page, carpeta, nombre)
  await contexto.close()
}

// ----------------------------------------------------------------------------------------- administrador
async function administrador(browser, prefijos) {
  const sesion = sesiones(browser)
  const AD = 'administrador'
  async function abrir(ruta) {
    const page = await sesion('admin')
    await ir(page, ruta)
    await privacidad(page)
    return page
  }
  return correrPasos(
    [
      ['01_kpis', async (n) => {
        const page = await abrir('/admin')
        await capturar(page, AD, n)
      }],
      ['02_usuarios', async (n) => {
        const page = await abrir('/admin/usuarios')
        await capturar(page, AD, n, { completa: true })
      }],
      ['03_crear_usuario', async (n) => {
        const page = await abrir('/admin/usuarios')
        await clicTexto(page, 'Crear usuario', { selector: 'button' })
        await esperar(400)
        await escribir(page, 'Nombres', 'Ana Lucía')
        await escribir(page, 'Primer apellido', 'Ejemplo')
        await escribir(page, 'Segundo apellido', 'Demo')
        await escribir(page, 'Correo institucional', 'ana.ejemplo@voae.test')
        await seleccionar(page, 'Área', 'Unidad Coordinadora')
        await seleccionar(page, 'Rol inicial', 'Empleado')
        await capturar(page, AD, n, { modal: true })
        await page.keyboard.press('Escape')
      }],
      ['04_roles_asignador', async (n) => {
        const page = await abrir('/admin/usuarios')
        await marcar(page, 'asignadora.demo@voae.test', 'tr')
        await capturar(page, AD, n, { selector: '[data-captura]', margen: 0 })
      }],
      ['05_tambien_es_jefe', async (n) => {
        const page = await abrir('/admin/usuarios')
        await marcar(page, 'coordinador.demo@voae.test', 'tr')
        await page.evaluate(() => [...document.querySelector('[data-captura]').querySelectorAll('button')].find((b) => b.textContent.includes('También es jefe de'))?.click())
        await esperar(500)
        await capturar(page, AD, n, { modal: true })
        await page.keyboard.press('Escape')
      }],
      ['06_desactivar_disenador', async (n) => {
        const page = await abrir('/admin/usuarios')
        await marcar(page, 'disenador2.demo@voae.test', 'tr')
        await page.evaluate(() => [...document.querySelector('[data-captura]').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Activo')?.click())
        await page.waitForSelector('[role="dialog"]', { timeout: 15000 })
        await esperarListo(page)
        await capturar(page, AD, n, { modal: true })
        await clicTexto(page, 'Cancelar', { selector: '[role="dialog"] button', exacto: true })
      }],
      ['07_catalogos', async (n) => {
        const page = await abrir('/admin/catalogos')
        await capturar(page, AD, n)
      }],
      ['08_tipos_solicitud', async (n) => {
        const page = await abrir('/admin/catalogos')
        await verTexto(page, 'Tipos de solicitud')
        await privacidad(page)
        await capturar(page, AD, n)
      }],
      ['09_crear_tipo', async (n) => {
        const page = await abrir('/admin/catalogos')
        await clicTexto(page, 'Crear tipo', { selector: 'button' })
        await esperar(400)
        await capturar(page, AD, n, { modal: true })
        await page.keyboard.press('Escape')
      }],
      ['10_campos', async () => {
        const page = await abrir('/admin/catalogos')
        await marcar(page, 'Diseño de trifolio informativo', 'tr')
        await page.evaluate(() => [...document.querySelector('[data-captura]').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Campos')?.click())
        await esperarListo(page, { extra: 600 })
        await capturar(page, AD, '10_campos_tipo', { modal: true })
        // 11: el editor de un campo nuevo de tipo texto, con la "Longitud máxima" predeterminada (se cancela).
        await clicTexto(page, 'Agregar campo', { selector: '[role="dialog"] button' })
        await esperar(400)
        await escribir(page, 'Etiqueta', 'Nombre del expositor')
        await esperar(300)
        await capturar(page, AD, '11_editor_campo', { modal: true })
        await page.keyboard.press('Escape')
      }],
      ['12_feriados', async (n) => {
        const page = await abrir('/admin/feriados')
        await capturar(page, AD, n)
      }],
      ['13_crear_feriado', async (n) => {
        const page = await abrir('/admin/feriados')
        await clicTexto(page, 'Crear feriado', { selector: 'button' })
        await esperar(400)
        await escribir(page, 'Nombre', 'Semana Morazánica')
        await capturar(page, AD, n, { modal: true })
        await page.keyboard.press('Escape')
      }],
      ['14_bitacora_roles', async (n) => {
        const page = await abrir('/admin/bitacora')
        await capturar(page, AD, n)
      }],
      ['15_bitacora_feriados', async (n) => {
        const page = await abrir('/admin/bitacora?tab=feriados')
        await capturar(page, AD, n)
      }],
      ['16_bitacora_asignaciones', async (n) => {
        const page = await abrir('/admin/bitacora?tab=asignaciones')
        await page.type('input[placeholder^="Buscar por código"]', 'AOAA-0007')
        await esperar(500)
        await capturar(page, AD, n)
      }],
      ['17_estadisticas', async (n) => {
        const page = await abrir('/analista')
        await capturar(page, AD, n)
      }],
    ],
    prefijos,
  )
}

export const GUIONES = { comunes, empleado, jefe, disenador, asignador, validador, analista, administrador }
