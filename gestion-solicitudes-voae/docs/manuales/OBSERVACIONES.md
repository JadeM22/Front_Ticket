# Observaciones

Diferencias encontradas entre la app real y las reglas descritas en el prompt de los manuales,
y capturas pendientes. Se completa mientras se redactan los manuales.

## Entorno y herramientas

- Las capturas se guardaron en **.jpg o .png** (según cuál formato devolvió la herramienta de
  captura: `screenshot` da `.jpg`, `zoom`/recorte da `.png`), no todas en `.png` como decía el
  prompt original. Ambos generadores (`md2docx.cjs`, `md2pdf.mjs`) ya soportan ambos formatos sin
  cambios — no fue necesario convertir nada.
- Los scripts generadores (`md2docx.cjs`, `md2pdf.mjs`) existían, pero en `src/scripts/` en vez de
  `scripts/manuales/` como pide el prompt. Se movieron a `scripts/manuales/` (sin reescribir su
  lógica) y se instalaron sus dependencias (`docx`, `marked`, `puppeteer-core`).
- La navegación `file://` está bloqueada por la extensión Claude in Chrome, así que no pude abrir
  visualmente el PDF/DOCX generados en el navegador. Los validé de otra forma: conteo de imágenes
  incrustadas (14/14 en el PDF del manual de Administrador, sin texto "[Falta la imagen]") y
  apertura de página por página no fue posible por falta de `poppler-utils` en esta máquina para
  el visor de PDF del propio Claude Code.

## Datos de prueba y privacidad

- La sesión de `front-ticket.pages.dev` tenía datos reales mezclados con datos de prueba (lista de
  Usuarios, Bitácora → Roles y Asignaciones): nombres y correos @gmail.com de personas reales junto
  a las cuentas "(semilla)" / @voae.test. Para el manual de Administrador:
  - Se creó un usuario de prueba nuevo, **Prueba Manual Ejemplo Ficticio**
    (`prueba.manual.uno@voae.test`), para las capturas de "Crear usuario" y la contraseña temporal.
  - Se le agregó temporalmente el rol Diseñador y se probó inhabilitar/reactivar su cuenta (0
    tickets activos, así que solo se ve el modal "normal", no la variante con lista de tickets).
  - En Bitácora se usó el filtro **Realizado por = "Manual Administador ."** para mostrar solo las
    filas que generé yo mismo, evitando exponer nombres/correos reales.
  - En Bitácora → Asignaciones no había ninguna acción propia de la cuenta de prueba (nunca asignó
    tickets), así que solo se capturó el panel de filtros vacío, sin filas.
- **Pendiente:** no se capturó el modal de "Inhabilitar usuario" en su variante **con tickets
  activos** (la que lista códigos de tickets y el aviso a Asignadores/solicitantes), porque habría
  requerido asignarle tickets reales a un diseñador de prueba, cruzando con los roles Empleado y
  Asignador. Se puede retomar más adelante si se arma esa cadena de datos de prueba entre roles.
- No se capturó el detalle abierto del selector "+ rol" mostrando "Asignador (requiere Diseñador)"
  en gris: los menús `<select>` nativos abiertos no se mantienen estables entre capturas
  automatizadas. La regla queda documentada en el texto del manual, confirmada contra el código
  (`admin/Usuarios.tsx`) y contra la UI (se vio una vez, de forma efímera).
- **No se capturó el aviso de "fuera de horario"** al enviar una solicitud: la sesión de pruebas se
  hizo dentro del horario hábil (14/10/2026, horas de la tarde), así que nunca apareció ese aviso.
  En el manual del Empleado quedó solo como regla de texto (sección 5), sin captura — no se dejó un
  marcador de imagen roto a propósito.
- **`resize_window` no cambia el tamaño real de la ventana en esta máquina** (se confirmó con
  `window.innerWidth/outerWidth` vía JavaScript: siempre queda en 1536×816 sin importar el ancho
  pedido). Por eso no se pudo capturar la "vista móvil" que pide el manual del Empleado para "Mis
  solicitudes"; queda pendiente si se corre esto desde un entorno donde si funcione el resize, o
  usando las herramientas de dispositivo de Chrome DevTools manualmente.

