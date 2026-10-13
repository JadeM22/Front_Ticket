# Tarea: frontend v3.1. Códigos por área, fecha del evento, horario hábil, solicitudes excepcionales, Asignador, 5 correcciones y mejoras de UI

> **Versión 3.1 (13 de octubre).** Las secciones marcadas con **🆕** cambiaron respecto a la v3. Si ya implementaste la v3, aplica **solo** las secciones 🆕 y la sección 5 ("Resumen de cambios v3.1").

Eres un desarrollador frontend senior en este repositorio: **React + Vite + TypeScript + Tailwind v4 + Supabase**, desplegado en Cloudflare Pages. La base de datos de Supabase **ya fue actualizada**. Tu trabajo es ajustar el frontend a esos cambios e implementar las mejoras de interfaz que se describen abajo.

## Antes de escribir código

1. Lee completos `docs/cambios/cambios_bd_2026-10-12.sql` (Partes 1 a 12) y 🆕 `docs/cambios/cambios_bd_2026-10-13.sql` (Partes 13 a 19). Son la **fuente de verdad**: funciones, columnas, vista y políticas RLS. Si una función aparece en ambos, vale la del 13 de octubre.
2. Lee `src/types/database.ts`. **Ya está regenerado** con la base nueva. Si TypeScript marca errores en código existente (por ejemplo, porque usa `FormularioArte.fecha`, que ya no existe), corrígelos.
3. Revisa el código actual: `AuthContext`, rutas, layout y sidebar, dashboards por rol, tablero (kanban), detalle de ticket, formularios de nueva solicitud, administración de usuarios y Estadísticas.
4. Presenta un **plan corto** (archivos a crear, modificar y borrar) y después impleméntalo completo.

## Reglas obligatorias

- **NO modifiques la base de datos.** No crees migraciones, no ejecutes SQL y no uses la llave `service_role`/secret. Solo existe la llave publicable en `.env.local`. Si crees que falta algo en la base, **detente y avísame**.
- Las tablas no están en `public`: usa `.schema('Solicitudes')` o `.schema('Seguridad')`.
- La seguridad la pone la base (RLS y triggers). El frontend decide qué mostrar y anticipa las reglas para dar buena experiencia, pero **siempre** muestra el `error.message` de Supabase en un toast. Los mensajes vienen en español y explican la regla.
- Fechas en español y en zona `America/Tegucigalpa`. Formato: `dd/MM/yyyy` y `dd/MM/yyyy h:mm a`.
- Mantén el diseño actual: azul institucional, verde menta, tipografías y componentes existentes.
- Al terminar, `npm run build` y `npm run lint` deben pasar sin errores.

---

## 1. Qué cambió en la base (resumen para el frontend)

### 1.1 Áreas y código de ticket

- `Seguridad.Areas` tiene `prefijo` y nombres nuevos: **Área de Desarrollo Humano (ADH)**, **Área de Orientación y Asesoría Académica (AOAA)** y **Área de Salud (ADS)**. No escribas nombres de áreas en el código: léelos de la tabla.
- `Solicitudes.Ticket.codigo` (texto, único), por ejemplo `ADH0001`. **Lo genera la base.** En toda la app, el ticket se identifica por `codigo`, no por `#id`: tarjetas, detalle, notificaciones, tablas y títulos. El `id` numérico sigue usándose internamente para rutas y consultas.

### 1.2 Vista principal: `Solicitudes.vw_TicketsEstadoReal`

Úsala para **todo listado** (tableros, "Mis solicitudes", Asignador). Columnas:

