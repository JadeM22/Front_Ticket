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

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — `tsc -b` (project references: `tsconfig.json` → `tsconfig.app.json` /
  `tsconfig.node.json`) then `vite build`. Must pass with zero errors before considering a change done.
- `npm run lint` — ESLint flat config (`eslint.config.js`): `@eslint/js` + `typescript-eslint` recommended +
  `react-hooks` + `react-refresh`. Must pass with zero errors/warnings.
- `npm run preview` — serve the production build locally.

There is no test runner configured. There is no dev-time way to exercise the Supabase-dependent flows
without a real `.env.local` (see below) — verification here means `build` + `lint` passing, not running
the app.

## Environment

`src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.local` (gitignored
via the `*.local` pattern). Only the **publishable/anon** key ever goes here — it ends up in the client JS
bundle shipped to every visitor. The secret/`service_role` key must never be used in this project.

The database schema, RLS policies, Storage buckets, and the `crear-usuario` Edge Function live entirely in
Supabase and are out of scope to modify from this repo. `docs/gestion_solicitudes_voae.sql` is the original
base schema; `docs/cambios/cambios_bd_2026-10-06_v2.sql` + `docs/cambios/parte13_nombres_usuarios.sql` are
the v2 migration on top of it (días hábiles/feriados, `Adjuntos`, autoría, rol Analista — see Architecture
below). Both are kept here for reference only — `src/types/database.ts` is the authoritative, generated API
surface and is already regenerated against the live schema. Do not hand-edit `database.ts`; regenerate it
if the remote schema changes again, and when it does, grep for whatever old table/column names disappeared
to find every call site that needs updating (that's exactly how the v2 migration was done).

## Architecture

**Stack**: React 19 + TypeScript + Vite, Tailwind v4 via the `@tailwindcss/vite` plugin (no
`tailwind.config.js` — theme tokens are defined with `@theme` directly in `src/index.css`), React Router 7,
TanStack Query for all Supabase reads/writes, `sonner` for toasts, `lucide-react` for icons, `recharts` for
the Analista dashboard's charts only (everywhere else uses the hand-rolled `BarraSimple`/SVG components).

**Supabase access pattern**: both schemas (`Seguridad`, `Solicitudes`) are non-`public`, so every call is
`supabase.schema('Seguridad'|'Solicitudes').from('PascalCaseTable')...` — table names PascalCase, columns
snake_case, matching the DB exactly. All Supabase calls are centralized in `src/data/*.ts` (one file per
domain: `perfil`, `tickets`, `formularios`, `entregables`, `adjuntos`, `dictamenes`, `notificaciones`,
`usuarios`, `catalogos`, `bitacora`, `estadisticas`); pages/components never call `supabase` directly, they
call a `data/` function through a TanStack Query hook. **Ticket lists are never filtered by the current
user in query code** — RLS already scopes what each role can see; the frontend only groups/labels what
comes back.

**Status source of truth**: `Solicitudes.vw_TicketsEstadoReal` (typed as `TicketEstadoReal` in
`src/types/domain.ts`) is what every list, card, and dashboard queries — it has the live-computed
`estado_real` (including `"Aprobado (Automático)"` and `"Retrasado"` before any cron has run),
`horas_restantes_dictamen`, `fuera_de_plazo`, `correcciones_usadas`. It does **not** carry the type's
`formulario` code or `tipo_solicitud_id`. `src/data/tickets.ts#obtenerTicketCompleto()` is what the detail
page actually uses — it joins the view + base `Ticket` row + the ticket's `TipoSolicitud` (needed purely to
get `formulario`/`dias_estimados`/`dias_habiles`) + the type-specific `FormularioX` detail + `TicketLog` +
`Entregables` + `DictamenJefe` + `Adjuntos`.

**Ticket state machine lives in DB triggers, not here.** Valid transitions (`Enviado → En revisión/En
proceso`, `Finalizado → Corrección (max 1) | Aprobado`, `Corrección → Finalizado`, `Retrasado → Finalizado`
only, etc.) are enforced by Postgres triggers described in `docs/gestion_solicitudes_voae.sql`. The frontend
only decides which action buttons to show per role + `estado_real` (see `tomarTicket()` in
`src/data/tickets.ts` for the one place this matters client-side: it must *not* force `estado_id` to `'En
proceso'` when a ticket is already `Retrasado`, since that transition is invalid) and surfaces whatever
Spanish error message the trigger raises via `src/lib/errors.ts#mensajeError`.

