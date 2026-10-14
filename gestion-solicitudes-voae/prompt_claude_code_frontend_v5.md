# Tarea: frontend v5. iTickets, tickets estilo boleto, Mi tablero en pestañas, Asignador por diseñador y nuevo login

Eres un desarrollador frontend senior en este repositorio: **React + Vite + TypeScript + Tailwind v4 + Supabase**, desplegado en Cloudflare Pages. Ya están implementadas las versiones v3.1 y v4. Esta tarea aplica los cambios que se describen abajo.

## Antes de escribir código

1. Lee `docs/cambios/cambios_bd_2026-10-14_asignado.sql` (Parte 24). La vista `Solicitudes.vw_TicketsEstadoReal` tiene **4 columnas nuevas** al final:

| Columna | Uso |
|---|---|
| `asignado_por` (int) | Quién hizo la asignación actual |
| `asignado_por_nombre` (text) | Su nombre completo |
| `fecha_asignacion` (timestamptz) | Cuándo se asignó |
| `asignado_por_asignador` (bool) | **`true` = otra persona (el Asignador) se lo asignó al diseñador**; `false` = él mismo lo tomó o no tiene diseñador. Úsala para la etiqueta "Asignado". |

2. `src/types/database.ts` ya está regenerado.
3. Revisa estas partes: login y layout; sidebar y badges; "Resumen" y "Mis solicitudes" (Empleado/Jefe/Analista); "Mi tablero" del Diseñador; dashboard del Asignador (`/asignador`); `TicketCard`; insignia "Excepcional".
4. Presenta un **plan corto** y luego impleméntalo completo.

## Reglas obligatorias

- **NO modifiques la base de datos** ni uses la llave `service_role`/secret.
- Usa `.schema('Solicitudes')` / `.schema('Seguridad')`. Muestra el `error.message` de Supabase en un toast.
- Fechas en español, zona `America/Tegucigalpa`.
- **Paleta:** azul institucional y verde menta del proyecto. En los ejemplos de abajo, `blue-*` y `emerald-*` son de referencia: **reemplázalos por los tokens o colores que ya usa el proyecto**.
- Usa los íconos que ya tenga el proyecto (por ejemplo `lucide-react`). Nada de emojis en la interfaz.
- Responsive desde 360 px de ancho. Al terminar, `npm run build` y `npm run lint` deben pasar sin errores.

---

## 1. Nombre del producto: **iTickets**

- Cambia el nombre visible a **iTickets** en: `<title>` de `index.html` ("iTickets · VOAE"), encabezado del sidebar, login, `manifest` (si existe) y cualquier texto "Sistema de Gestión de Solicitudes" que funcione como nombre de la app. Ese texto descriptivo puede quedar como subtítulo: *"Gestión de solicitudes de diseño · VOAE"*.
- Logotipo de texto reutilizable `<MarcaITickets />`: "**i**" en verde menta y "**Tickets**" en el color del contexto. Úsalo en el sidebar (pequeño) y en el login (grande).
- Favicon: un ícono simple de boleto (SVG) con los colores de la app, en `public/favicon.svg`.

## 2. Áreas sin "Subárea"

Verifica que **no quede ningún** texto secundario o gris de "Subárea" en ninguna pantalla: tarjetas, tablas, selectores, perfil, detalle, filtros y exportaciones. El área se muestra **solo** con su nombre principal, tal como viene de `Areas.nombre`:

- Área de Desarrollo Humano
- Área de Orientación y Asesoría Académica
- Área de Salud

Busca `Subárea`, `subárea`, `Subarea`, `subarea` y `sub_area`. Elimina también las descripciones grises escritas a mano debajo de los nombres de las áreas.

## 3. "Resumen" y "Mis solicitudes": ticket estilo boleto

Crea `src/components/tickets/TicketBoleto.tsx` y úsalo en las listas de **Resumen** y **Mis solicitudes**, en lugar de la tarjeta actual. Diseño:

- **Franja azul a la izquierda**, con el código, el estado y las insignias.
- **Línea perforada** y **muescas** (círculos del color del fondo de la página) arriba y abajo, donde la franja se une con el cuerpo.
- **Cuerpo con los datos en COLUMNAS** (cuadrícula), no en filas. Se conservan **todos** los campos que ya mostraba la tarjeta.
- **En móvil:** la franja pasa arriba (horizontal) y la cuadrícula queda en 2 columnas.

Código de referencia (adáptalo a tus tipos, componentes y colores):

```tsx
import { CalendarDays, CalendarClock, PartyPopper, User, Layers, Building2 } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  t: TicketVista            // fila de vw_TicketsEstadoReal
  onClick?: () => void
  mostrarDisenador?: boolean
}

export function TicketBoleto({ t, onClick, mostrarDisenador = true }: Props) {
  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      tabIndex={0}
      role="button"
      aria-label={`Ticket ${t.codigo}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200
                 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-emerald-400 sm:flex-row"
    >
      {/* Franja azul */}
      <div className="relative flex shrink-0 items-center justify-between gap-3 bg-gradient-to-br from-blue-800 to-blue-950
                      px-5 py-3 text-white sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:py-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200">Ticket</p>
          <p className="font-mono text-lg font-bold tracking-wider">{t.codigo}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <EstadoBadge estado={t.estado_real} sobreOscuro />
          {t.es_excepcional && <TagExcepcional compacto />}
        </div>
        {/* Muescas (usan el color del fondo de la página) */}
        <span aria-hidden className="absolute -bottom-3 -right-3 hidden h-6 w-6 rounded-full bg-slate-50 sm:block" />
        <span aria-hidden className="absolute -right-3 -top-3 hidden h-6 w-6 rounded-full bg-slate-50 sm:block" />
      </div>

      {/* Perforación */}
      <div aria-hidden className="my-3 hidden border-l-2 border-dashed border-slate-200 sm:block" />

      {/* Datos en columnas */}
      <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-3 xl:grid-cols-6">
        <Dato icono={<Layers />} label="Tipo" valor={t.tipo_solicitud} />
        <Dato icono={<Building2 />} label="Área" valor={t.area} />
        <Dato icono={<CalendarDays />} label="Creada" valor={fechaHora(t.fecha_registro)} />
        <Dato icono={<PartyPopper />} label="Evento" valor={fecha(t.fecha_evento)} />
        <Dato icono={<CalendarClock />} label="Vence" valor={fechaHora(t.fecha_limite)} alerta={t.fuera_de_plazo} />
        {mostrarDisenador && (
          <Dato icono={<User />} label="Diseñador" valor={t.disenador ?? 'Sin asignar'} tenue={!t.disenador} />
        )}
      </dl>
    </article>
  )
}