| Columna | Uso |
|---|---|
| `ticket_id`, `codigo` | Identificación |
| `tipo_solicitud_id`, `tipo_solicitud`, `formulario` | Tipo |
| `area_id`, `area` | Área |
| `usuario_registro`, `solicitante` | Solicitante (**nombre completo ya resuelto**) |
| `disenador_id`, `disenador` | Diseñador (**nombre completo ya resuelto**; `null` = "Sin asignar") |
| `estado_registrado`, `estado_real` | Usa **`estado_real`** para mostrar: incluye "Retrasado" y "Aprobado (Automático)" |
| `fecha_evento` (date) | Fecha del evento |
| `fecha_registro` | **Fecha de creación** |
| `fecha_limite` | Fecha límite de entrega del diseño |
| `fecha_entrega_diseno` | Cuándo entregó el diseñador |
| `fecha_aprobacion_automatica` | Cuándo se aprueba sola si el jefe no dictamina |
| `minutos_habiles_restantes_dictamen` (int, null si no aplica) | **Cronómetro del jefe** |
| `fuera_de_plazo` | bool |
| `correcciones_usadas`, `correcciones_maximas` (5) | Contador **"2/5"** |
| `aprobado_automatico` | bool |
| `es_excepcional`, `excepcional_estado` (`'PENDIENTE' \| 'ACEPTADA' \| 'RECHAZADA' \| null`), `excepcional_motivo_rechazo` | Solicitud excepcional |

**Error actual que hay que corregir:** el empleado veía "Sin asignar" aunque el ticket tuviera diseñador, porque el nombre se buscaba en `Seguridad.Usuarios` y el rol Empleado no puede leer esa tabla. **Muestra siempre `disenador` y `solicitante` de la vista.** Para otros nombres, por ejemplo los autores del historial, usa `Seguridad.fnUsuariosNombresTabla()`, que ahora devuelve el nombre completo.

### 1.3 Tipos de solicitud

- Todos tienen **mínimo 10 días hábiles** (`dias_estimados >= 10`), y Campaña publicitaria tiene 30. La base rechaza valores menores: en Administración → Tipos de solicitud, pon `min=10` en el campo de días y el texto de ayuda *"Mínimo 10 días hábiles"*.
- "Promocionales" ahora es **"Promociones (licitaciones)"**. **Trifolio** fue eliminado o desactivado. Lista solo los tipos con `estado = true`.

### 1.4 Fecha del evento (obligatoria en TODOS los formularios)

- Nueva columna `Solicitudes.Formularios.fecha_evento` (date, NOT NULL).
- **Se eliminaron** `FormularioArte.fecha`, `FormularioProtocolo.fecha` y `FormularioGenerico.fecha_requerida`. **Quita del código todo campo "Fecha (opcional)" o "Fecha requerida"** de esos formularios.
- **VIDEO** conserva `fecha_entrega_publicacion` y **DIRCOM** conserva `fecha_necesaria`, además de la nueva fecha del evento.
- 🆕 Fecha mínima permitida para el evento (normal **y** excepcional):

```ts
const { data: minimo } = await supabase.schema('Solicitudes')
  .rpc('fnFechaEventoMinimaEscalar', {
    p_tipo_solicitud_id: tipo.id,
    p_excepcional: esExcepcional,   // false = días hábiles del tipo; true = 2 días hábiles
  }) // 'YYYY-MM-DD' = primer día permitido
```

  - Afiche (10 días hábiles) enviado el lunes 12/10/2026 → producción del 13/10 al 26/10 → `minimo` = **27/10/2026** (el "día hábil 11").
  - Excepcional enviada el sábado 17/10 → producción lunes 19 y martes 20 → `minimo` = **miércoles 21/10**.
  - Ya considera fines de semana y feriados. **No** reimplementes el cálculo en el frontend: usa siempre esta función.

### 1.5 Crear solicitud

```ts
supabase.schema('Solicitudes').rpc('fnSolicitudCrearEscalar', {
  p_tipo_solicitud_id: tipo.id,
  p_detalle: { fecha_evento: 'YYYY-MM-DD', /* ...campos del formulario según tipo.formulario */ },
  p_excepcional: false,   // true solo desde la sección "Solicitud excepcional" del Jefe
}) // devuelve el id del ticket
```

