# Tarea: frontend v4. Bitácoras en pestañas, tarjetas verticales, historial del jefe, cronómetro y ajustes de navegación

Eres un desarrollador frontend senior en este repositorio: **React + Vite + TypeScript + Tailwind v4 + Supabase**, desplegado en Cloudflare Pages. La v3.1 ya está implementada. Esta tarea agrega y corrige lo que se describe abajo.

## Antes de escribir código

1. Lee `docs/cambios/cambios_bd_2026-10-13_bitacoras.sql` (Partes 20 a 23): tablas, vistas y permisos nuevos.
2. Lee `src/types/database.ts`, que **ya está regenerado** con las vistas nuevas.
3. Revisa estas partes del código: sidebar y layout; página de Bitácora del Administrador; componente de tarjeta de ticket (`TicketCard` o equivalente) y tableros de Diseñador y Asignador; sección "Por dictaminar" del Jefe de Área; componente del cronómetro de dictamen; utilidades de exportación de Estadísticas.
4. Presenta un **plan corto** (archivos a crear, modificar y borrar) y luego impleméntalo completo.

## Reglas obligatorias

- **NO modifiques la base de datos**, no ejecutes SQL y no uses la llave `service_role`/secret. Si falta algo en la base, detente y avísame.
- Usa `.schema('Seguridad')` / `.schema('Solicitudes')`. Muestra siempre el `error.message` de Supabase en un toast.
- Fechas en español, zona `America/Tegucigalpa`.
- Mantén el estilo actual: azul institucional, verde menta, tipografías y componentes existentes.
- No escribas nombres de tipos de solicitud ni de áreas en el código: léelos de la base.
- Al terminar, `npm run build` y `npm run lint` deben pasar sin errores.

---

## 1. Bitácoras del Administrador en pestañas

Ruta actual de Bitácora del Administrador. Conviértela en una página con **3 pestañas**:

| Pestaña | Fuente | Columnas |
|---|---|---|
| **Roles** | La consulta actual de `Seguridad.UsuariosRolesLog` (no cambies su lógica) | Las que ya tiene |
| **Feriados** | `supabase.schema('Seguridad').from('vw_FeriadosLog')` | Fecha y hora, Acción, Feriado (`nombre`), Fechas anteriores (`fecha_inicio_anterior` – `fecha_fin_anterior`), Fechas nuevas (`fecha_inicio_nueva` – `fecha_fin_nueva`), Realizado por (`realizado_por`) |
| **Asignaciones** | `supabase.schema('Solicitudes').from('vw_AsignacionLog')` | Fecha y hora, Ticket (`codigo`), Tipo (`tipo_solicitud`), Área, Acción, De (`disenador_anterior` o "Sin asignar"), A (`disenador_nuevo` o "Sin asignar"), Realizado por |

**Acciones** (insignia de color):

- **Feriados:** `CREADO` (verde), `EDITADO` (azul), `DESACTIVADO` (gris), `REACTIVADO` (menta), `ELIMINADO` (rojo).
- **Asignaciones:** `TOMADO`, `ASIGNADO`, `REASIGNADO`, `DESASIGNADO`, `EXCEPCIONAL ACEPTADA` (ámbar).
- Muestra el texto legible: "Tomado", "Asignado", "Reasignado", "Desasignado", "Excepcional aceptada".

**En cada pestaña:**

- **Barra de búsqueda con ícono de lupa** (input con el ícono dentro, a la izquierda). Busca sin distinguir mayúsculas ni tildes:
  - Roles: por usuario y rol.
  - Feriados: por nombre del feriado y "realizado por".
  - Asignaciones: por código de ticket y por nombres (de, a, realizado por).
- **Filtros:** rango de fechas (con atajos: Hoy, Últimos 7 días, Este mes), Acción (select) y Realizado por (select).
  - En Asignaciones, además: Diseñador (aparece como "De" o "A") y Área.
