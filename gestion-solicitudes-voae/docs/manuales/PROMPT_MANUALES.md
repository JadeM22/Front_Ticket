# Tarea: completar los manuales de usuario de iTickets (uno por rol), con capturas reales tomadas en Chrome

Eres un redactor técnico y desarrollador senior trabajando en este repositorio: **iTickets**, React + Vite + TypeScript + Tailwind + Supabase, publicado en https://front-ticket.pages.dev. El objetivo final son **6 manuales de usuario**, uno por rol, en **Markdown, Word (.docx) y PDF**, con **capturas reales** de la aplicación tomadas con Chrome.

**Esto es una continuación.** Parte del trabajo ya está hecho (ver sección 0). No rehagas lo que ya existe: complétalo.

## 0. Estado actual (al 14 de octubre de 2026)

### 0.1 Lo que ya existe

- `Manual_Usuario_Empleado.md/.docx/.pdf`: completo, con 18 capturas en `capturas/empleado/`.
- `Manual_Usuario_Administrador.md/.docx/.pdf`: completo, con 14 capturas en `capturas/administrador/`.
- `scripts/manuales/md2docx.cjs`, `md2pdf.mjs` y `generar-todos.mjs`, más el script `"manuales"` en `package.json`. Las dependencias (`docx`, `marked`, `puppeteer-core`) ya están instaladas.
- `OBSERVACIONES.md` ya tiene notas de la primera sesión. **Agrega las nuevas notas, no borres las que ya están.**
- Las capturas existentes están en `.jpg` o `.png`, según lo que devolvió la herramienta. Los generadores aceptan los dos formatos. **No las conviertas.** Las capturas nuevas pueden guardarse en el formato que salga.

### 0.2 Lo que falta

**A. Manuales nuevos** (desde cero, siguiendo las secciones 2 a 4):

1. `Manual_Usuario_Jefe_de_Area`
2. `Manual_Usuario_Disenador`
3. `Manual_Usuario_Asignador`
4. `Manual_Usuario_Analista`

**B. Capturas pendientes en los manuales que ya existen:**

| # | Manual | Captura | Cómo resolverla |
|---|---|---|---|
| B1 | Empleado | Inicio de sesión con el boleto iTickets (sección 2.1, hoy sin imagen) | Captúrala antes de que yo inicie sesión. |
| B2 | Empleado | Cambio de contraseña del primer ingreso (sección 2.2, hoy sin imagen) | Necesita una cuenta de prueba nueva, con contraseña temporal. La crea el Administrador desde la app. Pídemela. |
| B3 | Empleado | Menú lateral **desplegado** (hoy solo está el plegado) | Captura directa. |
| B4 | Empleado | Filtros de "Mis solicitudes" (hoy solo hay boletos y búsqueda) | Captura directa. |
| B5 | Empleado | **Aviso de fuera de horario** | Solo se puede capturar fuera del horario hábil: lunes a viernes después de las 4:00 p. m. o antes de las 8:00 a. m. (hora de Honduras), fines de semana o feriados. Llega hasta "Revisar y enviar" **sin pulsar Enviar** si el aviso ya aparece antes. Si sigue siendo horario hábil, deja el marcador de la sección 3.3 y sigue. |
| B6 | Empleado | **Vista móvil** de "Mis solicitudes" | En esta máquina `resize_window` no cambia el tamaño real de la ventana (siempre queda en 1536×816). **Pídeme** que active el modo dispositivo de Chrome (F12 y luego Ctrl+Shift+M, perfil 390 × 844) y después captura. |
| B7 | Administrador | Selector **"+ rol"** abierto, con "Asignador (requiere Diseñador)" en gris | Los `<select>` nativos se cierran entre capturas. Opción 1: **pídeme** que lo deje abierto y captura. Opción 2: lee las opciones con `read_page` y documenta la regla solo con texto. **No** modifiques el DOM para fingir la captura. |
| B8 | Administrador | Modal **"Inhabilitar usuario" con tickets activos** (lista de códigos y aviso al Asignador o a los solicitantes) | Necesita esta cadena de datos de prueba, creada **solo desde la app**: Empleado de prueba envía una solicitud → Diseñador de prueba la toma → Administrador abre el modal. **Pregúntame antes**: desactivar es una acción con efectos, y los tickets de prueba pueden notificar a cuentas reales. Captura el modal y **cancélalo**, salvo que yo diga lo contrario. Puede aprovechar los datos que se creen para los manuales de Diseñador y Asignador. |
| B9 | Administrador | Lista de usuarios con ⚠️ · Bitácoras: búsqueda y exportación a CSV | La lista de usuarios muestra datos reales. **Avísame antes**. Filtra para que solo se vean cuentas de prueba, o recorta. |