`fecha_evento` va **dentro de `p_detalle`**. La base valida, en este orden:

1. Usuario activo.
2. Excepcional solo para Jefe de Área o Administrador.
3. Horario hábil (salvo excepcional o Administrador).
4. Fecha del evento obligatoria y no pasada.
5. Anticipación mínima (salvo excepcional).

Después de crear, lee el `codigo` del ticket para mostrar el toast *"Solicitud AOAA0012 enviada"*.

### 1.6 Horario hábil

- Horario hábil: **lunes a viernes, de 8:00 a. m. a 4:00 p. m.** (hora de Honduras), sin feriados (`Solicitudes.Feriados`).
- `supabase.schema('Solicitudes').rpc('fnEsHorarioHabilEscalar')` devuelve `boolean` (tiene en cuenta los feriados).
- Quién puede actuar fuera de horario:

| Rol | Fuera de horario |
|---|---|
| Diseñador / Asignador | Puede trabajar siempre |
| Empleado (y Analista) | **No** puede enviar solicitudes |
| Jefe de Área | **No** puede enviar solicitudes normales ni dictaminar, **salvo** las solicitudes excepcionales (enviarlas y dictaminarlas) |
| Administrador | Siempre |

### 1.7 Solicitudes excepcionales

🆕 Reglas:

- Las crea el **Jefe de Área** con `p_excepcional: true`, **cualquier día y a cualquier hora**.
- La fecha del evento debe tener al menos **2 días hábiles de anticipación**. Usa `fnFechaEventoMinimaEscalar(tipo, true)`; la base rechaza fechas menores con el mensaje *"Las solicitudes excepcionales necesitan 2 días hábiles de anticipación: la fecha del evento debe ser a partir del DD/MM/AAAA."*
- Nacen con `excepcional_estado = 'PENDIENTE'`, en estado "Enviado" y sin diseñador. La base notifica a todos los **Asignadores**.
- **Solo el Asignador** las acepta o rechaza. Un Diseñador normal **no** puede aceptarlas, rechazarlas ni tomarlas. Al aceptarla, el Asignador se la queda o la asigna a un diseñador:

```ts
// aceptar y quedársela (p_disenador_id omitido) o asignarla a otro diseñador
supabase.schema('Solicitudes').rpc('fnSolicitudExcepcionalResponderEscalar', {
  p_ticket_id: id, p_aceptar: true, p_disenador_id: idDisenador /* opcional */,
}) // pasa a "En proceso" con ese diseñador
// rechazar (motivo obligatorio)
supabase.schema('Solicitudes').rpc('fnSolicitudExcepcionalResponderEscalar', {
  p_ticket_id: id, p_aceptar: false, p_motivo: 'texto',
}) // pasa a "Rechazado"
```

- Una vez aceptada, **solo el Asignador** (o el Admin) puede reasignarla, con `update` de `disenador_id`.
- **Rechazo automático:** si pasa la fecha del evento y nadie la aceptó ni rechazó, la base la pasa sola a "Rechazado", con el motivo *"Rechazada automáticamente: no fue atendida antes de la fecha del evento."*, y avisa al jefe.
- Nuevo estado **"Rechazado"** (final). Color sugerido: rojo/gris. Agrégalo a los mapas de colores y a los filtros de estado.

### 1.8 Correcciones y aprobación

- Hasta **5 correcciones** por ticket (los entregables llegan a la versión 6). Después de la 5.ª, la base solo deja **APROBAR**.
- Las correcciones ocurren dentro de la misma fecha límite global. Si se pasa, el ticket aparece como **Retrasado** (también desde "Corrección") y el diseñador puede seguir entregando.
- La aprobación automática ocurre a las **24 horas hábiles** desde la entrega (3 días hábiles de 8 h).
- Cronómetro: `minutos_habiles_restantes_dictamen` de la vista. **Nunca muestres decimales.** Usa este helper:

```ts
export function formatoHorasHabiles(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  const hs = `${h} ${h === 1 ? 'hora' : 'horas'}`
  const ms = `${m} ${m === 1 ? 'minuto' : 'minutos'}`
  if (h === 0) return ms
  if (m === 0) return hs
  return `${hs} y ${ms}`
}
// "Quedan 5 horas y 20 minutos hábiles para dictaminar"
```

  Vuelve a consultar la vista cada 60 s mientras la pantalla esté abierta (o usa Realtime si ya existe), porque fuera de horario el cronómetro se detiene y lo calcula la base.

### 1.9 Usuarios y roles

- `Seguridad.Usuarios` tiene `primer_apellido`, `segundo_apellido` y `nombre_completo`. `nombre_completo` lo calcula la base: **no lo envíes nunca**. Muestra `nombre_completo` en toda la app.
- La Edge Function `crear-usuario` ahora **exige** este body:

```ts
{ correo, nombre, primer_apellido, segundo_apellido, area_id, rol_id }
```

  Si falta algo, responde `400 { error: 'Faltan datos: ...' }`.
- Nuevo rol **Asignador**. **Solo se puede asignar a usuarios que ya tienen "Diseñador"**: la base lo rechaza si no. Y no se puede quitar "Diseñador" mientras el usuario tenga "Asignador".
- `Seguridad.fnDisenadoresTabla()` → `{ id, nombre, es_asignador }[]`: lista de diseñadores activos (solo para Asignador o Admin).

### 1.10 Visibilidad (RLS)

| Rol | Tickets que ve | Entregables |
|---|---|---|
| Empleado | Los suyos | **Ninguno** (ni lista ni archivos). 🆕 Tampoco ve los **comentarios de los dictámenes** (`DictamenJefe`): solo el **estado** |
| Diseñador | Los **sin asignar** y **los suyos** | Los de los tickets que ve |
| Asignador | **Todos** | Todos |
| Jefe de Área | Los de su área | Los de su área |
| Administrador | Todos | Todos |

- Un Diseñador solo puede asignarse tickets **a sí mismo**: `update Ticket set disenador_id = miId, estado_id = En proceso` sobre uno sin asignar. 🆕 **No** puede tomar excepcionales.
- El Asignador (y el Admin) puede poner cualquier `disenador_id`. La base notifica al diseñador nuevo y al anterior.

---

## 2. Cambios por pantalla

### 2.1 Layout: sidebar plegable (todos los dashboards)

- Botón para plegar/desplegar (ícono de "panel" o hamburguesa) en la parte superior del sidebar.
- **Plegado:** solo íconos, con tooltip del nombre al pasar el cursor (`w-16`). **Desplegado:** ícono y texto (`w-64`). Transición suave (`transition-[width] duration-200`).
- Guarda la preferencia en `localStorage` (`voae.sidebar.plegado`), protegido con `try/catch`.
- En móvil (< `md`), el sidebar es un drawer que se abre con el botón hamburguesa y se cierra al elegir una opción o tocar fuera.
- El contenido principal se ajusta al ancho del sidebar, sin saltos de layout.

### 2.2 Tarjetas del tablero (componente compartido `TicketCard`)

Cada tarjeta muestra:

- **`codigo`** en negrita (por ejemplo `AOAA0003`) y el tipo de solicitud.
- **Creada:** `fecha_registro` (`dd/MM/yyyy h:mm a`).
- **Evento:** `fecha_evento` (`dd/MM/yyyy`).
- **Vence:** `fecha_limite`.
- **Diseñador:** `disenador ?? 'Sin asignar'`.
- Insignia de estado (`estado_real`).
- Si `es_excepcional`: insignia **"Excepcional"** (ámbar, ícono de rayo) y, si está pendiente, el texto "Pendiente de aceptación".
- Si `correcciones_usadas > 0`: **"Correcciones 2/5"** (rojo al llegar a 5/5).
- Si hay cronómetro (`minutos_habiles_restantes_dictamen != null`) y quien ve es Jefe o Diseñador: *"Dictamen: quedan X horas y Y minutos"*.