function Dato({ icono, label, valor, alerta, tenue }:
  { icono: ReactNode; label: string; valor: string; alerta?: boolean; tenue?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500
                     [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icono}{label}
      </dt>
      <dd title={valor}
          className={`truncate text-sm ${alerta ? 'font-semibold text-red-600' : tenue ? 'italic text-slate-400' : 'text-slate-800'}`}>
        {valor}
      </dd>
    </div>
  )
}
```

- Las muescas usan `bg-slate-50`: cámbialo por el **color de fondo real** de esas páginas, para que parezcan recortadas.
- Para el **Empleado**, recuerda las reglas vigentes: no se muestran entregables, dictámenes ni el contador de correcciones.
- Las listas se separan con `space-y-3`, y se mantienen la paginación y los filtros que ya existen.

## 4. "Mi tablero" (Diseñador)

### 4.1 Dos pestañas

Arriba de la página, pestañas accesibles (`role="tablist"`). La activa se guarda en la URL (`?vista=sin-asignar` / `?vista=mis-tickets`):

1. **`Tickets sin asignación (N)`**
   - **Solo** los tickets que el diseñador puede tomar: `disenador_id IS NULL`, `es_excepcional = false` y estado no final (ni Aprobado, ni Rechazado, ni Finalizado).
   - Orden **FIFO:** `fecha_registro` ascendente, el más antiguo primero.
   - Cuadrícula de tarjetas verticales (`grid sm:grid-cols-2 xl:grid-cols-3 gap-4`), cada una con su botón **Tomar** dentro.
   - Las excepcionales pendientes no se pueden tomar. Si hay, muéstralas al final en una sección pequeña y colapsable, *"Excepcionales esperando al Asignador (N)"*, sin botones.
2. **`Mis tickets (N)`**
   - Las columnas habituales: **En proceso**, **Corrección**, **Retrasados** y **Finalizados esperando dictamen**. Solo los tickets del diseñador (`disenador_id = miId`).

Si el usuario también es Asignador, ve las mismas dos pestañas; la gestión de asignaciones sigue en `/asignador`.

### 4.2 Tarjeta vertical: botón "Tomar" dentro

Mantén el diseño vertical de `TicketCard` (v4) y agrega una prop `accion` para el pie de la tarjeta:

```tsx
<TicketCard t={t} onClick={() => abrir(t.ticket_id)}
  accion={
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); tomar(t) }}
      disabled={tomando === t.ticket_id}
      className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2
                 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
    >
      <Hand className="h-4 w-4" /> {tomando === t.ticket_id ? 'Tomando…' : 'Tomar'}
    </button>
  }
/>
```

- Dentro de `TicketCard`, el pie es: `{accion && <div className="border-t border-slate-100 pt-3">{accion}</div>}`.
- **Quita** el botón "Tomar" que hoy está fuera de la tarjeta.
- `tomar(t)`: actualiza la **tabla** `Ticket` (no la vista) **solo si sigue sin asignar**, para detectar que otro diseñador se adelantó:

```ts
const { data, error } = await supabase.schema('Solicitudes').from('Ticket')
  .update({ disenador_id: miId, estado_id: idEstadoEnProceso })
  .eq('id', t.ticket_id)
  .is('disenador_id', null)
  .select('id')
// error → toast con error.message
// data.length === 0 → toast "Otro diseñador ya tomó AOAA0004" y refrescar la lista
```

  Si sale bien: toast *"Tomaste AOAA0004"*, el ticket pasa a "Mis tickets" y se actualiza el contador.

### 4.3 Etiqueta "Asignado"

Componente `TagAsignado`, con el mismo estilo que `TagExcepcional`, en otro color (índigo o azul):

```tsx
import { UserCheck } from 'lucide-react'

export function TagAsignado({ por, fecha }: { por?: string | null; fecha?: string | null }) {
  return (
    <span
      title={por ? `Asignado por ${por}${fecha ? ` el ${fechaHora(fecha)}` : ''}` : 'Asignado por el Asignador'}
      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium
                 text-indigo-700 ring-1 ring-inset ring-indigo-200"
    >
      <UserCheck className="h-3 w-3" /> Asignado
    </span>
  )
}
```

- Se muestra si `t.asignado_por_asignador === true`, en `TicketCard` (junto a "Excepcional"), en `TicketBoleto` (en la franja) y en el detalle del ticket: *"Asignado por {asignado_por_nombre} el {fecha_asignacion}"*.
- Los tickets que el diseñador tomó él mismo **no** llevan etiqueta.

### 4.4 Badge de "Mi tablero" en el sidebar

- El número junto a **"Mi tablero"** = **solo la cantidad de tickets sin asignar que se pueden tomar**: mismo filtro que la pestaña 1.

```ts
const { count } = await supabase.schema('Solicitudes')
  .from('vw_TicketsEstadoReal')
  .select('ticket_id', { count: 'exact', head: true })
  .is('disenador_id', null)
  .eq('es_excepcional', false)
  .not('estado_registrado', 'in', '("Aprobado","Rechazado","Finalizado")')