**C. Verificación pendiente:** los `.docx` y `.pdf` no se revisaron página por página: `file://` está bloqueado en la extensión y en esta máquina no está `poppler-utils`. Busca otra forma (sección 5).

### 0.3 Lo que NO se debe usar

- `docs/semilla_datos_prueba.sql` existe sin agregar a git, pero **no lo ejecutes**: es SQL y está fuera de las reglas de esta tarea. Los datos de prueba se crean desde la app.

## Reglas obligatorias

- **NO modifiques el código de la aplicación ni la base de datos.** No ejecutes SQL ni uses la llave `service_role`/secret. Solo crea archivos dentro de `docs/manuales/` y `scripts/manuales/`, y agrega dependencias de desarrollo para generar los documentos.
- **Contraseñas:** nunca escribas contraseñas en archivos, en el chat ni en commits. **Yo inicio sesión** cuando me lo pidas (ver sección 3).
- **Datos de prueba:** usa solo cuentas y tickets de prueba (nombre "(semilla)", "Prueba Manual…", correo `@voae.test`). La app publicada tiene **datos reales mezclados** con los de prueba, sobre todo en Usuarios y Bitácora. Si una pantalla muestra datos reales de personas, avísame antes de capturarla.
- **Fuente de verdad de la interfaz:** los textos, botones, menús y rutas los tomas **del código y de la app real**: lee `src/` y navega. No inventes nombres de pantallas ni de botones.
- **Fuente de verdad de las reglas:** la sección 2 de este documento y `docs/cambios/*.sql`.
- **Estilo de redacción:** español claro, de **tú**, frases cortas y orientadas a tareas ("Para enviar una solicitud: 1… 2… 3…"). Sin jerga técnica: nada de RLS, triggers, RPC ni nombres de tablas. Imita el tono de los dos manuales que ya están hechos.

---

## 1. Entregables

```
docs/manuales/
  capturas/<rol>/NN_descripcion.(png|jpg)   ← capturas reales
  Manual_Usuario_Empleado.md   .docx   .pdf        (existe: completar B1 a B6)
  Manual_Usuario_Jefe_de_Area.md   .docx   .pdf    (nuevo)
  Manual_Usuario_Disenador.md   .docx   .pdf       (nuevo)
  Manual_Usuario_Asignador.md   .docx   .pdf       (nuevo)
  Manual_Usuario_Analista.md   .docx   .pdf        (nuevo)
  Manual_Usuario_Administrador.md   .docx   .pdf   (existe: completar B7 a B9)
  OBSERVACIONES.md                                 (existe: agregar notas)
scripts/manuales/
  md2docx.cjs  md2pdf.mjs  generar-todos.mjs       (existen)
```

Carpetas de capturas nuevas: `capturas/jefe/`, `capturas/disenador/`, `capturas/asignador/`, `capturas/analista/`.

**Generadores de documentos:** no los reescribas. Si necesitas un ajuste menor, explícamelo antes. `npm run manuales` genera los 12 archivos (6 `.docx` y 6 `.pdf`). Hoy falla en los 4 roles que todavía no tienen `.md`. Mientras tanto, genera un manual a la vez:

```bash
node scripts/manuales/md2docx.cjs docs/manuales/Manual_Usuario_Empleado.md docs/manuales/Manual_Usuario_Empleado.docx "Manual de Usuario" "Rol: Empleado" "1.0" "14 de octubre de 2026"
node scripts/manuales/md2pdf.mjs  docs/manuales/Manual_Usuario_Empleado.md docs/manuales/Manual_Usuario_Empleado.pdf  "Manual de Usuario" "Rol: Empleado" "1.0" "14 de octubre de 2026"
```

**Markdown que entienden los generadores** (no uses otra sintaxis):

- `#`, `##` y `###` para títulos.
- Párrafos, `**negrita**`, `*cursiva*` y `` `código` ``.
- Listas con `- ` y listas numeradas con `1. `.
- Tablas con `|`.
- Notas destacadas con `> ` (una línea cada una).
- Imágenes, solas en su línea: `![Pie de la captura](capturas/empleado/03_nueva_solicitud.png)`.

## 2. Reglas del sistema que los manuales deben explicar