## Segunda sesión (14/10/2026, desde las 4:40 p. m.)

### Pendientes resueltos

- **B1** inicio de sesión → `empleado/19_inicio_sesion.jpg`. Chrome había autocompletado el formulario con un
  correo personal guardado; se vaciaron los campos antes de capturar.
- **B3** menú lateral desplegado → `empleado/20_sidebar_desplegado.jpg`.
- **B4** filtros de "Mis solicitudes" → `empleado/21_filtros_mis_solicitudes.jpg`.
- **B5** aviso de fuera de horario → `empleado/22_fuera_horario.jpg` (capturado a las 4:45 p. m.).

### Diferencias entre la app y las reglas del prompt

- **Fuera de horario el Empleado sí puede llenar el formulario.** El aviso dice: "Puedes llenar el
  formulario, pero el envío se habilitará en horario hábil". Solo se bloquea el botón de enviar. El
  manual del Empleado ya lo dice así.
- **El Jefe de ADH vio tickets AOAA un rato.** Al entrar, "Manual Jefe de Area" (Área de Desarrollo
  Humano) tenía en "Por dictaminar" el ticket AOAA-0034 y en el Historial varias filas AOAA. Minutos
  después ya no aparecía ninguna (AOAA-0034 seguía en "Finalizado" según el Asignador). No se pudo
  confirmar si fue un cambio de permisos en ese momento o un problema de permisos intermitente.
- **"Mis solicitudes excepcionales"** no es una pantalla aparte: es una sección al final de la
  página "Solicitud excepcional" del Jefe.
