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