### 2.3 Nueva solicitud (Empleado, Analista y Jefe)

- **Arriba de cada formulario**, como primer campo: **"Fecha del evento \*"**, obligatorio. 🆕 Usa el componente **`FechaEventoPicker`** (ver 2.3.1).
  - Texto de ayuda: *"Para «Afiche» se necesitan 10 días hábiles: el evento debe ser a partir del 27/10/2026."*
  - Si llega una fecha menor (por ejemplo, porque cambió el tipo o pasó la medianoche), límpiala, muestra el error en el campo y **deshabilita "Enviar"**.
- **Quita** los campos "Fecha (opcional)" de ARTE y PROTOCOLO y "Fecha requerida" de GENÉRICO, incluidos sus tipos, validaciones (zod o la que uses) y la pantalla de detalle.
- Campo **"Información adicional"** con este placeholder exacto: `Escribe aquí las instrucciones e información completa que deseas incluir...`
- La tarjeta del tipo muestra "N días hábiles" (con 10, 15, 20 o 30).
- **Horario hábil:** crea el hook `useHorarioHabil()`:
  - Llama a `fnEsHorarioHabilEscalar` al montar y cada 60 s.
  - Si el resultado es `false` y el usuario no es Admin, muestra un banner arriba del formulario: *"Las solicitudes solo se pueden enviar de lunes a viernes, de 8:00 a. m. a 4:00 p. m. Puedes llenar el formulario, pero el envío se habilitará en horario hábil."*
  - Deshabilita el botón **Enviar** y explica el motivo en un tooltip.
- El paso de revisión muestra la fecha del evento y la fecha límite estimada.

#### 2.3.1 🆕 `FechaEventoPicker`: bloqueo dinámico del calendario

Componente reutilizable para **todos** los formularios (normal y excepcional). Usa `react-day-picker` (o el date picker que ya tenga el proyecto, si permite deshabilitar días) en un popover. **No** uses `<input type="date">`, porque no permite marcar el periodo de producción.

```tsx
<FechaEventoPicker tipoId={tipo.id} excepcional={false} value={fecha} onChange={setFecha} />
```

- Al montar, y cada vez que cambian `tipoId` o `excepcional`, llama a `fnFechaEventoMinimaEscalar(tipoId, excepcional)` → `minimo`. Vuelve a consultarla cada 5 minutos, y también al abrir el calendario: la ventana se mueve con el tiempo.
- **Deshabilita todas las fechas anteriores a `minimo`:** `disabled={{ before: parseISO(minimo) }}`.
- **Marca visualmente el periodo de producción** (de hoy a `minimo - 1`) con fondo gris rayado y tooltip *"Periodo de producción: 10 días hábiles"*. Los días anteriores a hoy van en gris simple.
- Marca los **feriados** activos (`Solicitudes.Feriados`) con un punto y su nombre en el tooltip. Los fines de semana se ven atenuados, pero **se pueden elegir** como fecha del evento si están después del mínimo.
- Abre el calendario directamente en el mes de `minimo`.
- Debajo del campo: *"Primer día disponible: martes 27/10/2026 (10 días hábiles de producción)"*. En excepcional: *"(2 días hábiles de producción)"*.
- Mientras carga `minimo`, deshabilita el campo con un esqueleto. Si la consulta falla, muestra el error y no permite enviar.
- Se adapta solo a cualquier plazo (10, 15, 20, 30 o el que el admin configure), porque el cálculo lo hace la base.

### 2.4 Detalle del ticket

- Título con `codigo`. Datos generales:
  - creado el;
  - fecha del evento;
  - fecha límite;
  - solicitante;
  - diseñador (de la vista);
  - estado;
  - "Correcciones X/5";
  - si es excepcional: su estado y el motivo del rechazo.