- **Etiqueta "Aceptada por …"** en "Mis solicitudes excepcionales" muestra el nombre del
  **diseñador asignado**, no del Asignador que la aceptó (ADH-0041 dice "Aceptada por Prueba Manual
  Ejemplo Ficticio"; la aceptó Manual Asignador). La notificación sí lo dice bien: "fue ACEPTADA y la
  trabaja …".
- **La tarjeta de una excepcional sigue en "Excepcionales pendientes"** después de aceptarla o
  rechazarla, hasta recargar la página (pasó con ADH-0041 y ADH-0042). Lo mismo pasa al pulsar
  **Tomar** en "Mi tablero": la tarjeta sigue en la cola hasta recargar.
- **El buscador de Bitácora pierde letras al escribir.** Al teclear "adh 0041" quedó solo "1", porque
  la búsqueda se guarda en la dirección de la página con cada tecla. Funciona si se pega el texto completo.

### Datos de prueba creados en esta sesión

- **ADH-0041** (Afiche, excepcional, evento 20/10/2026): enviada por Manual Jefe de Area, aceptada
  por Manual Asignador y asignada a **Prueba Manual Ejemplo Ficticio**. Sirve para B8 (modal de
  inhabilitar con tickets activos).
- **ADH-0042** (Afiche, excepcional, evento 21/10/2026): enviada por Manual Jefe de Area y rechazada
  por Manual Asignador con el motivo "El equipo de diseño no tiene disponibilidad para la fecha del
  evento."

### Privacidad

- La pestaña de diseñador **"angienam2004"** del Asignador parece una cuenta personal. Se tapó con una
  barra gris en todas las capturas de `asignador/`.
- "Edwin Miranda" y "Diego Gamez" son cuentas de prueba del equipo (confirmado por la responsable);
  se dejan visibles.

### Administrador (B7 a B9)

- **B7** "+ rol": no se puede capturar el menú nativo abierto. Se confirmó en la página que, para una
  cuenta sin rol Diseñador, la opción "Asignador (requiere Diseñador)" aparece deshabilitada. Queda en
  texto.
- **B8** → `administrador/16_inhabilitar_con_tickets.jpg` ("tiene 1 ticket activo (ADH-0041)"). Se
  canceló; la cuenta sigue activa.
- **B9** → `administrador/15_usuarios_lista_prueba.jpg` y `administrador/17_bitacora_busqueda_csv.jpg`.
  En la lista se ocultaron solo en pantalla (sin tocar la base) las 13 cuentas con correos personales.

### Diseñador

- **ADH-0036** tomado por Manual Diseñador; se subió `afiche_prueba.png` como versión 1. Está en
  "Finalizado" y el Jefe tiene hasta el 19/10/2026 4:00 p. m. para dictaminar.
- **Prueba Manual Ejemplo Ficticio** no se puede usar para entrar: su contraseña temporal no se guardó y
  su correo `@voae.test` no recibe el enlace de "¿Olvidaste tu contraseña?".

### Siguen pendientes

- **B2** cambio de contraseña del primer ingreso (necesita una cuenta nueva creada por el Administrador).
- **B6** vista móvil (pospuesta).
- **Jefe:** cronómetro HH:MM de un ticket propio, entregables, Pedir corrección, Aprobar y el contador
  5/5. Necesitan un ticket del área en "Finalizado" y horario hábil para dictaminar.

## Tercera sesión (14/10/2026, desde las 7:00 p. m.)

- Entorno: `npm install` no se había corrido con las dependencias nuevas (`docx`, `marked`,
  `puppeteer-core`) — `npm run manuales`/los generadores fallaban con `Cannot find module 'docx'`.
  Se corrió `npm install` (agregó 70 paquetes) y los generadores funcionaron sin tocar su código.
- La extensión **Claude in Chrome no está conectada** en esta sesión (`tabs_context_mcp` devuelve
  "Browser extension is not connected"). No se tomó ninguna captura nueva; todo el trabajo de esta
  sesión fue con las capturas que ya existían de la segunda sesión. Pendiente: reconectar la
  extensión antes de las capturas de Analista y las de mañana (Jefe/Diseñador en horario hábil).
- También es fuera de horario hábil (miércoles 7:00 p. m.), así que tampoco se podían tomar las
  capturas de dictamen aunque Chrome hubiera estado conectado.
- **Manual del Asignador:** escrito completo (`Manual_Usuario_Asignador.md/.docx/.pdf`), con sus 7
  capturas ya existentes. Se renumeraron de nombres descriptivos a `01_…` a `07_…` en el orden en que
  aparecen en el manual (antes: `asignacion_vista_general.jpg`, etc.). Verificado: 0 coincidencias de
  "[Falta la imagen" en el PDF y 7 imágenes incrustadas en el .docx (conteo de `word/media/`).
- **Manual del Diseñador:** escrito con sus 9 capturas ya existentes, también renumeradas `01_…` a
  `09_…`. La sección 6 ("Si el Jefe de Área pide una corrección") quedó solo con texto, sin captura,
  porque subir la versión 2 después de una corrección real necesita el dictamen de mañana — se
  documentó la regla contra el código (`src/data/tickets.ts`, límite de 5 correcciones) sin inventar
  pantallas. Mismo resultado de verificación: 0 "[Falta la imagen", imágenes incrustadas completas.
- **Manual de Jefe de Área:** escrito con sus 8 capturas ya existentes (renumeradas `01_…` a `08_…`).
  La sección 3 ("Dictaminar un ticket") describe el modal de dictamen (Aprobar / Pedir corrección,
  contador "Correcciones usadas: X/5", comentario obligatorio) tomando el texto exacto de
  `src/components/DictamenModal.tsx`, sin capturas — quedan para mañana en horario hábil con un
  ticket real del área esperando dictamen. También incluye, sin captura adicional, cómo enviar una
  solicitud normal remitiendo al manual del Empleado, como pide el prompt.
- Claude in Chrome se reconectó más tarde en la misma sesión. Entorno confirmado por la responsable:
  publicado (`front-ticket.pages.dev`).
- **Cuenta de prueba "Manual Analista" no existía** (a diferencia de los demás roles, el estado del
  trabajo decía "Analista: sin empezar" y no hay rastro de ella en ninguna sesión anterior). Al
  iniciar sesión la responsable entró primero con su propia cuenta real ("Brenda Miralda", rol
  Analista) — se le avisó que ese nombre saldría en cada captura y, a su pedido, se creó una cuenta
  de prueba dedicada en su lugar: **Manual Analista .**, `analista@gmail.com`, Área de Desarrollo
  Humano, rol Analista (mismo patrón de correo que las demás cuentas "Manual …", no `@voae.test` como
  decía el prompt original). Se creó desde la cuenta real `angienam2004` (que ya tenía el rol
  Administrador) porque es la que estaba activa en ese momento; esa cuenta no se usó para ninguna
  captura del manual, solo para este paso de creación. La contraseña temporal se mostró una sola vez
  y la copió la responsable directamente desde su pantalla — no se escribió en ningún archivo ni en
  el chat.
- **Manual del Analista:** escrito completo con 6 capturas nuevas (`capturas/analista/01_…` a
  `06_…`): KPIs y filtros, filtros fijos con la gráfica "Por tipo de solicitud", un filtro de Estado
  aplicado con "Limpiar filtros" activo, la tabla de detalle filtrada por código, el menú Exportar
  (CSV/PDF) y el PDF exportado abierto. Se documentó, confirmado contra `src/lib/permisos.ts` y lo
  visto en pantalla, que el Analista no ve la columna Diseñador ni la gráfica "Carga por diseñador"
  (quedan vacías) porque ese rol no está en la lista de roles que ven la asignación.
  - Para la captura del PDF: exportarlo descarga un archivo al equipo, así que se pidió permiso antes
    (la responsable aprobó). `file://` sigue bloqueado para la extensión, así que se sirvió el PDF
    descargado con un servidor estático local temporal (`npx serve`, puerto 4173, solo mientras duró
    la captura) y se abrió por `http://localhost:4173/…` para poder capturarlo con Chrome. El
    servidor se detuvo apenas se tomó la captura.
  - Verificación: 0 "[Falta la imagen" en el PDF generado.
- **Verificación final de la sesión:** `npm run manuales` corrió de punta a punta sin errores,
  generando los 12 archivos (6 `.docx` + 6 `.pdf`) de una sola vez por primera vez en el proyecto — ya
  no falla con los 6 `.md` completos. Se repitió el conteo de "[Falta la imagen" en los 6 PDFs: 0 en
  todos.

## Cuarta sesión (14/10/2026, misma noche — horario hábil desactivado temporalmente en la base)

La responsable desactivó temporalmente la restricción de horario hábil en la base de datos para
poder completar esta noche las capturas que, en teoría, solo se podían tomar mañana en horario
hábil. Se recargó la página antes de cada captura, como pidió.

- **Las 4 capturas de dictamen** (más 2 adicionales que salieron del mismo flujo), con el ticket
  real `ADH-0036` (id 122):
  1. Jefe de Área: ticket Finalizado con el cronómetro "24:00" corriendo (ya no pausado, al estar el
     horario hábil forzado) → `jefe/09_cronometro_corriendo.jpg`.
  2. Jefe de Área: Adjuntos/Entregables/Progreso del mismo ticket → `jefe/10_entregables_progreso.jpg`.
  3. Jefe de Área: modal "Pedir corrección" con un comentario de ejemplo sobre el logo →
     `jefe/11_pedir_correccion_dialogo.jpg`.
  4. Ticket recargado en "Corrección", contador "Correcciones 1/5" → `jefe/12_correccion_contador_1_5.jpg`.
  5. Diseñador: "Mis tickets" con el ticket en la columna Corrección →
     `disenador/10_mis_tickets_correccion.jpg`.
  6. Diseñador: subió la Versión 2 (por enlace); el detalle recargado muestra Versión 1 + Versión 2
     y una nueva sección **Dictámenes** con el comentario del jefe, y el stepper ya en "Dictamen
     final" (6 pasos en total cuando hay corrección: Enviada → En diseño → Dictamen del jefe →
     Corrección → Dictamen final → Aprobada) → `disenador/11_version2_entregable.jpg`.
  7. Jefe de Área: modal de dictamen con "Aprobar" elegida, "Correcciones usadas: 1/5" →
     `jefe/13_aprobar_dialogo.jpg`.
  8. Ticket recargado, ya "Aprobado" → `jefe/14_aprobado.jpg`.
  - Los manuales de Jefe de Área y Diseñador se actualizaron para usar estas capturas reales en vez
    del texto-sin-imagen que tenían (secciones 3 y 6 respectivamente).
