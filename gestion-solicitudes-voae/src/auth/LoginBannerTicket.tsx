export function LoginBannerTicket() {
  const anio = new Date().getFullYear()

  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-azul-noche via-azul-institucional to-azul-noche text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-10">
      {/* Patrón sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px]"
      />

      {/* Logos institucionales: no existen todavía en public/logos/, así que se reserva el espacio */}
      <header className="relative flex h-12 items-center gap-4">
        {/* Logos institucionales */}
      </header>

      {/* Boleto */}
      <div className="relative mx-auto w-full max-w-lg motion-safe:-rotate-3 motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:rotate-0">
        <div className="flex overflow-hidden rounded-3xl bg-white text-tinta shadow-2xl shadow-black/40">
          {/* Cuerpo con la franja azul */}
          <div className="relative flex-1">
            <div className="bg-gradient-to-r from-azul-institucional to-azul-medio px-8 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">Solicitudes de diseño</p>
              <p className="mt-1 text-5xl font-black leading-none tracking-tight sm:text-6xl">
                <span className="text-menta">i</span>
                <span className="text-white">Tickets</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 px-8 py-6 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-tinta-suave">Emitido por</p>
                <p className="font-semibold">VOAE · UNAH</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-tinta-suave">Admite</p>
                <p className="font-semibold">Una idea</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-tinta-suave">Áreas</p>
                <p className="font-semibold">ADH · AOAA · ADS</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-tinta-suave">Estado</p>
                <p className="font-semibold text-menta-profundo">En proceso</p>
              </div>
            </div>
          </div>

          {/* Perforación + muescas */}
          <div aria-hidden className="relative w-0 border-l-2 border-dashed border-azul-niebla">
            <span className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-azul-noche" />
            <span className="absolute -bottom-4 -left-4 h-8 w-8 rounded-full bg-azul-noche" />
          </div>

          {/* Talón de control */}
          <div className="flex w-28 flex-col items-center justify-between bg-azul-niebla py-6">
            <p className="font-mono text-xs font-bold text-azul-institucional [writing-mode:vertical-rl]">Nº 0001</p>
            <div aria-hidden className="flex h-24 items-end gap-[2px]">
              {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2].map((ancho, indice) => (
                <span key={indice} className="h-full bg-azul-noche" style={{ width: ancho }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Derechos de autor */}
      <footer className="relative text-xs text-white/60">
        © {anio} Vicerrectoría de Orientación y Asuntos Estudiantiles – UNAH. Todos los derechos reservados.
      </footer>
    </aside>
  )
}
