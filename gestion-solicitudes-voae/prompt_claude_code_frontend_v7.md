# Tarea: frontend v7. Login, gráficas, búsqueda en "Mis solicitudes", códigos con guion y asignación oculta al empleado

Proyecto: **React + Vite + TypeScript + Tailwind v4 + Supabase** (iTickets). Las versiones v3.1 a v6 ya están implementadas.

## Reglas obligatorias

- **NO modifiques la base de datos**, no ejecutes SQL y no uses la llave `service_role`/secret.
- Lee antes `docs/cambios/cambios_bd_2026-10-14_guion_visibilidad.sql` (Partes 26 y 27). `src/types/database.ts` ya está regenerado.
- Usa `.schema('Solicitudes')` / `.schema('Seguridad')`. Muestra siempre el `error.message` de Supabase en un toast.
- Presenta un plan corto y luego impleméntalo. Al terminar, `npm run build` y `npm run lint` deben pasar sin errores.

---

## 1. Login: texto del boleto

En `LoginBannerTicket` (o el componente del boleto del login), cambia el texto superior de la franja azul. Debe decir **exactamente**:

```
SOLICITUDES DE DISEÑO Y COMUNICACIÓN
```

- Mantén el estilo (`uppercase`, `tracking` amplio, color azul claro).
- Como el texto es más largo, ajusta para que no se corte ni se salga del boleto: reduce el `tracking` (por ejemplo `tracking-[0.2em]`) y permite dos líneas con `leading-snug`. En pantallas grandes debe verse en una sola línea si cabe.

## 2. Estadísticas: etiquetas del eje con espacio

En la gráfica **"Por tipo de solicitud"** (y en cualquier gráfica con nombres largos: área, diseñador), las etiquetas se amontonan. Solución:

1. **Convierte la gráfica de tipos en barras horizontales**, con los nombres en el eje Y. Así se leen completos.
2. **Altura dinámica**, según la cantidad de categorías.
3. **Componente de tick** que parte el texto en hasta 2 líneas.

```tsx
const alto = Math.max(260, datos.length * 44)   // 44 px por barra

<ResponsiveContainer width="100%" height={alto}>
  <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 32, bottom: 8, left: 8 }} barCategoryGap="28%">
    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
    <XAxis type="number" allowDecimals={false} tickMargin={8} />
    <YAxis
      type="category"
      dataKey="tipo"
      width={190}
      interval={0}
      tickLine={false}
      tick={<TickEnvuelto ancho={180} />}
    />
    <Tooltip />
    <Bar dataKey="cantidad" radius={[0, 6, 6, 0]} />
  </BarChart>
</ResponsiveContainer>
```

```tsx
// Parte una etiqueta larga en máximo 2 líneas (con "…" si sobra)
function TickEnvuelto({ x, y, payload, ancho = 180 }: any) {
  const palabras = String(payload.value).split(' ')
  const lineas: string[] = []
  let actual = ''
  const maxCar = Math.floor(ancho / 7)            // ~7 px por carácter a 12 px
  for (const p of palabras) {
    if ((actual + ' ' + p).trim().length > maxCar) { lineas.push(actual.trim()); actual = p }
    else actual += ' ' + p
  }
  lineas.push(actual.trim())
  const visibles = lineas.slice(0, 2)
  if (lineas.length > 2) visibles[1] = visibles[1].replace(/.{0,1}$/, '…')
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{payload.value}</title>
      {visibles.map((l, i) => (
        <text key={i} x={-8} y={(i - (visibles.length - 1) / 2) * 14} dy={4}
              textAnchor="end" className="fill-slate-600 text-[12px]">{l}</text>
      ))}
    </g>
  )
}
```

**Para las gráficas que sigan siendo verticales** (por mes, por estado), en el eje X usa:

- `interval={0}`, `tickMargin={10}` y `height={60}`;
- si hay más de 6 categorías, `angle={-30}` y `textAnchor="end"`;
- en `<BarChart>`, `barCategoryGap="25%"` y `margin={{ bottom: 24 }}`.

**En móvil,** usa `width={130}` en el YAxis y `ancho={120}` en el tick.

**Comprueba** que "Grabación y edición de videos, spots o cortinas institucionales", "Promociones (Licitaciones)" y "Banner tradicional" se lean sin encimarse.

## 3. "Mis solicitudes": búsqueda con lupa

Arriba de la lista, junto a los filtros "Todos los estados" / "Todos los tipos", agrega un **buscador con lupa**:

```tsx
<label className="relative block w-full sm:max-w-sm">
  <span className="sr-only">Buscar</span>
  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  <input
    type="search"
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
    placeholder="Buscar por código, tipo, solicitante o área…"
    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm
               placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
  />
</label>
```

- **Filtra** sobre los datos ya cargados, junto con los filtros de estado y tipo, por:
  - código (`codigo`);
  - tipo de solicitud (`tipo_solicitud`);
  - solicitante (`solicitante`);
  - área (`area`).
- **Normaliza** el texto: sin mayúsculas, sin tildes y **sin guiones ni espacios** en el código. Así "adh0001", "ADH-0001", "adh 1" y "0001" encuentran `ADH-0001`.

