# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"VOAE" (Vicerrectoría de Orientación y Asuntos Estudiantiles) — a request/ticket management system.
Employees submit design/communication requests (posters, social posts, event coverage, etc.), designers
pick them up and deliver, and area managers approve or request one correction, all backed by Supabase
(Postgres + Auth + Storage + an Edge Function), with every business rule enforced by triggers in the
database itself. The frontend is a thin client: it reads/writes through typed Supabase calls and only
decides what to show; **it does not re-implement state-machine or permission logic that the database
already enforces.**

Everything in Spanish end-to-end: UI copy, variable/function names in app code, and the error strings
surfaced from Postgres triggers (shown verbatim in toasts).

## Commands

The git root is one level up (`Front_Ticket/`) and holds only a stub `README.md`; the whole app lives in
`gestion-solicitudes-voae/`. Run every command below from that directory.

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — `tsc -b` (project references: `tsconfig.json` → `tsconfig.app.json` /
  `tsconfig.node.json`) then `vite build`. Must pass with zero errors before considering a change done.
- `npm run lint` — ESLint flat config (`eslint.config.js`): `@eslint/js` + `typescript-eslint` recommended +
  `react-hooks` + `react-refresh`. Must pass with zero errors/warnings.
- `npm run preview` — serve the production build locally.
- `npm run manuales` — regenerates the per-role user manuals (`.docx` + `.pdf`) from the Markdown sources
  in `docs/manuales/` via `scripts/manuales/` (`md2docx.cjs` uses `docx`; `md2pdf.mjs` uses
  `puppeteer-core`, so it needs a locally installed Chrome). Screenshots referenced by the manuals live in
  `docs/manuales/capturas/<rol>/`. Edit the `.md`, never the generated files.

There is no test runner configured. There is no dev-time way to exercise the Supabase-dependent flows
without real Supabase env vars (see below) — verification here means `build` + `lint` passing, not running
the app.

`tsconfig.app.json` is stricter than the Vite default and `tsc -b` fails on any of these:
`erasableSyntaxOnly` (no `enum`, no constructor parameter properties — use string-literal unions like the
ones in `src/types/domain.ts`), `verbatimModuleSyntax` (type-only imports must be `import type`), and
`noUnusedLocals`/`noUnusedParameters`.

## Environment