- Sección **Entregables:** **solo** para Jefe de Área, Diseñador, Asignador y Administrador. Para el **solicitante** no se renderiza: ni la sección, ni la consulta, ni un mensaje de "sin entregables". Si el solicitante también es jefe del área, aplican sus permisos de jefe.
- 🆕 El solicitante (Empleado) **solo ve el estado**: no ve los dictámenes ni sus comentarios (la base ya no se los devuelve) ni el contador "Correcciones X/5". Oculta esas secciones para él. Sí ve la línea de tiempo de estados (historial) y el diseñador asignado.
- Muestra `fecha_evento` (de `Formularios`) junto a los campos del formulario.

### 2.5 Jefe de Área

- **Menú nuevo: "Solicitud excepcional".**
  - Aviso inicial: *"Úsala solo para urgencias. No requiere días hábiles de anticipación y puedes enviarla a cualquier hora. El equipo de diseño puede aceptarla o rechazarla."*
  - 🆕 Aviso actualizado: *"Úsala solo para urgencias. Puedes enviarla cualquier día y a cualquier hora, con al menos 2 días hábiles de anticipación al evento. El Asignador del equipo de diseño la acepta o la rechaza; si nadie la atiende antes del evento, se rechaza automáticamente."*
  - Es el mismo asistente de nueva solicitud, con `p_excepcional: true` y `FechaEventoPicker` con `excepcional={true}` (mínimo de 2 días hábiles). **No** se bloquea por horario.
  - Debajo: lista **"Mis solicitudes excepcionales"**, con código, tipo, fecha del evento, estado de aceptación (Pendiente / Aceptada por {diseñador} / Rechazada con su motivo) y estado del ticket.
- **Dictamen:**
  - Botones **Aprobar** y **Pedir corrección**, con el contador "Correcciones 2/5".
  - Si `correcciones_usadas >= 5`, deshabilita "Pedir corrección" con el tooltip *"Ya se usaron las 5 correcciones; solo puedes aprobar."*
  - Fuera de horario hábil, y si el ticket **no** es excepcional, deshabilita ambos botones con el aviso de horario.
  - Muestra el cronómetro con `formatoHorasHabiles`.

### 2.6 Diseñador: tablero

Columnas:

1. **Sin asignar:** todos los tickets con `disenador_id === null` y estado no final.
   - Tickets normales: botón **"Tomar"**.
   - 🆕 Excepcionales pendientes: aparecen **arriba**, con borde ámbar y la etiqueta *"Excepcional · esperando al Asignador"*, **sin botones** (ni Tomar, ni Aceptar, ni Rechazar). Si el usuario también es Asignador, ve los botones de la sección 2.7.
2. **En proceso:** solo los suyos (`disenador_id === miId`).
3. **Corrección:** solo los suyos.
4. **Retrasados:** solo los suyos (`estado_real === 'Retrasado'`).
5. **Finalizados esperando dictamen:** solo los suyos (`estado_real === 'Finalizado'`), con el cronómetro.

La RLS ya filtra, pero filtra también en el cliente por columna, para que un Asignador que use este tablero vea solo lo suyo en las columnas 2 a 5. Los aprobados y rechazados pueden ir en una sección colapsable "Historial".

### 2.7 Asignador (nuevo): ruta `/asignador`