```ts
const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const soloCodigo = (s: string) => normalizar(s).replace(/[\s-]/g, '')

const filtrados = solicitudes.filter((t) => {
  if (!busqueda.trim()) return true
  const q = normalizar(busqueda)
  return soloCodigo(t.codigo).includes(soloCodigo(busqueda))
      || [t.tipo_solicitud, t.solicitante, t.area].some((v) => v && normalizar(v).includes(q))
})
```

- **Espera 250 ms** después de que el usuario deja de escribir antes de filtrar (debounce), y guarda la búsqueda en la URL (`?q=`).
- Muestra *"N de M solicitudes"* y, si no hay resultados, *"No se encontraron solicitudes para «texto»"*, con un botón **Limpiar búsqueda**.
- Aplica la **misma normalización** en todos los buscadores existentes: Estadísticas, Bitácoras, Historial del jefe y Asignador. Extráela a `src/lib/buscar.ts`.

## 4. Códigos con guion

La base ya genera y guarda los códigos **con guion**: `ADH-0001`, `AOAA-0001`, `ADS-0001`. Los tickets existentes ya se convirtieron.

- **No construyas** códigos en el frontend: muestra siempre `codigo` tal como viene de la base.
- Revisa que nada dependa del formato anterior: expresiones regulares (`/^[A-Z]+\d+$/`), anchos fijos que corten el texto (por ejemplo `w-20` en el badge del código) y nombres de archivo en las exportaciones. El badge debe mostrar `AOAA-0001` completo, con `whitespace-nowrap`.
- Ejemplos y placeholders: *"ej. ADH-0001"*.

## 5. Asignación visible solo para el equipo de diseño

La base (Parte 27) ahora devuelve **vacíos** estos datos de `vw_TicketsEstadoReal` cuando quien consulta **no** es Diseñador, Asignador, Administrador o Jefe del área del ticket: `disenador_id`, `disenador`, `asignado_por`, `asignado_por_nombre` y `fecha_asignacion`. Además, `asignado_por_asignador` llega en `false`. El frontend debe **ocultar la asignación**, no mostrar "Sin asignar".

**Helper:**

```ts
// true para Diseñador, Asignador, Administrador y Jefe de Área
export const puedeVerAsignacion = (roles: string[]) =>
  roles.some((r) => ['Diseñador', 'Asignador', 'Administrador', 'Jefe de Área'].includes(r))
```

**Rol Empleado y Analista**, cuando ven sus propias solicitudes:

- En `TicketBoleto` (Resumen y Mis solicitudes), **quita la columna "Diseñador"** (`mostrarDisenador={false}`). Que no aparezcan "Sin asignar", "Asignado" ni el nombre.
- En el **detalle del ticket**, quita:
  - el campo "Diseñador";
  - la etiqueta "Asignado";
  - la leyenda "Asignado por…".
- En el **historial (línea de tiempo)**:
  - Oculta los registros que solo dicen `Diseñador: … -> …`.
  - En los registros mixtos (por ejemplo `Estado: … ; Diseñador: …`), quita la parte del diseñador.
  - Cuando el autor del cambio es otra persona, muestra **"Equipo de diseño"** en lugar de su nombre. El empleado sí ve su propio nombre y "Sistema".
- **Filtros y exportaciones** de "Mis solicitudes": sin columna ni filtro de diseñador.
- Lo que **sí** ve: el código, el tipo, las fechas y el **estado** (por ejemplo, "En proceso").

**Roles Diseñador y Asignador** mantienen todo visible:

- el nombre del diseñador asignado;
- la etiqueta **"Asignado"** cuando `asignado_por_asignador`;
- la leyenda **"Asignado por {asignado_por_nombre} el {fecha_asignacion}"**, en el detalle y en el tooltip de la etiqueta.

**Jefe de Área y Administrador** también ven el diseñador, porque el jefe dictamina su trabajo y el admin administra. Si el usuario tiene varios roles (por ejemplo, Jefe + Diseñador), basta con que uno lo permita.

**Notificaciones:** la base ya no le avisa al solicitante cuando su ticket cambia de diseñador. No muestres nada al respecto en la interfaz del Empleado.

---

## Al terminar

1. `npm run build` y `npm run lint` sin errores.
2. Resumen de archivos modificados.
3. Pruebas manuales:
   - El login muestra "SOLICITUDES DE DISEÑO Y COMUNICACIÓN" sin cortarse, en escritorio y en tablet.
   - En Estadísticas, la gráfica por tipo es horizontal y todos los nombres se leen.
   - En Mis solicitudes, buscar "adh1", "ADH-0001", "afiche" o el nombre del área filtra correctamente.
   - Los códigos se ven como `AOAA-0001` en tarjetas, detalle, notificaciones, bitácoras y exportaciones.
   - Como Empleado: no aparece ningún dato de asignación (ni diseñador, ni "Sin asignar", ni "Asignado"), ni en el historial.
   - Como Diseñador o Asignador: se ven el diseñador, la etiqueta "Asignado" y "Asignado por … el …".