| Tema | Regla |
|---|---|
| **Horario hábil** | Lunes a viernes, de 8:00 a. m. a 4:00 p. m. (hora de Honduras), sin feriados. Empleados y Jefes **solo envían solicitudes en horario hábil**. Los Jefes **solo dictaminan en horario hábil**, salvo las excepcionales. Diseñadores y Asignador trabajan a cualquier hora. El Administrador, siempre. |
| **Código del ticket** | Por área: **ADH-0001** (Área de Desarrollo Humano), **AOAA-0001** (Área de Orientación y Asesoría Académica), **ADS-0001** (Área de Salud) |
| **Tiempos** | Cada tipo de solicitud tiene sus días hábiles de producción (mínimo 10; Campaña publicitaria, 30) |
| **Fecha del evento** | Obligatoria en todos los formularios. El calendario **bloquea** los días de producción: por ejemplo, un Afiche enviado el lunes 12/10 permite eventos desde el 27/10. Los feriados alargan el plazo. |
| **Adjuntos** | El solicitante puede adjuntar archivos o enlaces (logos, imágenes, documentos), hasta 10 por solicitud |
| **Estados** | Enviado → En proceso → Finalizado (diseño entregado, esperando dictamen) → Aprobado. También: Corrección, Retrasado (pasó la fecha límite), Rechazado (excepcional rechazada) y Aprobado (Automático). |
| **Dictamen** | El Jefe de Área aprueba o pide corrección (con comentario), dentro de **24 horas hábiles** desde la entrega. Si no dictamina, se aprueba solo. Hay un cronómetro "HH:MM" que se pausa fuera de horario. |
| **Correcciones** | Máximo **5** por ticket (contador "2/5"). Después de la quinta, solo se puede aprobar. |
| **Lo que ve el Empleado** | Solo el **estado** de su solicitud: no ve entregables, comentarios del jefe, contador de correcciones ni quién la tiene asignada |
| **Solicitud excepcional** | La envía el **Jefe de Área**, a cualquier hora y día, con al menos **2 días hábiles** de anticipación. Solo el **Asignador** la acepta (y decide quién la trabaja) o la rechaza (con motivo). Si nadie responde antes de la fecha del evento, se **rechaza automáticamente**. |
| **Diseñador** | "Mi tablero" tiene dos pestañas: **Tickets sin asignación** (en orden de llegada, con botón **Tomar**) y **Mis tickets** (En proceso, Corrección, Retrasados, Finalizados esperando dictamen). Ve solo los sin asignar y los suyos. Los entregables se suben **desde el detalle** del ticket. |
| **Etiquetas** | **Asignado**: el Asignador se lo dio. **Excepcional**: urgente. **Liberado**: volvió a la cola porque su diseñador fue desactivado. |
| **Asignador** | Es un diseñador con permisos extra. Ve todos los tickets. En **Asignación**: excepcionales pendientes, galería "Sin asignar" (orden de llegada) y una pestaña por diseñador. Puede asignar, reasignar, tomar y subir entregables. |
| **Analista** | Estadísticas con filtros (fijos al hacer scroll), "Limpiar filtros", búsqueda por código y exportación a PDF y CSV. También puede enviar solicitudes. |
| **Administrador** | Usuarios (nombre y dos apellidos obligatorios; la contraseña temporal se muestra una sola vez; el rol Asignador requiere el rol Diseñador). También: tipos de solicitud, feriados, Bitácoras (pestañas Roles, Feriados y Asignaciones), Estadísticas. Al desactivar a un diseñador, sus tickets activos vuelven a "Sin asignar". |
| **Primer ingreso** | Con la contraseña temporal, el sistema obliga a cambiarla |
| **Notificaciones** | La campana avisa en tiempo real: asignaciones, entregas, correcciones, aprobaciones, retrasos y excepcionales |

Si encuentras en la app algo que contradice esta tabla, **anótalo** en `docs/manuales/OBSERVACIONES.md` y **avísame**. No lo "corrijas" en el manual.

## 3. Capturas con Chrome

### 3.1 Conexión

- Usa la integración de Claude Code con **Chrome** (extensión Claude in Chrome). Verifica la conexión antes de empezar: deben estar disponibles las herramientas `mcp__claude-in-chrome__*`, o `/chrome` debe decir *Status: Enabled* y *Extension: Installed*. Si no está conectada, **detente y avísame**.
- Trabaja en la versión publicada, https://front-ticket.pages.dev, o en `npm run dev` (http://localhost:5173) si te lo indico. Antes de empezar, pregúntame cuál usar.
- Limitaciones conocidas de esta máquina: `resize_window` no cambia el tamaño real de la ventana, `file://` está bloqueado y los `<select>` nativos abiertos no se mantienen entre capturas.

### 3.2 Sesiones por rol