- **B2 (Empleado, primer ingreso):** el Administrador (`Manual Administador .`) creó la cuenta
  **Prueba Primer Ingreso Manual .** (`prueba.primer.ingreso@voae.test`, Área de Desarrollo Humano,
  rol Empleado). La responsable copió la contraseña temporal de su pantalla (no quedó en ningún
  archivo ni en el chat) e inició sesión con ella → se capturó la pantalla "Cambia tu contraseña"
  obligatoria → `empleado/23_cambio_password_primer_ingreso.jpg`. **No se completó** el cambio de
  contraseña (se dejó la cuenta tal cual, a la espera de que se decida si se termina de configurar o
  se descarta, igual que pasó con "Prueba Manual Ejemplo Ficticio" en la segunda sesión).
- **B6 (vista móvil):** a diferencia de intentos anteriores, el modo dispositivo de Chrome DevTools
  (F12 → Ctrl+Shift+M, perfil 390×844) activado manualmente por la responsable **sí funcionó** esta
  vez — la limitación documentada antes era específica de la herramienta `resize_window`, no del
  modo dispositivo en sí. Se capturó "Mis solicitudes" del Empleado en esa resolución (boletos en
  una columna, menú de hamburguesa) → `empleado/24_vista_movil_mis_solicitudes.jpg`.