- Visible en el menú para usuarios con rol **Asignador** (y Administrador). Como el Asignador también es Diseñador, conserva "Mi tablero" y suma **"Asignación"**.
- Arriba: buscador por código y filtros por tipo, área y estado.
- Carriles: **"Sin asignar"** y un carril por diseñador (`fnDisenadoresTabla()`), con contador de tickets activos de cada uno.
- Cada tarjeta tiene un **selector "Asignar a…"** con los diseñadores. Al elegir uno, hace `update` de `disenador_id` (y `estado_id` = "En proceso" si estaba en "Enviado" o "En revisión"), con un toast *"AOAA0005 reasignado a {nombre}"*. Pide confirmación al reasignar un ticket que ya tenía diseñador.
- Opcional: arrastrar y soltar entre carriles (por ejemplo con `@dnd-kit/core`), con el selector siempre disponible para accesibilidad.
- Puede **tomar** tickets para sí mismo y **subir entregables** a cualquier ticket, con el mismo componente de subida que usa el diseñador.
- 🆕 **Sección "Excepcionales pendientes"**, arriba de todo y destacada (ámbar), con contador en el menú. Cada tarjeta muestra el código, tipo, jefe y área solicitante, fecha del evento y *"Se rechaza automáticamente el DD/MM si no respondes"* (el día siguiente al evento). Botones:
  - **Aceptar:** modal con el selector **"Asignar a"** (por defecto *"Yo"*, más la lista de `fnDisenadoresTabla()`). Llama a `fnSolicitudExcepcionalResponderEscalar` con `p_aceptar: true` y `p_disenador_id` (omítelo si eligió "Yo").
  - **Rechazar:** modal con motivo obligatorio.
- Las excepcionales pendientes **no** tienen selector "Asignar a…" en los carriles: primero se aceptan. Las aceptadas sí se pueden reasignar como cualquier ticket.

### 2.8 Administración de usuarios

- Crear y editar: **Nombre\***, **Primer apellido\***, **Segundo apellido\*** (los tres obligatorios, sin espacios al inicio ni al final), correo, área y rol. Al crear, llama a la Edge Function con el body nuevo.
- Lista: columna "Nombre completo". Muestra un aviso ⚠️ en los usuarios sin `primer_apellido` o `segundo_apellido`, y un filtro "Datos incompletos" para completarlos rápido.
- Roles: el checkbox o la opción **Asignador** solo se habilita si el usuario tiene **Diseñador**, con el tooltip *"Primero asigna el rol Diseñador"*. Si intentan quitar Diseñador a un Asignador, muestra el mensaje de la base.

### 2.9 "Mis solicitudes"

- Los selectores **"Todos los estados"** y **"Todos los tipos"**, con el mismo estilo de los demás inputs: `border border-slate-300 rounded-lg shadow-sm bg-white px-3 py-2 focus:ring-2 focus:ring-menta-400 focus:border-menta-500` (adapta las clases a los tokens del proyecto). Agrega íconos (filtro, chevron) y un `hover:shadow-md`.
- Agrega "Rechazado" a los estados.
- Columnas: código, tipo, fecha de creación, fecha del evento, diseñador, estado y "Correcciones X/5".

### 2.10 Estadísticas (Analista y Admin)

- `fnEstadisticasTicketsTabla` ahora devuelve también `codigo`, `fecha_evento` y `es_excepcional`. El filtro por tipo ya funciona en la base.
- **Tarjeta de filtros fija:** `sticky top-0 z-20`, con fondo, sombra y borde; debe quedar visible al hacer scroll sin tapar el contenido. Ajusta el `top` si hay header.
- **Botón "Limpiar filtros":** estilo secundario (`border`, `rounded-lg`, `shadow-sm`, ícono de "x" o escoba, `hover:bg-slate-50`). Se deshabilita si no hay filtros activos. Al pulsarlo, reinicia todo, incluida la URL.
- **Buscador por número de ticket** sobre la tabla de detalle: input con ícono de lupa y placeholder *"Buscar por código (ej. ADH0001)"*. Filtra en el cliente, sin distinguir mayúsculas, por coincidencia parcial con `codigo`. Muestra "N de M tickets".
- **Exportar:** un botón "Exportar" con dos opciones:
  - **CSV:** UTF-8 con BOM, separador `,`, con las filas filtradas (incluida la búsqueda) y columnas con encabezados en español, empezando por "Código".
  - **PDF:** usa `jspdf` + `jspdf-autotable`. Incluye título "Estadísticas de solicitudes VOAE", rango de fechas y filtros aplicados, fecha de generación, los KPIs como texto y la tabla de detalle (horizontal, con numeración de páginas). Opcional: los gráficos como imagen con `html-to-image`.
  - Nombre de archivo: `estadisticas_voae_AAAA-MM-DD.pdf` / `.csv`.
