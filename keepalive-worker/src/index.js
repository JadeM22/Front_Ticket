/**
 * Mantiene activo el proyecto de Supabase del plan gratuito, que se pausa tras ~7 días sin
 * peticiones externas. Llama por la API a la función `public.keep_supabase_alive()`, así la
 * petición llega hasta la base de datos.
 *
 * Secretos (wrangler secret put): SUPABASE_URL y SUPABASE_ANON_KEY — los mismos valores que
 * VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY de la app.
 */
async function ping(env) {
  const respuesta = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/keep_supabase_alive`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  const detalle = respuesta.ok ? '' : await respuesta.text()
  return { ok: respuesta.ok, estado: respuesta.status, detalle }
}

export default {
  // Ejecución programada (ver "triggers" en wrangler.jsonc).
  async scheduled(_evento, env) {
    const resultado = await ping(env)
    console.log('keep-alive', JSON.stringify(resultado))
    // Lanzar el error hace que la ejecución aparezca como fallida en el panel de Cloudflare.
    if (!resultado.ok) throw new Error(`Supabase respondió ${resultado.estado}: ${resultado.detalle}`)
  },

  // Abrir la URL del Worker en el navegador ejecuta el mismo ping, para comprobar que funciona.
  async fetch(_peticion, env) {
    const resultado = await ping(env)
    return Response.json(resultado, { status: resultado.ok ? 200 : 502 })
  },
}
