# keepalive-worker

Worker de Cloudflare que cada 2 días hace una petición a Supabase para que el proyecto del plan
gratuito no se pause por inactividad. Es independiente de la app (`gestion-solicitudes-voae/`) y no
depende de commits: una vez desplegado sigue corriendo solo.

## Desplegar (una sola vez)

Desde esta carpeta:

```
npx wrangler login
npx wrangler deploy
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
```

Los valores son los mismos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de la app.

## Comprobar

Abre la URL que imprime `wrangler deploy`. Debe responder `{"ok":true,"estado":204,...}`.
Las ejecuciones programadas se ven en el panel de Cloudflare → Workers → `voae-supabase-keepalive` → Logs.

## Requisito en Supabase

La función `public.keep_supabase_alive()` debe existir y el esquema `public` debe estar expuesto en la API.
