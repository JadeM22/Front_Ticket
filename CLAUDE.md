# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The repository root holds this file, a stub `README.md`, and two independent deployables:

- `gestion-solicitudes-voae/` — the entire application (a React + Supabase ticket system for VOAE). Every
  `npm` command must be run from there, not from the root.
- `keepalive-worker/` — a standalone Cloudflare Worker (no `package.json`, deployed with `npx wrangler
  deploy` from its own folder) whose cron (`0 6 */2 * *`) pings Supabase so the free-tier project isn't
  paused. It calls `public.keep_supabase_alive()` using `SUPABASE_URL`/`SUPABASE_ANON_KEY` Worker secrets.
  It shares no code with the app; see its `README.md`.

Full guidance (commands, environment, architecture, deployment) is in that directory's own file:

@gestion-solicitudes-voae/CLAUDE.md