**Per-type request forms**: which form a `TipoSolicitud` uses is picked by its `formulario` column
(`'ARTE'|'VIDEO'|'DIRCOM'|'PROTOCOLO'|'GENERICO'`) — **never by the type's name**; an admin can add a new
`TipoSolicitud` row pointing at an existing `formulario` code and it works with zero code changes. Each
code fans out 1:1 into `FormularioArte`/`FormularioVideo`/`FormularioDircom`/`FormularioProtocolo`/
`FormularioGenerico`. Shapes live in `src/types/domain.ts` (`DetalleArte`/`DetalleVideo`/etc., union
`DetalleFormulario`), editable fields in `src/components/formularios/campos/*.tsx` (one component per
code, barrel-exported from `campos/index.ts`), defaults + client-side validation in
`src/lib/validacionFormularios.ts`, read-only rendering in `DetalleFormularioVista.tsx`. Creating a request
goes through `fnSolicitudCrearEscalar` with the whole detail object as JSON
(`src/data/formularios.ts#crearSolicitud`) — the DB does the real validation (including rejecting any of
the 4 known date fields if they're in the past); the frontend's job is just payload shape + fast feedback.
Unlike the pre-migration schema, these forms use plain `date`/`time` columns (not `timestamptz`), so there's
no timezone-offset conversion needed when submitting — only `hoyTegucigalpaISO()` (`lib/date.ts`) as the
`min` on every date input and for the "not in the past" client-side check.

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
`src/data/entregables.ts`) is unrelated: what the *designer* delivers, unchanged from before. Both follow
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
`Roles`). Route guards compose in this order (see `src/app/router.tsx`): `RequireAuth` (has a session) →
`RequirePasswordOk` (if `debe_cambiar_password`, the DB treats the user as roleless/ticketless, so this must
be resolved before anything else) → `RequireRole` (per-route role check). `InicioRedirect` sends `/` to the
dashboard of the user's highest-ranked role (`JERARQUIA_ROLES` in `domain.ts`: Administrador > Jefe de Área
> Diseñador > **Analista** > Empleado) and shows a dead-end screen (never a redirect loop) if the account
has no role at all. A user can hold multiple roles — the sidebar (`components/layout/Sidebar.tsx`) renders
one nav section per role the profile has, in hierarchy order. **Analista** reuses the Empleado "Nueva
solicitud"/"Mis solicitudes" pages (both routes allow `['Empleado','Analista']`) plus its own stats
dashboard at `/analista` (also reachable by Administrador, via a "Estadísticas" nav item under its own
section — same route, same `RequireRole roles={['Analista','Administrador']}`).

**Analista stats dashboard** (`src/pages/analista/Dashboard.tsx`): the only screen built on `recharts`
instead of the hand-rolled `BarraSimple`. Data comes from one RPC, `fnEstadisticasTicketsTabla`
(`src/data/estadisticas.ts`), with `desde`/`hasta`/`areaId`/`tipoSolicitudId` sent to the server and
`estado`/`disenador` filtered client-side over the result (the RPC doesn't take those). All filters —
including the date-range shortcut — round-trip through the URL query string via `useSearchParams` so the
view is shareable; `calcularRango()` derives `desde`/`hasta` from the shortcut key every render rather than
storing computed dates, so changing "hoy" never needs an invalidation. The ticket id in the detail table is
only a link when `tieneRol('Administrador')` — an Analista can see aggregate stats but not another user's
ticket content.

**Entregables (deliverables)**: uploads go through the private `entregables` Storage bucket. Helpers in
`src/lib/entregables.ts` build the required path shape (`${ticketId}/${uuid}-${cleanName}`) and infer
`tipo_entregable` from MIME type; `src/data/entregables.ts` does upload → insert → **rollback the storage
object if the DB insert fails**. `disenador_id` is always passed explicitly on insert even though the
prompt spec implied the DB sets it — the trigger actually validates `NEW.disenador_id` has the `Diseñador`
role, so it must already be present when the trigger runs.

**Routing structure**: `src/app/router.tsx` is the single place route trees, guards, and layout nesting are
defined — check it first when adding a page or changing who can see what. Pages are grouped by role under
`src/pages/{empleado,disenador,jefe,admin}/`; `src/pages/TicketDetail.tsx` is shared across all roles
(visibility is RLS's job, not a route guard's — if the query returns nothing, the page just shows an empty
state).

**Visual identity**: color/font tokens are defined once via Tailwind v4's `@theme` block in
`src/index.css` (institutional blue + mint accent palette, `Plus Jakarta Sans` / `JetBrains Mono` from
Google Fonts) — reuse those tokens (`bg-azul-noche`, `text-menta-profundo`, etc.) rather than introducing
new colors. `EstadoChip.tsx` is the single mapping from `estado_real` string to color/icon; update it there
if a new status is ever added instead of duplicating the color logic elsewhere.

## Deployment

Static SPA deploy to Cloudflare via `wrangler.jsonc` at the repo root (`assets.directory: "./dist"`,
`not_found_handling: "single-page-application"`). No server-side code; the build output is pure static
assets plus client-side calls to Supabase.
