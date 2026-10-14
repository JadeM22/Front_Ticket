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