`src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Vite env files. A `.env`
holding exactly those two vars is currently **committed** (`.gitignore` only covers `*.local`); put any
personal overrides in `.env.local` instead of editing it. Only the **publishable/anon** key ever goes in
either file — it ends up in the client JS bundle shipped to every visitor. The secret/`service_role` key
must never be used in this project.

The database schema, RLS policies, Storage buckets, and the `crear-usuario` Edge Function live entirely in
Supabase and are out of scope to modify from this repo. `docs/gestion_solicitudes_voae.sql` is the original
base schema; `docs/cambios/cambios_bd_2026-10-06_v2.sql` + `docs/cambios/parte13_nombres_usuarios.sql` are
the v2 migration on top of it (días hábiles/feriados, `Adjuntos`, autoría, rol Analista — see Architecture
below). Later changes are numbered "Partes" applied in order, one at a time, in the Supabase SQL editor:
`cambios_bd_2026-10-12.sql` (Partes 1–12: area prefixes + per-area ticket `codigo` like `ADH0001`, …),
`cambios_bd_2026-10-13.sql` (13–19), `cambios_bd_2026-10-13_bitacoras.sql` (20–23),
`cambios_bd_2026-10-14_asignado.sql` (24: `asignado_por`/`fecha_asignacion`),
`cambios_bd_2026-10-14_guion_visibilidad.sql` (26–27: hides assignment columns from roles that shouldn't
see them), `cambios_bd_2026-10-23.sql` (28–35: rol "Aprobador IA" → "Validador", campus oficiales,
`TipoSolicitud.categoria`/`etiquetas_generales`/`aviso`, campo ETIQUETAS, flujo VALIDACION +
`DecisionValidacion`), plus `analista_ver_tickets.sql`. The formularios-configurables/afiches-IA changes
before Parte 28 were applied from chat and have no file here. Code comments cite these by number ("Parte 27"), so grep
`docs/cambios/` for `PARTE <n>` to find the rule a comment refers to. `docs/semilla_datos_prueba.sql` is
test seed data. All of these are kept here for reference only — `src/types/database.ts` is the authoritative, generated API
surface and is already regenerated against the live schema. Do not hand-edit `database.ts`; regenerate it
if the remote schema changes again, and when it does, grep for whatever old table/column names disappeared
to find every call site that needs updating (that's exactly how the v2 migration was done). The `supabase`
CLI is a devDependency; `supabase/.temp/linked-project.json` holds the project ref, but `--linked` fails
("Cannot find project ref"), so regenerate with
`npx supabase gen types typescript --project-id jpryccmjymiixnvgeuka --schema Seguridad --schema Solicitudes`,
written over `src/types/database.ts`. The generated `Insert` types mark DB-filled NOT NULL columns as
required (e.g. `EnvioIA.intento`/`usuario_registro`, `RevisionIA.ticket_id`/`revisor_id`); those inserts
cast to `TablesInsert<…>` with a comment rather than sending the columns. There is no local Supabase stack (`supabase/` has no `config.toml`, migrations, or
functions) — the CLI is only used against the remote project.

## Architecture

**Stack**: React 19 + TypeScript + Vite, Tailwind v4 via the `@tailwindcss/vite` plugin (no
`tailwind.config.js` — theme tokens are defined with `@theme` directly in `src/index.css`), React Router 7,
TanStack Query for all Supabase reads/writes, `sonner` for toasts, `lucide-react` for icons, `recharts` for
the Analista dashboard's charts only (everywhere else uses the hand-rolled `BarraSimple`/SVG components).

**Supabase access pattern**: both schemas (`Seguridad`, `Solicitudes`) are non-`public`, so every call is
`supabase.schema('Seguridad'|'Solicitudes').from('PascalCaseTable')...` — table names PascalCase, columns
snake_case, matching the DB exactly. All Supabase calls are centralized in `src/data/*.ts` (one file per
domain: `perfil`, `tickets`, `formularios`, `camposFormulario`, `afichesIA`, `validacion`, `entregables`, `adjuntos`, `dictamenes`, `notificaciones`,
`usuarios`, `catalogos`, `bitacora`, `estadisticas`); pages/components never call `supabase` directly, they
call a `data/` function through a TanStack Query hook. The only exceptions are `supabase.auth.*` calls in
`src/auth/*` and the `fnUsuariosNombresTabla` RPC inside `hooks/useNombresUsuarios.ts`. Row types are
derived from the generated types as `Tables<{ schema: 'Solicitudes' }, 'Ticket'>` and re-exported from the
matching `data/` file rather than redeclared by hand. **Ticket lists are never filtered by the current
user in query code** — RLS already scopes what each role can see; the frontend only groups/labels what
comes back. The one exception is the "Mis solicitudes" pages (`pages/empleado/Dashboard.tsx`,
`Solicitudes.tsx`), which filter client-side by `usuario_registro === perfil.id` because a user who is also
Analista/Diseñador/Jefe/Administrador gets other people's tickets back from the same view.

**Query cache**: `src/lib/queryClient.ts` sets `staleTime: 30s`, `retry: 1`, and no refetch on window
focus, so a mutation only shows up if it invalidates explicitly. Keys are hierarchical arrays —
`['tickets', 'estado-real']` (list; `[..., ticketId]` for one), `['tickets', 'sin-asignar-count']`,
`['catalogos', 'areas'|'tipos-solicitud'|'feriados'|'campus']`, `['catalogos', 'campos', tipoId]` (a type's
`CampoFormulario` rows), `['admin', 'usuarios'|'roles'|'bitacora'|…]`, `['estadisticas', ...filters]`,
`['nombres-usuarios']`, `['afiche-ia', ruta]` (signed URL, 50-min `staleTime`). Anything that changes a ticket must invalidate `['tickets', 'estado-real']` (prefix
match covers lists and dashboards) in addition to its own detail key, as `TicketDetail.tsx` does. The one
push-based piece is notifications: `data/notificaciones.ts#suscribirNotificaciones` opens a Supabase
Realtime channel on `Solicitudes.Notificaciones` inserts for the current user and `NotificationBell.tsx`
invalidates on each event.

**Status source of truth**: `Solicitudes.vw_TicketsEstadoReal` (typed as `TicketEstadoReal` in
`src/types/domain.ts`) is what every list, card, and dashboard queries — it has the live-computed
`estado_real` (including `"Aprobado (Automático)"` and `"Retrasado"` before any cron has run),
`horas_restantes_dictamen`, `fuera_de_plazo`, `correcciones_usadas`, plus `titulo`, `dirigido_a`, `flujo`
and `intentos_usados` (IA tickets only). It does **not** carry `tipo_solicitud_id`.
`src/data/tickets.ts#obtenerTicketCompleto()` is what the detail page actually uses — it joins the view +
base `Ticket` row + the ticket's `TipoSolicitud` (for `dias_estimados`/`dias_habiles`) + the form
(`Formularios` + `FormularioCampus`→`Campus`) + `TicketLog` + `Entregables` + `DictamenJefe` + `Adjuntos`,
and for IA tickets `EnvioIA` + `RevisionIA` (VALIDACION: `DecisionValidacion`) instead of entregables/dictamen.

**Ticket state machine lives in DB triggers, not here.** Valid transitions (`Enviado → En revisión/En
proceso`, `Finalizado → Corrección (max 1) | Aprobado`, `Corrección → Finalizado`, `Retrasado → Finalizado`
only, etc.) are enforced by Postgres triggers described in `docs/gestion_solicitudes_voae.sql`. The frontend
only decides which action buttons to show per role + `estado_real` (see `tomarTicket()` in
`src/data/tickets.ts` for the one place this matters client-side: it must *not* force `estado_id` to `'En
proceso'` when a ticket is already `Retrasado`, since that transition is invalid) and surfaces whatever
Spanish error message the trigger raises via `src/lib/errors.ts#mensajeError`.

**Configurable request forms**: no form field is hard-coded. Every request has fixed *generalidades*
(`titulo`, `fecha_evento`, `dirigido_a`, `campus_ids` — `components/formularios/Generalidades.tsx`) plus the
active `CampoFormulario` rows of its `TipoSolicitud` (`tipo_campo` ∈ TEXTO, TEXTO_LARGO, NUMERO, FECHA,
HORA, BOOLEANO, SELECCION, SELECCION_MULTIPLE, URL, ETIQUETAS), drawn by `components/formularios/FormularioDinamico.tsx`.
ETIQUETAS is a free-text list (`EtiquetasInput`; `opciones` are only suggestions, `max_longitud` applies per
item and defaults to 100, `max` is the item count; the DB dedupes case-insensitively). Per type,
`TipoSolicitud.etiquetas_generales` renames the generalidades (keys `titulo`/`fecha_evento`/`dirigido_a`/
`alcance`, e.g. "Fecha de entrega"; resolve with `validacionFormularios.ts#etiquetasGenerales` and pass them to
`Generalidades`/`DetalleFormularioVista`), `aviso` is shown highlighted above the form, and `categoria`
(`ARTE|VIDEO|DIRCOM|PROTOCOLO|OTROS`) only groups the type cards in step 1 of the wizard.
jsonb columns are normalized to `DefinicionCampo` by `lib/validacionFormularios.ts#normalizarCampo`, which
also holds the client-side validation mirroring the DB (fast feedback only — the DB message is final).
Creating a request is `fnSolicitudCrearEscalar(p_tipo_solicitud_id, p_detalle, p_excepcional)` with
`p_detalle = { titulo, fecha_evento, dirigido_a, campus_ids, respuestas: { <clave>: valor } }`; empty values
are omitted so the DB applies `valor_defecto`. The DB stores `campos_snapshot` (the active fields at send
time, same columns as `CampoFormulario`), and `DetalleFormularioVista.tsx` renders a sent ticket **from the
snapshot, never from current `CampoFormulario`**. Admins manage fields per type (`CamposTipoModal` +
`EditorCampo`: `clave`/`tipo_campo` are immutable after insert, nothing is ever deleted — `estado = false`)
and the `Campus` catalog from `pages/admin/Catalogos.tsx`. `TipoSolicitud.flujo`
(`'DISENO'|'APROBACION_IA'|'VALIDACION'`) is chosen only on create; only DISENO types can be excepcional.
Validation `min`/`max` can't be negative and `max_longitud` must be > 0 (DB check, Parte 31). Dates in forms are plain `date`/`time` — only `hoyTegucigalpaISO()`
(`lib/date.ts`) is needed as the `min` and for the "not in the past" check.

**Aprobación de afiches con IA** (`flujo = 'APROBACION_IA'`): no designer, entregables, dictamen,
excepcional or `Adjuntos` (the DB rejects them — only the poster). The requester uploads the poster to the
private `afiches-ia` bucket (`<ticket_id>/…`, ≤10 MB,
png/jpeg/webp/pdf) and inserts `EnvioIA`; a **Validador** (role formerly "Aprobador IA"; `/validador`,
`pages/validador/`)
inserts `RevisionIA` (`APROBADO`|`RECHAZADO`, comment required to reject) on the latest envío. All state
changes (Enviado → Aprobado | Corrección | Rechazado after 5 intentos; reenvío → Enviado with a new
`fecha_limite`) and notifications are done by DB triggers — the frontend never writes `estado_id` on an IA
ticket. All of it lives in `src/data/afichesIA.ts` + `components/afichesIA/`; creating an IA request is
create ticket → upload → insert `EnvioIA` (storage object removed if the insert fails), and if the upload
fails the detail page offers "Subir afiche". Asignador/Diseñador screens read tickets through
`hooks/useTickets.ts#useTicketsDiseno` (same cache, only `flujo = 'DISENO'`).

**Validación** (`flujo = 'VALIDACION'`, e.g. "Cobertura de evento"): a normal form + optional adjuntos, then
one decision by the Validador — insert into `DecisionValidacion` (`data/validacion.ts`, one row per ticket,
immutable, comment required to reject). The DB moves the ticket Enviado/Retrasado → Aprobado | Rechazado and
notifies; no designer, entregables, dictamen or corrections. The Validador's tray shows both IA posters and
pending validations; the decision is taken from `TicketDetail` (reusing `RevisarAficheModal` without
`intento`).

**Date fields**: every date input in the app is `components/ui/FechaInput.tsx` — never a raw
`<input type="date">`. It takes/emits the same `'YYYY-MM-DD'`-or-`''` string a native date input would
(`valor`/`onCambiar`), shows it as typed `DD/MM/AAAA` with an auto-inserted mask, and opens a synced calendar
popover on focus. It only emits a real, complete date (or `''` when cleared/abandoned half-typed); parsing
and masking live in `src/lib/fechaInput.ts`. Time fields follow the same contract through
`components/ui/HoraInput.tsx` (`'HH:MM'` 24h in and out, typed as 12h `hh:mm` + an a. m./p. m. toggle, 30-min
dropdown list; helpers in `src/lib/horaInput.ts`) — never a raw `<input type="time">`.

**Plazos en días hábiles + feriados**: `TipoSolicitud.dias_habiles` decides whether `fecha_limite` is
business-days-only (skipping weekends and active `Feriados` ranges) or calendar days — computed server-side
by `fnSumarDiasHabilesEscalar`/`fnTicketCalcularFechaLimiteTrigger`. The wizard previews this via
`fnFechaLimiteCalcularEscalar` (`data/formularios.ts#obtenerFechaLimiteEstimada`) before the ticket exists.
Feriados are admin-managed (`pages/admin/Feriados.tsx`) and only affect tickets created after they're
registered — there's no retroactive recalculation.

**Adjuntos (solicitante) vs. Entregables (diseñador) — don't confuse the two.** `Adjuntos` (bucket
`adjuntos`, `src/data/adjuntos.ts`) is what the *requester* attaches to their own ticket (max 10, insert-only,
blocked once the ticket is `Aprobado`, gated client-side in `TicketDetail.tsx` by
`perfil.id === estadoReal.usuario_registro`). `Entregables` (bucket `entregables`,
`src/data/entregables.ts`) is unrelated: what the *designer* delivers; the requester can also read them
(no comments, no dictamen). Both follow
the same upload→insert→rollback-on-failure pattern; `src/lib/archivos.ts` holds the shared
filename-cleaning/path-building helpers both use.

**Autoría**: `TicketLog.usuario_registro` and `UsuariosRolesLog.usuario_registro` record who made each
change; `null` always means an automated/system action, rendered as **"Sistema"**. Names are resolved via
`fnUsuariosNombresTabla()` (an Empleado can't read other users' `Usuarios` rows directly) through
`src/hooks/useNombresUsuarios.ts#nombreDe(usuarioId)` — use this hook instead of querying `Usuarios`
whenever a screen needs to show who did something (ticket history, bitácora, "creado por" on catálogos).

**Auth/profile**: `src/auth/AuthContext.tsx` + `useAuth.ts` (the hook lives in its own file, split out
from the context purely to satisfy `react-refresh/only-export-components`) tracks the Supabase session and
loads the app-level `Perfil` (`src/data/perfil.ts`, joining `Usuarios` → `Areas` + `UsuariosRoles` →
`Roles`). `AuthContext` also wires up `src/auth/useCierrePorInactividad.ts`, which signs the user out after
`MINUTOS_INACTIVIDAD` (20) minutes with no pointer/key/scroll/touch activity; the last-activity timestamp
lives in `localStorage` (not component state) specifically so every open tab shares one clock and the
countdown keeps running even with the tab closed, surviving a sleeping laptop or an overnight idle session.
Route guards compose in this order (see `src/app/router.tsx`): `RequireAuth` (has a session) →
`RequirePasswordOk` (if `debe_cambiar_password`, the DB treats the user as roleless/ticketless, so this must
be resolved before anything else) → `RequireRole` (per-route role check). `InicioRedirect` sends `/` to the
dashboard of the user's highest-ranked role (`JERARQUIA_ROLES` in `domain.ts`: Administrador > Jefe de Área
> **Asignador** > **Validador** > Diseñador > **Analista** > Empleado; landing route per role in `RUTA_POR_ROL`) and shows a dead-end screen (never a redirect loop) if the account
has no role at all. A user can hold multiple roles — the sidebar (`components/layout/Sidebar.tsx`) renders
one nav section per role the profile has, in hierarchy order. The Empleado "Nueva solicitud"/"Mis
solicitudes" pages are shared by `['Empleado','Analista','Jefe de Área']`. **Analista** additionally has its
own stats dashboard at `/analista` (also reachable by Administrador, via a "Estadísticas" nav item under its
own section — same route, same `RequireRole roles={['Analista','Administrador']}`).

**Asignador & solicitudes excepcionales**: the Asignador (`/asignador`) distributes work — assigns/reassigns
tickets to designers (`data/tickets.ts#reasignarTicket`, also allowed for Administrador; it moves
`Enviado`/`En revisión` tickets to `En proceso` in the same update) and is the *only* role that accepts or
rejects an **excepcional** request (`responderExcepcional` → `fnSolicitudExcepcionalResponderEscalar`). A
Jefe de Área files excepcionales from `/jefe/excepcional`, which reuses `AsistenteSolicitud` with the
`excepcional` prop; the difference is a shorter minimum event date computed server-side
(`fnFechaEventoMinimaEscalar`, `p_excepcional`) and the `es_excepcional` flag on the ticket. Who can see a
ticket's designer/assigner is decided in the DB (Parte 27 nulls those view columns);
`lib/permisos.ts#puedeVerAsignacion` only stops the UI from rendering "Sin asignar" to roles that get nulls.

**Horario hábil**: business hours (Mon–Fri 8:00–16:00, excluding feriados) are decided by the DB
(`fnEsHorarioHabilEscalar`), never the browser clock. Read it through `hooks/useHorarioHabil.ts` (shared
query key `['horario-habil']`, polled every 60 s) — used by the request wizard, the dictamen countdown
(`CronometroDictamen`), the Jefe dashboard and `TicketDetail`.

**Analista stats dashboard** (`src/pages/analista/Dashboard.tsx`): the only screen built on `recharts`
instead of the hand-rolled `BarraSimple`. Data comes from one RPC, `fnEstadisticasTicketsTabla`
(`src/data/estadisticas.ts`), with `desde`/`hasta`/`areaId`/`tipoSolicitudId` sent to the server and
`estado`/`disenador` filtered client-side over the result (the RPC doesn't take those). All filters —
including the date-range shortcut — round-trip through the URL query string via `useSearchParams` so the
view is shareable; `calcularRango()` derives `desde`/`hasta` from the shortcut key every render rather than
storing computed dates, so changing "hoy" never needs an invalidation. The ticket id in the detail table links
to `/tickets/:id` for both roles; whether an Analista actually gets the ticket back depends on the `Ticket`
SELECT policy in Supabase (`docs/cambios/analista_ver_tickets.sql` is the policy that grants it). Exporting
the filtered table goes through `src/lib/exportar.ts`, which defines columns once (`ColumnaExportar<T>`) and
feeds both `exportarCSV` (wrapping `lib/csv.ts#descargarCsv`, BOM-prefixed UTF-8 so Excel renders tildes)
and `exportarPDF` (`jspdf` + `jspdf-autotable`, landscape) — reuse it rather than building another
exporter if another screen needs one.

**Ticket history visibility**: on `TicketDetail.tsx`, only Analista and Administrador see the full
`TicketLog` audit trail (rendered via `Timeline`); every other role sees just the simplified `Stepper`
progress bar (`lib/progresoTicket.ts#pasosProgresoTicket`) for the same ticket. Both read from the same
`obtenerTicketCompleto()` data — this is a display-only split, not a different query or RLS rule.

**Entregables (deliverables)**: uploads go through the private `entregables` Storage bucket. Helpers in
`src/lib/entregables.ts` build the required path shape (`${ticketId}/${uuid}-${cleanName}`) and infer
`tipo_entregable` from MIME type; `src/data/entregables.ts` does upload → insert → **rollback the storage
object if the DB insert fails**. `disenador_id` is always passed explicitly on insert even though the
prompt spec implied the DB sets it — the trigger actually validates `NEW.disenador_id` has the `Diseñador`
role, so it must already be present when the trigger runs.

**Routing structure**: `src/app/router.tsx` is the single place route trees, guards, and layout nesting are
defined — check it first when adding a page or changing who can see what. Pages are grouped by role under
`src/pages/{empleado,disenador,jefe,asignador,validador,admin,analista}/`; `src/pages/TicketDetail.tsx` is shared across all roles
(visibility is RLS's job, not a route guard's — if the query returns nothing, the page just shows an empty
state).

**Visual identity**: color/font tokens are defined once via Tailwind v4's `@theme` block in
`src/index.css` (institutional blue + mint accent palette, `Plus Jakarta Sans` / `JetBrains Mono` from
Google Fonts) — reuse those tokens (`bg-azul-noche`, `text-menta-profundo`, etc.) rather than introducing
new colors. `EstadoChip.tsx` is the single mapping from `estado_real` string to color/icon; update it there
if a new status is ever added instead of duplicating the color logic elsewhere.

## Deployment

Static SPA deploy to Cloudflare via `wrangler.jsonc` in `gestion-solicitudes-voae/` (not the git root) (`assets.directory: "./dist"`,
`not_found_handling: "single-page-application"`). No server-side code; the build output is pure static
assets plus client-side calls to Supabase.