Trabaja **un rol a la vez**, en este orden:

1. **Empleado**: solo las capturas pendientes B1 a B6.
2. **Jefe de Área**: manual nuevo.
3. **Diseñador**: manual nuevo.
4. **Asignador**: manual nuevo.
5. **Analista**: manual nuevo.
6. **Administrador**: solo las capturas pendientes B7 a B9.

Si un flujo necesita datos de otro rol (por ejemplo, un ticket en Corrección para el Diseñador o una excepcional pendiente para el Asignador), dime qué cadena de pasos hace falta y crea los datos en el rol que corresponda, desde la app.

Para cada rol:

1. Abre una pestaña nueva en la página de inicio de sesión y **pídeme** que inicie sesión con la cuenta de prueba de ese rol. **Espera mi confirmación.** No escribas tú las credenciales.
2. Recorre las pantallas del rol y toma las capturas de la lista 3.4.
3. Al terminar, cierra la sesión desde la app y pasa al siguiente rol.

### 3.3 Cómo tomar las capturas

- **Ventana:** 1440 × 900 si se puede. Si no se puede, usa el tamaño real (1536×816) y anótalo. Para las capturas de móvil, **390 × 844** en el modo dispositivo que yo active (B6).
- **Antes de capturar:** espera a que la pantalla termine de cargar (sin esqueletos ni spinners) y cierra los toasts que estorben, salvo que el toast sea lo que quieres mostrar.
- **Guardado:** guarda cada captura en disco y **muévela** a `docs/manuales/capturas/<rol>/NN_descripcion.(png|jpg)`, con numeración de dos dígitos. En los manuales que ya existen, **sigue la numeración** (Empleado desde `19_`, Administrador desde `15_`) y no renombres las capturas que ya están.
- **Flujos con pasos:** captura el **antes** y el **después** (por ejemplo, el formulario lleno y el toast "Solicitud ADH-0003 enviada").
- **Datos:** si para una captura hace falta un dato de prueba (un ticket en Corrección, una excepcional pendiente…), créalo **usando la app** con el rol que corresponde, o pídemelo. No uses SQL.
- **Ventanas de confirmación:** no actives diálogos nativos del navegador (`alert`/`confirm`). Los modales de la app sí se pueden capturar. Si una acción no se puede deshacer (desactivar un usuario, rechazar una excepcional, aprobar, pedir corrección), **pregúntame antes**.
- **Fuera de horario:** si es horario hábil, no podrás capturar el aviso de "fuera de horario" ni el bloqueo de dictamen del Jefe. Deja `![Pendiente: aviso fuera de horario](capturas/<rol>/XX_fuera_horario.png)`, anótalo en `OBSERVACIONES.md` y sigue. **Antes de generar los `.docx`/`.pdf` finales, quita los marcadores de las capturas que sigan pendientes** (queda solo la regla en texto), para que no salga "[Falta la imagen…]".

### 3.4 Capturas mínimas por rol

| Rol | Capturas |
|---|---|
| **Todos** (en el manual del Empleado; los demás lo referencian) | Inicio de sesión (con el boleto iTickets) **[B1]** · cambio de contraseña del primer ingreso **[B2]** · sidebar desplegado **[B3]** y plegado ✅ · campana de notificaciones ✅ |
| **Empleado** | Resumen ✅ · Nueva solicitud: elegir tipo ✅ · calendario con días bloqueados ✅ · los 5 formularios ✅ · adjuntos ✅ · revisar y enviar ✅ · toast con el código ✅ · Mis solicitudes: boletos ✅, búsqueda con lupa ✅, filtros **[B4]** · detalle del ticket ✅ · aviso de fuera de horario **[B5]** · vista móvil de Mis solicitudes **[B6]** |
| **Jefe de Área** | Por dictaminar · detalle con cronómetro HH:MM · entregables · Pedir corrección (comentario) · contador 5/5 con el botón deshabilitado · Aprobar · Historial con búsqueda y exportación · Solicitud excepcional (aviso y calendario de 2 días hábiles) · Mis solicitudes excepcionales (pendiente, aceptada y rechazada con motivo) · envío de solicitud normal (puede referenciar las capturas del Empleado) |
| **Diseñador** | Mi tablero: pestaña "Tickets sin asignación" (orden y botón Tomar) · pestaña "Mis tickets" con sus columnas · badge del sidebar · etiquetas Asignado, Excepcional y Liberado · detalle y subir entregable (archivo y enlace) · ticket en Corrección y nueva versión · excepcional "esperando al Asignador" |
| **Asignador** | Asignación: Excepcionales pendientes · Aceptar (elegir diseñador) · Rechazar (motivo) · galería "Sin asignar" con #1, #2… · Asignar a… · pestaña de un diseñador · Reasignar con confirmación · notificación de diseñador desactivado |
| **Analista** | Estadísticas: KPIs · filtros fijos · Limpiar filtros · gráficas (por tipo en horizontal) · tabla con búsqueda por código · exportar PDF y CSV (una captura del PDF abierto). El Administrador ya tiene capturas de Estadísticas (`11_` y `12_`): puedes reutilizarlas si se ven iguales para el Analista. |
| **Administrador** | Crear usuario ✅ · contraseña temporal ✅ · Tipos de solicitud ✅ · Feriados ✅ · Bitácoras: 3 pestañas ✅ · Estadísticas ✅ · inhabilitar/reactivar sin tickets ✅ · lista con ⚠️ **[B9]** · selector "+ rol" con la regla del Asignador **[B7]** · desactivar diseñador con tickets **[B8]** · búsqueda y CSV de Bitácoras **[B9]** |