- Los tres manuales (`Manual_Usuario_Jefe_de_Area.md`, `Manual_Usuario_Disenador.md`,
  `Manual_Usuario_Empleado.md`) y sus `.docx`/`.pdf` se regeneraron con `npm run manuales`: los 12
  archivos se generaron sin errores y 0 "[Falta la imagen" en los 6 PDFs.

## Pendientes para la próxima sesión

- **Reactivar el horario hábil en la base** cuando la responsable confirme que ya no lo necesita
  desactivado (se lo recordamos al cerrar esta sesión).
- Decidir qué hacer con la cuenta **Prueba Primer Ingreso Manual .**: completar su cambio de
  contraseña (perdiendo la posibilidad de volver a mostrar la pantalla de primer ingreso con ella) o
  dejarla así y crear otra cuenta nueva si se necesita repetir esta captura más adelante.
- Revisar visualmente al menos un `.docx` y un `.pdf` de los seis manuales (portada, índice, tablas e
  imágenes) — sigue pendiente por la falta de `poppler-utils` para el visor de Claude Code; la
  verificación hecha hasta ahora es solo automática (conteo de "[Falta la imagen" + imágenes
  incrustadas).
- Decidir si la cuenta real `angienam2004` debe seguir teniendo el rol Administrador o si conviene
  usar siempre `Manual Administador .` (`admin@gmail.com`) para evitar mezclar cuentas reales y de
  prueba en tareas administrativas futuras.
- Con esto, **las 6 secciones de captura pendientes del documento de estado original (B1–B9 más los
  4 de dictamen) quedan completas.** Falta solo la verificación visual manual de los documentos
  generados (punto anterior) antes de dar el trabajo por cerrado.

---

# Versión 2.0 (26/10/2026) — manuales rehechos, solo PDF

## Cómo se hizo