- KPI nuevo: "Excepcionales" (cantidad y % aceptadas). En los gráficos y filtros de estado, agrega "Rechazado".

### 2.11 Notificaciones

Los mensajes ya traen el código del ticket. Si el clic lleva al detalle, sigue usando `ticket_id`. Si el usuario ya no puede ver el ticket (por ejemplo, un diseñador al que se lo reasignaron a otro), muestra *"Este ticket ya no está asignado a ti"* en lugar de un error.

---

## 3. Limpieza

- Elimina todo uso de `FormularioArte.fecha`, `FormularioProtocolo.fecha` y `FormularioGenerico.fecha_requerida`.
- Busca `'Sin asignar'`: debe venir solo de `disenador ?? 'Sin asignar'`.
- Busca nombres de áreas o tipos escritos a mano ("Comunicación", "Becas", "Trifolio", "Promocionales") y quítalos.
- Busca `#${id}` o `Ticket #`: reemplázalos por `codigo`.
- Busca textos con "24 h" o "24 horas" y cámbialos por "24 horas hábiles".

## 4. Al terminar

1. `npm run build` y `npm run lint` sin errores.
2. Resumen: archivos creados, modificados y eliminados, y librerías instaladas.
3. Lista de pruebas manuales:
   - Fecha del evento antes del mínimo (bloqueada) y válida (código `XXX0000` en el toast).
   - Empleado fuera de horario: banner y botón deshabilitado.
   - 🆕 Jefe: solicitud excepcional un fin de semana. El calendario bloquea hasta 2 días hábiles después. El Asignador acepta una (asignándola a otro diseñador) y rechaza otra con motivo; el jefe ve ambos resultados. Un diseñador normal no ve botones en las excepcionales.
   - 🆕 Calendario: con Afiche bloquea 10 días hábiles; con Campaña publicitaria, 30. Los feriados se marcan.
   - 🆕 El empleado no ve los comentarios del jefe ni el contador de correcciones.
   - Diseñador A toma un ticket; el diseñador B deja de verlo. El empleado ve el nombre de A.
   - Asignador reasigna de A a B; ambos reciben una notificación.
   - 5 correcciones: contador hasta 5/5 y botón deshabilitado.
   - Cronómetro en "X horas y Y minutos".
   - El empleado no ve entregables; el jefe sí.
   - Admin: crear un usuario sin segundo apellido (error); dar Asignador sin Diseñador (deshabilitado).
   - Sidebar plegable que recuerda su estado; filtros con estilo.
   - Estadísticas: filtros fijos, "Limpiar filtros", búsqueda por código, exportar PDF y CSV.

## 5. 🆕 Resumen de cambios v3.1 (para quien ya implementó la v3)

1. `fnFechaEventoMinimaEscalar` ahora recibe `p_excepcional`. Crea `FechaEventoPicker` con bloqueo dinámico (2.3.1) y úsalo en todos los formularios, incluida la excepcional (mínimo de 2 días hábiles).
2. **Solo el Asignador** acepta o rechaza excepcionales: nueva firma con `p_disenador_id`, sección "Excepcionales pendientes" en `/asignador` y tarjetas sin botones para los diseñadores normales (2.6 y 2.7).
3. Rechazo automático: muestra el motivo y la fecha en que ocurrirá.
4. El empleado solicitante no ve dictámenes, comentarios ni el contador de correcciones (2.4).
5. Textos del aviso de la solicitud excepcional (2.5).
