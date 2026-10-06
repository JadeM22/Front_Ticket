# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is "VOAE" (gestion-solicitudes-voae), a request/ticket management frontend. The project is at an early
scaffolding stage: the Vite/React template files (`src/App.tsx`, `src/App.css`) are still the default
starter content and have not yet been replaced with real UI. `src/lib/entregables.ts` is an empty stub.
The substantial part of the codebase so far is the Supabase client wiring and the generated database types
in `src/types/database.ts`, which fully describe the intended domain model — read that file first when
implementing any feature, since it defines the schemas, tables, views, and RPC functions the UI will need
to call.

## Commands

- `npm run dev` — start the Vite dev server with HMR.
- `npm run build` — type-check via `tsc -b` (project references in `tsconfig.json` →
  `tsconfig.app.json` / `tsconfig.node.json`), then build with Vite.
- `npm run lint` — run ESLint (flat config in `eslint.config.js`) over the whole project.
- `npm run preview` — serve the production build locally.

There is no test runner configured yet.

## Architecture

- **Stack**: React 19 + TypeScript, built with Vite, styled with Tailwind CSS v4 (loaded via the
  `@tailwindcss/vite` plugin in `vite.config.ts`, imported with `@import "tailwindcss";` in
  `src/index.css` — there is no `tailwind.config.js`). Routing dependency `react-router-dom` is installed
  but not yet wired up anywhere.
- **Backend**: Supabase (Postgres + Auth). The client is created once in `src/lib/supabase.ts` via
  `createClient<Database>(...)`, typed against `Database` from `src/types/database.ts`. It reads
  `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — these must be supplied through a local
  `.env` (not committed; no `.env.example` exists yet).
- **Database types**: `src/types/database.ts` is generated output (Supabase CLI style — do not hand-edit
  table shapes; regenerate instead if the schema changes). It defines two Postgres schemas:
  - **`Seguridad`** (auth/access control): `Areas`, `Roles`, `Usuarios` (linked to Supabase auth via
    `auth_id`, belongs to an `Areas`), `UsuariosRoles` (many-to-many join), `UsuariosRolesLog` (audit
    trail), plus scalar RPC functions like `fnUsuarioActualIdEscalar` / `fnUsuarioActualTieneRolEscalar`
    for "current user" and role-check logic — prefer calling these via `supabase.schema('Seguridad').rpc(...)`
    over reimplementing the checks client-side.
  - **`Solicitudes`** (the ticket/request workflow): `Ticket` is the central entity (status `estado_id`,
    deadline `fecha_limite`, assigned designer `disenador_id`, linked `Formularios` and `TipoSolicitud`).
    Each `Ticket` has one `Formularios` row, which fans out into a type-specific form table
    (`FormularioAfiche`, `FormularioAviso`, `FormularioComunicado`, `FormularioCoberturaEventos`,
    `FormularioEdicionFotografica`, `FormularioPublicacionRedesSociales`) selected by
    `TipoSolicitud`/`tipo_solicitud_id` — when adding a new request type, add both a `TipoSolicitud` row and
    a corresponding `FormularioX` table/type. Other tables: `Entregables` (versioned deliverables per
    ticket), `DictamenJefe` (supervisor approve/reject decisions), `Estado` (status lookup),
    `Notificaciones`, `TicketLog` (change history). The view `vw_TicketsEstadoReal` pre-joins a ticket's
    computed real-time status (`estado_real`, `fuera_de_plazo`, `horas_restantes_dictamen`, etc.) and is
    generally what list/dashboard views should query instead of re-deriving that logic. Key RPCs:
    `fnSolicitudCrearEscalar` (create a request from a JSON payload + type id),
    `fnAprobarTicketsAutomaticamente` / `fnVerificarTicketsRetrasados` (batch status maintenance),
    `fnTicketIdDesdeRutaEscalar` (resolve a ticket id from a storage path).
  - Both schemas are non-`public`, so Supabase calls must specify the schema explicitly, e.g.
    `supabase.schema('Solicitudes').from('Ticket')...`.
  - Use the exported helper generics (`Tables<...>`, `TablesInsert<...>`, `TablesUpdate<...>`, `Enums<...>`)
    from `src/types/database.ts` for typing query results/payloads instead of writing ad hoc interfaces.