- **Entorno:** https://front-ticket.pages.dev. Antes de empezar se confirmó que el bundle publicado
  (`assets/index-BHsOAPbl.js`) contiene los textos nuevos del último push (`d616c68`, "Correcciones de
  los 18 errores"), así que producción estaba al día.
- **Capturas:** Puppeteer (`puppeteer-core` + Chrome local), un contexto aislado por usuario, ventana
  de 1440 × 900 (390 × 844 en móvil). Script: `scripts/manuales/capturas.mjs` + guiones por rol en
  `scripts/manuales/guiones.mjs`. Las contraseñas se pasaron solo como variables de entorno
  (`MANUALES_PASS`, `MANUALES_PASS_NUEVO`); no están en ningún archivo, log ni captura.
- **PDF:** `npm run manuales` genera ahora solo los 7 PDF (versión 2.0). Los `.docx` y las capturas
  de la versión 1.0 se movieron a `docs/manuales/v1/`.
- **Ajuste a `md2pdf.mjs`:** las imágenes tienen ahora una altura máxima de 88 mm (antes ocupaban
  el ancho completo y una sola captura alta llenaba una página). Sin ese ajuste, el manual del
  Empleado tenía 39 páginas.
- **Verificación:** sin poppler en esta máquina, se agregó `scripts/manuales/revisar-pdf.mjs`, que
  usa pdf.js para contar páginas, buscar "[Falta la imagen" y dibujar hojas de miniaturas. Se
  revisaron a ojo la portada, el índice, las tablas y las imágenes de los 7 PDF.
- **Horario:** la sesión fue en horario hábil (la base respondió `true` a `fnEsHorarioHabilEscalar`).

## Privacidad: datos reales que aparecen en la app y se difuminaron

1. **El afiche de AOAA-0019** ("Demo charla sobre manejo de estre") no es un afiche: es la captura
   de un documento con un **nombre, un número de cuenta y una firma**. Se difumina en todas las
   capturas donde aparece (bandeja del Validador). **Recomendación:** reemplazar ese archivo por un
   afiche de ejemplo.
2. **La cuenta real `angienam2004`** (correo personal de Gmail, con todos los roles) aparece mezclada
   con las de demostración en: la lista de **Usuarios**, la columna **Creado por** de Tipos de
   solicitud, **Realizado por** en la Bitácora de roles y una **pestaña de Asignación**. Se difumina
   en todas las capturas. Como tiene los roles Jefe de Área, Asignador y Validador, probablemente
   recibe las notificaciones de los tickets `[DEMO]`.

## Calidad de los datos de demostración

3. Los afiches de **AOAA-0020** son capturas de errores de código, no afiches. Se usaron igual
   (no tienen datos personales) para mostrar el historial de intentos.
4. El tipo **"Izamiento de la bandera nacional"** tiene como descripción
   `ijsdnnvsonfseoinfwersoinfsweriof`, que se ve en la pantalla **Nueva solicitud** (capturas
   `empleado/02` y `jefe/09`). Conviene corregirla desde Catálogos y volver a correr
   `node scripts/manuales/capturas.mjs empleado 02` y `... jefe 09`.

## Diferencias entre la app y las reglas (no se "corrigieron" en el manual)

5. **Buscador del historial del Jefe:** en producción el texto de ayuda todavía dice
   "Código, tipo, **diseñador**, solicitante, estado". El código local ya lo corrige
   (`src/pages/jefe/Dashboard.tsx`, sin commit ni publicar). En las capturas del jefe se escribe una
   búsqueda para que no aparezca.
6. **Textos que nombran roles** (contra la regla "textos sin roles internos"):
   - Progreso de un ticket enviado: "Esperando que **un diseñador** la tome".
   - Progreso en Corrección: "**El diseñador** aplica los cambios pedidos".
   - Cronómetro: "Si **el jefe de área** no dictamina antes del…".
   - Crear tipo: "El equipo de diseño toma la solicitud, entrega y **el Jefe de Área** dictamina."
7. **"Asignar a…"** (pantalla Asignación) asigna **al instante, sin confirmación**. El prompt pedía
   "Asignar a… (cancelar)", pero no hay nada que cancelar: la captura muestra solo el control y el
   manual advierte que no pide confirmación. "Reasignar a…" sí pide confirmación.
8. **Ventana "Inhabilitar usuario"**: dice "Sus tickets finalizados esperando dictamen se quedan
   **con ella**" aunque la cuenta sea de un hombre (pedro diseñador demo).
9. **Crear usuario:** el campo se llama **"Área"**, no "Área o coordinación" como dice la regla
   (aunque la lista sí incluye las coordinaciones).
10. **Categorías:** la app dice **"Protocolo"** (singular); la regla dice "Protocolos". El manual usa
    el texto de la app.
11. **Analista:** la vista tiene el filtro **Diseñador**, la columna **Diseñador** y la gráfica
    **Carga por diseñador**, pero este rol los recibe vacíos ("—" y "Sin datos para este filtro").
    El manual lo explica; quizá convenga ocultarlos para este rol.
12. **Editor de un campo:** el título de la ventana sigue diciendo `Campos de "Trifolio"` en lugar de
    algo como "Nuevo campo".
13. **Bitácora de roles:** la columna **Usuario** muestra solo el primer nombre ("nuevo", "luis"),
    lo que puede ser ambiguo si dos personas se llaman igual.
14. **Cuenta del Asignador demo:** el prompt la indica sin área ("—"), pero en la app pertenece al
    **Área de Salud**.

## Capturas pendientes

| Captura | Por qué falta | Cómo completarla |
|---|---|---|
| Aviso de **fuera de horario** al enviar una solicitud, y el botón **Dictaminar** bloqueado | La sesión fue en horario hábil. | Después de las 4:00 p. m.: `node scripts/manuales/capturas.mjs …` con un paso nuevo (no hay que crear datos). El manual ya explica la regla con texto. |

## Tickets `[DEMO]` nuevos creados en esta sesión

| Código | Id | Tipo | Estado |
|---|---|---|---|
| AOAA-0022 | 23 | Grabación y edición de videos, spots o cortinas institucionales | Enviado |
| AOAA-0023 | 24 | Aprobación de afiches con IA (afiche de ejemplo generado, sin datos personales) | **Corrección**: intento 1 rechazado por la Validadora demo (autorizado) |

Ningún ticket `[DEMO]` existente cambió de estado: todos los diálogos (Dictaminar, Aceptar,
Rechazar, Pedir corrección, Reasignar, Inhabilitar, Crear usuario, Crear tipo, Crear feriado,
Agregar campo) se abrieron, se llenaron, se capturaron y se cancelaron.

## Resultado

| Manual | Páginas | Capturas |
|---|---|---|
| Empleado | 25 | 36 |
| Jefe de Área | 18 | 22 |
| Diseñador | 13 | 14 |
| Asignador | 12 | 12 |
| Validador | 12 | 14 |
| Analista | 13 | 14 |
| Administrador | 19 | 20 |

0 "[Falta la imagen" en los 7 PDF.

## Acciones autorizadas después de la primera entrega (26/10/2026)

La responsable autorizó las dos acciones irreversibles que estaban pendientes. Se hicieron con
`MANUALES_ACCIONES=1 node scripts/manuales/capturas.mjs acciones`:

- **Cuenta nueva `temporal.demo@voae.test`** ("Prueba Contraseña Temporal Demo", Área de Orientación
  y Asesoría Académica, rol Empleado), creada desde Usuarios por el admin demo. La contraseña
  temporal se difuminó antes de capturarla (`administrador/04_contrasena_temporal.png`) y no se
  imprimió ni se guardó: **nadie la conoce**. Si se quiere usar la cuenta, hay que restablecer su
  contraseña; si no, se puede inhabilitar.
- **AOAA-0023 rechazado** por la Validadora demo (intento 1, comentario "La fecha del evento no
  coincide con la solicitud…"). Quedó en **Corrección** para capturar el botón y la ventana
  **Reenviar afiche** (`empleado/23` y `24`). El reenvío se canceló: el ticket sigue en Corrección.

Con esto solo queda pendiente la captura del **aviso de fuera de horario** (y el botón Dictaminar
bloqueado), que se toma después de las 4:00 p. m.

Las capturas se renumeraron para seguir el orden de los manuales (Empleado 01–30, Administrador
01–18, comunes 01–06).