✅ = ya está hecho. **[Bn]** = pendiente de la sección 0.2.

**Datos personales:** antes de guardar cada captura, revisa que no se vean contraseñas temporales reales ni correos personales que no sean de prueba. Si aparecen, vuelve a tomar la captura con datos de prueba, o pídeme que los cambie. En Bitácora, usa el filtro **Realizado por** con la cuenta de prueba, como ya se hizo.

## 4. Estructura de cada manual

Los manuales nuevos deben seguir la misma estructura que `Manual_Usuario_Empleado.md` y `Manual_Usuario_Administrador.md`:

```markdown
# 1. Introducción
(qué es iTickets, para qué sirve este manual, qué puede hacer este rol)

# 2. Acceso al sistema
## 2.1 Iniciar sesión
## 2.2 Primer ingreso y cambio de contraseña
## 2.3 Conoce la pantalla (sidebar, notificaciones, cerrar sesión)

# 3. … una sección por tarea del rol, en el orden en que se hace el trabajo
## 3.1 Nombre de la tarea
(párrafo corto: para qué sirve)
1. Paso…
2. Paso…
![Pie descriptivo](capturas/rol/NN_x.png)
> Importante: regla o aviso relevante.

# N-2. Reglas importantes
(tabla con las reglas del rol: horario, plazos, límites)

# N-1. Preguntas frecuentes y problemas comunes
| Situación | Qué hacer |
(usa los mensajes de error reales de la app; por ejemplo "Para "Afiche" se necesitan 10 días hábiles…")

# N. Glosario
```

- **Extensión:** de 8 a 25 páginas por manual. El del Administrador puede ser más largo.
- **Al menos una captura por tarea**, con un pie que diga qué se ve.
- **Cada manual es independiente:** repite lo básico (acceso y pantalla) en todos. El texto de acceso puede ser el mismo en los seis. Copia la sección 2 del manual del Empleado, con las capturas B1 a B3 cuando estén listas.
- **Manual del Asignador:** explica primero que el Asignador también es Diseñador y remite a las tareas del Diseñador, pero repítelas brevemente.
- **Manual del Jefe de Área:** incluye también cómo enviar solicitudes normales, igual que el Empleado.
- **Manual del Analista:** incluye también cómo enviar solicitudes y ver "Mis solicitudes", porque comparte esas pantallas con el Empleado.

## 5. Al terminar

1. **Genera los 12 archivos** con `npm run manuales`.
2. **Verifícalos.** `file://` está bloqueado en la extensión, así que usa una de estas opciones:
   - sirve la carpeta con `npx serve docs/manuales` (o `python -m http.server`) y abre el PDF por `http://localhost` en Chrome;
   - instala `poppler` para leer las páginas con el visor de Claude Code;
   - pídeme que abra yo un `.docx` y un `.pdf` y te confirme portada, índice, tablas e imágenes.

   Como mínimo, busca el texto "[Falta la imagen" en los archivos generados y cuenta las imágenes incrustadas frente a las referencias del `.md`.
3. **No hagas commit** de credenciales ni de archivos temporales (`.*.tmp.html`).
4. **Actualiza `OBSERVACIONES.md`:** marca como resueltos los pendientes B1 a B9 que se completaron y agrega los nuevos hallazgos.
5. **Entrégame un resumen:**
   - las páginas aproximadas de cada manual;
   - la cantidad de capturas por rol (las nuevas y el total);
   - las capturas que siguen pendientes y por qué;
   - el contenido de `OBSERVACIONES.md`, con las diferencias entre la app y las reglas.