- Botón **"Limpiar filtros"**, con el mismo estilo que en Estadísticas.
- Tabla ordenada por fecha descendente, paginada (20 por página), con estado vacío *"No hay registros con estos filtros"*.
- Botón **Exportar CSV** (UTF-8 con BOM) con las filas filtradas.
- Filtros con `border`, `rounded-lg`, `shadow-sm`, como en "Mis solicitudes".
- La pestaña activa y los filtros se guardan en la URL (`?tab=asignaciones&...`), para que al recargar se mantengan.
- Usa un componente reutilizable para las tres pestañas: `BitacoraTabla` con columnas, filtros y búsqueda configurables. Así no se repite código.
- Pestañas accesibles (`role="tablist"`, navegación con flechas), con contador de registros en cada una.

Las vistas solo devuelven datos al Administrador; la base ya lo controla.

## 2. Navegación y sidebar

- **Quita "Asignación" del menú del Administrador.** El ítem "Asignación" (`/asignador`) solo aparece para usuarios con rol **Asignador**.
- **Protege la ruta** `/asignador`: si el usuario no tiene el rol Asignador, redirige a su dashboard con el toast *"No tienes acceso a Asignación"*.
- **Badges del sidebar:**
  - **Quita** la insignia de "ticket nuevo" del ítem **"Asignación"**.
  - **Mantén** las insignias numéricas en **"Mi tablero"** y en sus columnas o subítems: cantidad de tickets nuevos o pendientes.
  - Si existe un contador de excepcionales pendientes para el Asignador, muéstralo **dentro** de la página de Asignación (en el encabezado de la sección "Excepcionales pendientes"), no en el sidebar.

## 3. Tarjeta de ticket vertical y tablero

Rediseña la tarjeta compartida (`TicketCard`) que usan el tablero del Diseñador, el del Asignador y las listas del Jefe:

```
┌──────────────────────────────────┐
│ [AOAA0004]        [● En proceso] │  ← fila superior: código (badge) a la izquierda, estado a la derecha
│ [⚡ Excepcional] [Correcciones 2/5]│  ← insignias opcionales (solo si aplican)
│                                  │
│ Afiche                           │  ← tipo de solicitud (título, font-semibold)
│ Área de Salud                    │  ← área (texto secundario, una sola línea)
│ ──────────────────────────────── │
│ 📅 Creada     13/10/2026 9:10 a.m.│  ← cuadrícula de 2 columnas: etiqueta / valor
│ 🎉 Evento     27/10/2026          │
│ ⏰ Vence      26/10/2026 9:10 a.m.│  ← en rojo si está vencido
│ 👤 Diseñador  Ana López Pérez     │  ← "Sin asignar" en gris itálica
│ ──────────────────────────────── │
│ ⏳ Dictamen: 23:30 restantes      │  ← solo si hay cronómetro
└──────────────────────────────────┘
```

- El **código** va **arriba**, como badge (`font-mono`, fondo azul suave, `rounded-md`). Ya **no** va en el lateral izquierdo.
- **No elimines ningún campo**: creada, evento, vence, diseñador, estado, excepcional, correcciones, cronómetro y solicitante (donde ya se muestre).
- Usa íconos de la librería que ya tenga el proyecto (por ejemplo `lucide-react`), no emojis. Los del esquema son solo referencia.
- Espaciado: `p-4`, `gap-3`, separadores sutiles (`border-t border-slate-100`), etiquetas `text-xs text-slate-500` y valores `text-sm text-slate-800`. Los textos largos se truncan con `truncate` y `title` para verlos completos.
- Toda la tarjeta es clicable y lleva al detalle. `hover:shadow-md` y foco visible.
- **Quita el botón "Subir" / "Subir entregables"** de las tarjetas, en todos los tableros, incluida la vista de Asignación. Los entregables se suben **solo desde el detalle del ticket**. Los demás botones de la tarjeta se mantienen: Tomar, selector "Asignar a…" del Asignador, Aceptar/Rechazar de excepcionales.

## 4. Textos

- **Quita "Subárea"** en toda la app: etiquetas, columnas, textos de ayuda y selectores que digan "Subárea" o "subárea". Solo se muestra el **nombre del área** (`Areas.nombre`). Busca en el código `Subárea`, `subarea`, `Subarea` y `sub_area`. Si había un campo de formulario de subárea que no existe en la base, elimínalo.
- El tipo de solicitud ahora se llama **"Promociones (Licitaciones)"**, con L mayúscula, y ya viene así de la base. Busca en el código cualquier texto escrito a mano con "Promociones (licitaciones)" o "Promocionales" y elimínalo o cámbialo.