```

- Hook `useConteoSinAsignar()` compartido entre el sidebar y la pestaña. Refresca cada 60 s, al tomar un ticket y al recibir una notificación nueva (si ya hay Realtime en `Notificaciones`).
- Si es 0, no se muestra el badge. Si es mayor que 99, muestra "99+".
- Ningún otro número se suma a ese badge.

## 5. Dashboard del Asignador (`/asignador`) en pestañas

Mantén arriba la sección **"Excepcionales pendientes"** (v3.1). Debajo, pestañas:

1. **`Sin asignar (N)`**
   - **Galería horizontal** (`flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3`). Cada tarjeta mide `w-72 shrink-0 snap-start`.
   - Orden **FIFO estricto** (`fecha_registro` ascendente). Cada tarjeta muestra su posición en la cola ("#1", "#2"…) en una esquina y *"En cola desde hace 2 días"*.
   - Botones de flecha izquierda/derecha para desplazar (ocultos en móvil, donde se desliza con el dedo) y degradados en los bordes para indicar que hay más.
   - Dentro de cada tarjeta, en el pie: selector **"Asignar a…"** (diseñadores de `fnDisenadoresTabla()`) y botón **"Tomar"** (asignárselo a sí mismo). Al asignar, toast *"AOAA0004 asignado a Ana López"*, y la tarjeta sale de la galería.
   - Solo tickets que se pueden asignar: `disenador_id IS NULL`, no excepcionales pendientes y estado no final.
2. **Una pestaña por diseñador:** `Ana López (4)`, `Luis Pérez (2)`… Viene de `fnDisenadoresTabla()`; incluye al propio Asignador, con el texto "(yo)".
   - Muestra los tickets activos de ese diseñador (los que tomó él y los que se le asignaron), con la etiqueta **"Asignado"** cuando `asignado_por_asignador`.
   - Agrupados por estado en columnas compactas: En proceso, Corrección, Retrasados y Finalizados esperando dictamen.
   - Cada tarjeta mantiene el selector **"Reasignar a…"** (con confirmación).
   - Debajo, en una sección colapsable, los aprobados y rechazados de los últimos 30 días.
   - Si hay muchos diseñadores, la barra de pestañas se desplaza horizontalmente.
- La pestaña activa se guarda en la URL (`?tab=sin-asignar` / `?tab=disenador-12`).
- Recuerda: ni en el sidebar ni en la pestaña "Asignación" hay badge de tickets nuevos (v4).

## 6. Login: banner "iTickets" estilo boleto

Divide la pantalla de inicio de sesión en dos: el **panel izquierdo decorativo** (oculto en móvil, `hidden lg:flex lg:w-1/2`) y el formulario actual a la derecha, sin cambios de lógica.

Panel izquierdo:

- **Fondo:** degradado azul institucional, con un patrón sutil de puntos o líneas.
- **Arriba:** espacio para los **logotipos institucionales** (VOAE y UNAH). Usa `public/logos/voae.svg` y `public/logos/unah.svg`; si no existen, deja un `<div>` reservado de 48 px de alto con un comentario `{/* Logos institucionales */}`.
- **Centro:** un **boleto físico** grande, ligeramente rotado, con sombra. Tiene:
  - el **talón azul con "iTickets"** en grande ("i" en menta);
  - **perforación y muescas** laterales;
  - un **talón de control** a la derecha con código de barras decorativo y "Nº 0001";
  - datos decorativos: "SOLICITUDES DE DISEÑO", "VOAE · UNAH", "ADMITE: UNA IDEA".
- **Abajo:** *"© 2026 Vicerrectoría de Orientación y Asuntos Estudiantiles – UNAH. Todos los derechos reservados."* (año con `new Date().getFullYear()`).

Código de referencia:

```tsx
export function LoginBannerTicket() {
  const anio = new Date().getFullYear()
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-10">
      {/* Patrón sutil */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]
           [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px]" />

      {/* Logos institucionales */}
      <header className="relative flex h-12 items-center gap-4">
        <img src="/logos/voae.svg" alt="VOAE" className="h-12 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <img src="/logos/unah.svg" alt="UNAH" className="h-12 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
      </header>

      {/* Boleto */}
      <div className="relative mx-auto w-full max-w-lg -rotate-3 transition-transform duration-500 hover:rotate-0">
        <div className="flex overflow-hidden rounded-3xl bg-white text-slate-800 shadow-2xl shadow-black/40">
          {/* Cuerpo con la franja azul */}
          <div className="relative flex-1">
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-8 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-100">Solicitudes de diseño</p>
              <p className="mt-1 text-6xl font-black leading-none tracking-tight">
                <span className="text-emerald-300">i</span><span className="text-white">Tickets</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 px-8 py-6 text-sm">
              <div><p className="text-[10px] uppercase tracking-widest text-slate-400">Emitido por</p><p className="font-semibold">VOAE · UNAH</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-slate-400">Admite</p><p className="font-semibold">Una idea</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-slate-400">Áreas</p><p className="font-semibold">ADH · AOAA · ADS</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-slate-400">Estado</p><p className="font-semibold text-emerald-600">En proceso</p></div>
            </div>
          </div>

          {/* Perforación + muescas */}
          <div aria-hidden className="relative w-0 border-l-2 border-dashed border-slate-300">
            <span className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-blue-900" />
            <span className="absolute -bottom-4 -left-4 h-8 w-8 rounded-full bg-blue-950" />
          </div>

          {/* Talón */}
          <div className="flex w-28 flex-col items-center justify-between bg-slate-50 py-6">
            <p className="font-mono text-xs font-bold text-blue-800 [writing-mode:vertical-rl]">Nº 0001</p>
            <div aria-hidden className="flex h-24 items-end gap-[2px]">
              {[3,1,2,1,3,2,1,1,3,1,2,3,1,2].map((w, i) => (
                <span key={i} className="h-full bg-slate-800" style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Derechos de autor */}
      <footer className="relative text-xs text-blue-200">
        © {anio} Vicerrectoría de Orientación y Asuntos Estudiantiles – UNAH. Todos los derechos reservados.
      </footer>
    </aside>
  )
}
```

- Las muescas usan el color del fondo del panel (`bg-blue-900` / `bg-blue-950`): ajústalo para que parezcan recortadas.
- **A la derecha:** el formulario actual, con `<MarcaITickets />` arriba del título "Iniciar sesión". En móvil, como el panel está oculto, muestra `<MarcaITickets />` y los logos arriba del formulario.
- Respeta `prefers-reduced-motion`: sin rotación animada si el usuario la desactivó (`motion-safe:`).

---

## 7. Al terminar

1. `npm run build` y `npm run lint` sin errores.
2. Resumen de archivos creados, modificados y eliminados.
3. Pruebas manuales:
   - El nombre **iTickets** aparece en la pestaña del navegador, el sidebar y el login. El banner del boleto se ve en escritorio y se oculta en móvil.
   - No aparece "Subárea" en ninguna pantalla.
   - Resumen y Mis solicitudes usan el boleto con franja azul, muescas y datos en columnas. En móvil, la franja queda arriba.
   - **Diseñador:**
     - "Tickets sin asignación" en orden FIFO, con "Tomar" dentro de la tarjeta.
     - Tomar un ticket: el ticket pasa a "Mis tickets" y el badge del sidebar baja en 1.
     - Si dos diseñadores toman el mismo ticket, el segundo recibe el aviso.
   - **Asignador:**
     - Galería "Sin asignar" con #1, #2… y desplazamiento.
     - Asignar un ticket a Ana: aparece en la pestaña "Ana" con la etiqueta **Asignado**, y en "Mi tablero" de Ana también con **Asignado**.
     - Un ticket que Ana tomó ella misma no lleva etiqueta.
   - El badge de "Mi tablero" = solo los tickets sin asignar que se pueden tomar.