## 5. Jefe de Área: "Por dictaminar" → Historial

En la pestaña o sección **Historial** de "Por dictaminar":

- **Búsqueda con lupa** por código de ticket y texto (tipo, diseñador, solicitante, estado), sin distinguir mayúsculas ni tildes.
- Filtros existentes: si hay, mantenlos; si no, agrega rango de fechas y decisión (Aprobado / Corrección / Aprobado automático).
- **Exportar** (menú con dos opciones):
  - **CSV** (UTF-8 con BOM) con las filas filtradas.
  - **PDF** con `jspdf` + `jspdf-autotable` (ya instalados para Estadísticas). Título "Historial de dictámenes – {área}", filtros aplicados, fecha de generación y la tabla en horizontal, con numeración de páginas.
- **Extrae la lógica de exportación** de Estadísticas a `src/lib/exportar.ts` (`exportarCSV(filas, columnas, nombreArchivo)` y `exportarPDF({ titulo, subtitulo, columnas, filas, nombreArchivo })`). Úsala en Estadísticas, en el Historial del Jefe y en Bitácoras.

## 6. Cronómetro del dictamen

Reemplaza en **toda** la app el formato decimal (`24.0h`, `23.5h`) por horas y minutos exactos.

- Componente **`CronometroDictamen`** (`minutos: number | null`, `fechaAprobacion: string`):
  - **Anillo de progreso:** `minutos / 1440`. Dentro, en grande y en `font-mono tabular-nums`, **`HH:MM`** (por ejemplo `23:30`, `05:07`, `24:00`).
  - **Texto al lado:** *"Quedan 23 horas y 30 minutos hábiles para dictaminar. Si el jefe de área no dictamina antes del 22/10/2026 4:00 p. m., el ticket se aprueba automáticamente."* Usa `formatoHorasHabiles` (singular/plural correctos; omite la parte que vale 0).
  - **Color del anillo:** menta si quedan más de 8 h, ámbar entre 2 y 8 h, rojo con menos de 2 h.
  - Si `minutos === 0` o es `null` con el ticket aprobado: *"Plazo de dictamen vencido: aprobado automáticamente"*.

```ts
export const formatoHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
```

- **Actualización:**
  - Vuelve a consultar `minutos_habiles_restantes_dictamen` de la vista cada 60 s.
  - Entre consultas, si el hook `useHorarioHabil()` dice que es horario hábil, resta 1 minuto localmente cada 60 s para que se vea la cuenta regresiva. Fuera de horario no resta, porque el tiempo hábil está detenido.
  - Junto al reloj, muestra *"Pausado: fuera de horario hábil"* cuando corresponda.
- En las tarjetas, la versión compacta: *"Dictamen: 23:30"*.
- Busca y elimina cualquier `toFixed(1)` o cálculo de horas con decimales relacionado con el dictamen.

---

## 7. Al terminar

1. `npm run build` y `npm run lint` sin errores.
2. Resumen de archivos creados, modificados y eliminados.
3. Pruebas manuales:
   - **Admin:** ya no ve "Asignación" en el menú, y si entra a `/asignador` lo redirige.
   - **Admin → Bitácoras:** 3 pestañas. Crea, edita, desactiva y reactiva un feriado, y verifica que cada acción aparece en "Feriados" con "Realizado por". Busca con la lupa y filtra por acción. Exporta CSV.
   - **Asignador:** toma un ticket, reasigna otro y acepta una excepcional asignándola a otro diseñador. En "Asignaciones" (como admin) aparecen como Tomado, Reasignado y Excepcional aceptada, con De, A y quién lo hizo.
   - Las tarjetas muestran el código arriba, todos los campos y **sin** botón "Subir". Subir entregables funciona desde el detalle.
   - No aparece "Subárea" en ninguna pantalla. El tipo se ve como "Promociones (Licitaciones)".
   - **Jefe → Por dictaminar → Historial:** busca por código y exporta PDF y CSV.
   - Cronómetro en `HH:MM` y texto "X horas y Y minutos", sin decimales. Fuera de horario dice "Pausado".
   - Sin badge en "Asignación"; badges numéricos en "Mi tablero".
