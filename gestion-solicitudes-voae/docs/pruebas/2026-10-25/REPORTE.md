# Reporte de pruebas E2E — iTickets (PARCIAL)

- **Fecha:** 25/10/2026 (domingo, base en "modo pruebas", horario hábil desactivado)
- **Entorno:** https://front-ticket.pages.dev (push `f674ab1`), base real
- **Herramienta:** Puppeteer (`puppeteer-core` + Chrome local), un contexto aislado por usuario, sin interfaz.
- **Estado:** pruebas detenidas a pedido durante la 12.3 y reanudadas después. Ya están verificadas también las pruebas ⏱, con el SQL corrido en el SQL Editor. **Solo quedan las pruebas ☾** (ver sección 6).
- Las capturas están en `capturas/`; ninguna muestra contraseñas (el campo es de tipo password).

## 1. Resumen por fase

| Fase | ✅ | ❌ | ⚠️ | Pendiente |
|---|---|---|---|---|
| 1 Login y marca | 4 | 1 | 1 | — |
| 2 Administración | 11 | 4 | 7 | — |
| 3 Nueva solicitud | 9 | 2 | 6 | 3.11 ☾ |
| 4 Visibilidad | 3 | 3 | 1 | — |
| 5 Diseño | 8 | 1 | 2 | 5.9 ☾, 5.10 ☾ |
| 6 Asignador / excepcionales | 4 | 0 | 4 | — |
| 7 Afiches IA | 7 | 2 | 1 | — |
| 8 Cobertura | 4 | 1 | 0 | — |
| 9 Automatizaciones | 3 | 0 | 1 | — |
| 10 Desactivar diseñador | 2 | 2 | 0 | — |
| 11 Bitácoras / estadísticas / notificaciones | 3 | 1 | 2 | — |
| 12 Móvil / archivos / robustez | 4 | 0 | 1 | — |

## 2. Errores (de más a menos grave)

### E-01 · Alta · 4.2 · EMP-A y JEFE-A — Los datos del diseñador llegan al navegador de quien no debe verlos
- **Pasos:** como EMP-A o JEFE-A, abre `/tickets/22` (AOAA-0021) y revisa la pestaña Network, o consulta la API con la sesión.
- **Qué pasó:** la pantalla no muestra nada, pero:
  1. `Solicitudes.Ticket` devuelve `disenador_id = 11` y `asignado_por = 11`.
  2. `TicketLog.descripcion_cambio` trae el nombre en texto: `Estado: "Enviado" -> "En proceso"; Diseñador: (sin asignar) -> Cristobal Diseñador`, y `usuario_registro = 11`.
  3. `fnUsuariosNombresTabla` traduce el 11 a "Cristobal Diseñador" para cualquier usuario.
- **Qué se esperaba:** que nadie fuera del equipo de diseño pueda obtener el diseñador (la vista sí lo devuelve en NULL, Parte 27).
- **Causa probable:**
  - **Base de datos:** las políticas de lectura de `Ticket` y `TicketLog` no ocultan esas columnas ni el texto del log.
  - **Frontend:** `data/tickets.ts#obtenerTicketCompleto` pide `TicketLog` y la fila base de `Ticket` para todos los roles, aunque solo Analista y Administrador ven el Timeline.
- **Propuesta:**
  - En la base: columnas nulas o una vista segura para los roles sin acceso a la asignación, y en el log escribir "Equipo de diseño".
  - En el frontend: no pedir `TicketLog` cuando el rol no ve el Timeline.

### E-02 · Alta · 10.2 · DIS-1 — No se puede tomar una excepcional que fue liberada
- **Pasos:**
  1. ASIG acepta AOAA-0028 y la asigna a DIS-2.
  2. DIS-2 entrega y JEFE-A pide corrección.
  3. ADMIN desactiva a DIS-2: AOAA-0028 queda en Corrección y "Sin asignar".
  4. DIS-1 abre `/tickets/32` y pulsa "Tomar ticket".
- **Qué pasó:**
  - El toast dice "Otro diseñador ya tomó AOAA-0028." y el ticket sigue sin asignar.
  - Además, el ticket no aparece en "Tickets sin asignación" del tablero.
- **Qué se esperaba:** que DIS-1 lo tome sin errores.
- **Causa probable:**
  - **Base de datos:** la política `polTicketActualizarDisenador` (Parte 17) exige `not es_excepcional`, así que el UPDATE afecta 0 filas.
  - **Frontend:** `tomarTicket()` (`data/tickets.ts:149`) interpreta 0 filas como "otro lo tomó".
  - **Frontend:** `pages/disenador/Dashboard.tsx:83` y `contarTicketsSinAsignar` excluyen todas las excepcionales, no solo las pendientes.
- **Propuesta:**
  - O se permite en la base tomar excepcionales ACEPTADAS sin diseñador y se muestran en el tablero filtrando solo `excepcional_estado = 'PENDIENTE'`;
  - o se oculta "Tomar ticket" en las excepcionales y se muestra un mensaje correcto ("Solo el Asignador puede reasignarla").
- **Captura / red:** el PATCH a `Ticket` devuelve 200 con `[]`.

### E-03 · Media · 2.8 · ADMIN — "Días estimados" se ajusta a 10 sin avisar
- **Pasos:** en Crear tipo, escribe 5 en "Días estimados" y pulsa Guardar.
- **Qué pasó:** se crea con 10 días y no aparece ningún aviso.
- **Qué se esperaba:** el rechazo con el mensaje de la base.
- **Causa probable (Frontend):** `InputNumero` ajusta al `min` (10) en el blur, antes de que llegue el clic.
- **Propuesta:** no ajustar en silencio; mostrar un error.

### E-04 · Media · 2.7 · ADMIN — "Días estimados" muestra un 0 al vaciarlo
- **Qué pasó:** al vaciar el campo aparece "0".
- **Causa probable (Frontend):** `TipoSolicitudModal.tsx:135` usa `setDiasEstimados(Number(valor) || 0)`.
- **Propuesta:** guardar el valor como texto, igual que hace `EditorCampo`.

### E-05 · Media · 3.1 · EMP-A — No hay buscador en el paso 1 del asistente
- **Qué pasó:** el paso 1 no tiene buscador.
- **Causa probable:** Frontend (`AsistenteSolicitud.tsx`).

### E-06 · Media · 3.1 / 4.3 · EMP-A — La tarjeta de Cobertura nombra el rol
- **Qué pasó:** la tarjeta dice "…El Validador la aprueba o la rechaza."
- **Causa probable:** Base de datos (es la descripción del tipo en `TipoSolicitud`).
- **Propuesta:** cambiar la descripción desde Catálogos.

### E-07 · Media · 5.7 · JEFE-C — El filtro de área no incluye su propia coordinación
- **Qué pasó:** el filtro "Área / Coordinación" ofrece UCCR y UPLAN, pero no UROE.
- **Causa probable:** Frontend (`jefe/Dashboard.tsx`, que arma el filtro solo con las jefaturas).

### E-08 · Media · 7.3 · VAL — Las tarjetas de "Afiches por revisar" no tienen miniatura
- **Qué pasó:** la bandeja no muestra la miniatura del afiche (0 `<img>`).
- **Captura:** `capturas/f7-bandeja-val.png`.
- **Causa probable:** Frontend (`pages/validador/Dashboard.tsx`).

### E-09 · Media · 1.4 / 7.3 · VAL — El menú tiene un solo ítem
- **Qué pasó:** el menú solo tiene "Solicitudes pendientes", y los afiches son una segunda sección de la misma página llamada "Afiches por revisar".
- **Qué se esperaba (según el plan):** dos ítems, "Afiches pendientes" y "Solicitudes pendientes".
- **Causa probable:** Frontend (`navegacion.ts` y `validador/Dashboard.tsx`).

### E-10 · Media · 10.1 · ADMIN — El aviso a los solicitantes no llega
- **Qué pasó:** el modal de desactivar dice "se avisará a los Asignadores y a los solicitantes", pero ni EMP-B (ADH-0001) ni JEFE-A (AOAA-0028) recibieron notificación.
- **Causa probable:** Base de datos (falta el aviso) o Frontend (el texto del modal sobra).

### E-11 · Baja · 1.2 · Cualquiera — Error de login en inglés
- **Qué pasó:** con una contraseña incorrecta el toast dice "Invalid login credentials" (400 en `/auth/v1/token`, esperado).
- **Causa probable:** Frontend (`lib/errors.ts#mensajeError` no traduce los errores de Auth).

### E-12 · Baja · 2.2 · ADMIN — Prefijo repetido con mensaje crudo de Postgres
- **Qué pasó:** sale `duplicate key value violates unique constraint "ukArea_Prefijo"` (409, código 23505).
- **Captura:** `capturas/f2-prefijo-repetido.png`.
- **Propuesta:** traducir el error 23505 en `mensajeError`.

### E-13 · Baja · 2.5 · ADMIN — El modal de jefaturas no se cierra con Esc
- **Qué pasó:** `JefaturasModal` no se cierra con Esc (los otros modales sí). Al quedarse abierto, bloqueó el siguiente clic.

### E-14 · Baja · 4.4 · EMP-A — La búsqueda no ignora los ceros a la izquierda
- **Qué pasó:** "aoaa20", "aoaa1", "aoaa-20" y "aoaa 20" no encuentran nada. "AOAA-0020" y "aoaa0020" sí.

### E-15 · Baja · 8.2 · VAL — Texto del estado vacío distinto al esperado
- **Qué pasó:** el vacío dice "No hay solicitudes esperando tu decisión" (`validador/Dashboard.tsx:43`).
- **Qué se esperaba:** "No hay solicitudes pendientes".

### E-16 · Baja · 11.2 · ANA — La gráfica "Por tipo de solicitud" corta los nombres largos
- **Qué pasó:** se ve "Grabación y edición de videos, spots o cortina…".

### E-17 · Baja · 7.4 · EMP-A — Punto doble en la notificación de rechazo IA
- **Qué pasó:** cuando el motivo termina en punto, sale "…(QA).. Puedes reenviarlo."
- **Causa probable:** Base de datos (plantilla del mensaje).

### E-18 · Baja · 4.3 · VAL — El menú lateral muestra el nombre del rol
- **Qué pasó:** VAL ve la cabecera de sección **"VALIDADOR"** en el menú lateral. Pasa lo mismo con todos los roles: "EMPLEADO", "DISEÑADOR"…
- **Revisado sin otros hallazgos:**
  - Todas las pantallas, diálogos de acción, tooltips y notificaciones de EMP-A, JEFE-A, DIS-1 y VAL (detalles de diseño, IA, cobertura y excepcional, tableros y bandejas).
  - El asistente de IA, Cobertura y Afiche.
  - No aparece "Validador", "Asignador" ni "Aprobador" en ningún otro lugar, salvo E-06.
- **Causa probable:** Frontend (`components/layout/Sidebar.tsx`, que usa el nombre del rol como título de sección).
- **Propuesta:** usar etiquetas neutras por sección, por ejemplo "Revisión".

## 3. Pruebas pendientes

| Prueba | Motivo |
|---|---|
| 3.11, 5.9, 5.10 | ☾ La base está en modo pruebas (horario desactivado). |
| 7.3 | No revisé el diseño a 4 columnas ni con nombres largos. |
| 12.2 | No verifiqué que la URL firmada expire: dura 3600 s (60 min). |

### SQL para las pruebas ⏱ (lo corres tú en el SQL Editor)

Toca solo tickets `[QA]`. Ronda 1 (excepcional vencida + retrasos):

```sql
begin;
-- Mover fechas sin disparar los triggers de validación
set local session_replication_role = replica;
-- 6.4: la excepcional AOAA-0030 queda con el evento en el pasado
update "Solicitudes"."Formularios" f
   set fecha_evento = (current_timestamp at time zone 'America/Tegucigalpa')::date - 1
  from "Solicitudes"."Ticket" t
 where t.formulario_id = f.id and t.codigo = 'AOAA-0030';
-- 7.8 (IA), 8.5 (Cobertura), 9.1 (diseño, DIS-1): fecha límite vencida
update "Solicitudes"."Ticket"
   set fecha_limite = current_timestamp - interval '1 hour'
 where codigo in ('AOAA-0024', 'AOAA-0027', 'AOAA-0019');
-- 9.2: AOAA-0021 (Finalizado) entregado hace 7 días
update "Solicitudes"."Ticket"
   set fecha_entrega_diseno = current_timestamp - interval '7 days'
 where codigo = 'AOAA-0021';
set local session_replication_role = origin;
-- Corre el cron de retrasos (incluye el rechazo de excepcionales vencidas)
select "Solicitudes"."fnVerificarTicketsRetrasados"();
commit;
```

Después de la ronda 1, verifico en la app:
- AOAA-0030 Rechazado con "Rechazada automáticamente…";
- AOAA-0024 y AOAA-0027 Retrasados, VAL avisado y todavía puede dictaminar;
- AOAA-0019 Retrasado en la columna del diseñador, y se puede entregar;
- JEFE-A al intentar dictaminar AOAA-0021 → "Venció el plazo de 24 horas hábiles…".

Ronda 2 (aprobación automática):

```sql
select "Solicitudes"."fnAprobarTicketsAutomaticamente"();
```

Esperado: AOAA-0021 queda "Aprobado (Automático)" y avisa a EMP-A y DIS-1. Los IA y las coberturas nunca se aprueban solos.

### Resultados ⏱ (SQL corrido el 25/10: la ronda 1 devolvió 3 y la ronda 2 devolvió 1)

| Prueba | Resultado |
|---|---|
| **6.4** | ✅ AOAA-0030 quedó Rechazado. JEFE-A recibió *"Tu solicitud excepcional AOAA-0030 se rechazó automáticamente porque pasó la fecha del evento sin respuesta."* ⚠️ El detalle repite la palabra: *"Rechazada: Rechazada automáticamente: no fue atendida antes de la fecha del evento."* El frontend antepone "Rechazada:" al motivo, y el motivo de la base ya empieza con "Rechazada automáticamente". |
| **7.8** | ✅ AOAA-0024 quedó Retrasado en la bandeja. VAL recibió *"El ticket AOAA-0024 (Aprobación de afiches con IA) está RETRASADO: su fecha límite era 25/10/2026 20:21."* y todavía puede dictaminar: el diálogo se abre. |
| **8.5** | ✅ AOAA-0027 quedó Retrasado, con el mismo aviso a VAL, y todavía se puede dictaminar. |
| **9.1** | ✅ AOAA-0019 aparece en la columna "Retrasados (1)" de DIS-1, que recibió el aviso de RETRASADO. Subió el entregable ("Entregable subido.") y el ticket pasó a Finalizado. Captura: `capturas/f9-dis1-retrasados.png`. |
| **9.2** | ✅ Antes de la ronda 2 el ticket ya se veía como "Aprobado (Automático)", aunque seguía guardado como Finalizado. Desapareció de "Por dictaminar" y el detalle no tiene botones, así que la interfaz nunca deja dictaminar y el mensaje *"Venció el plazo…"* de la base no se alcanza desde la UI. Después de la ronda 2 quedó guardado como Aprobado con `aprobado_automatico = true`. EMP-A y DIS-1 recibieron *"El ticket AOAA-0021 fue aprobado automáticamente (24 horas hábiles sin dictamen del jefe)."* Ningún IA ni ninguna Cobertura se aprobó sola: AOAA-0024 y AOAA-0027 siguen Retrasados. ⚠️ El jefe no recibe aviso de la aprobación automática; la función solo avisa al solicitante y al diseñador. |

### 12.3 Robustez ✅
- **F5:** probé en `/tickets/21`, `/empleado/solicitudes`, `/admin/catalogos`, `/admin/usuarios`, `/analista?flujo=DISENO`, `/disenador`, `/tickets/23`, `/jefe`, `/validador` y `/tickets/35`. En ninguno quedó la pantalla en blanco ni un spinner.
- **Atrás y adelante:** el historial funciona bien.
- **Doble clic:**
  - En "Enviar solicitud" se creó un solo ticket (ADH-0002).
  - En "Tomar" salió un solo toast.
  - En "Subir" entregable se creó una sola versión.
  - En "Aprobar" del jefe hubo un solo cambio en el log.
  - En "Dictaminar" de IA y de Cobertura se abrió un solo diálogo, y en "Aprobar" quedó una sola decisión: AOAA-0031 con un solo `RevisionIA` APROBADO y AOAA-0032 con un solo `DecisionValidacion`.

### 12.4 Consola y red ✅
- No vi errores rojos de la aplicación, ni `PGRST`, ni 5xx durante las pruebas.
- Los únicos 4xx fueron esperados:
  - 400 de Auth por la contraseña incorrecta;
  - 409 por el prefijo repetido;
  - 400 23514 al quitar Diseñador a ASIG;
  - 400 y 404 de consultas de verificación que hice yo a mano.

## 4. Observaciones de UX (no son errores)
- **Catálogos y usuarios:**
  - Desactivar un área o coordinación es inmediato: sin confirmación ni toast.
  - Marcar o desmarcar jefaturas no muestra toast.
  - La columna "Jefaturas" no lista las jefaturas.
  - El selector de área de Usuarios (y el filtro de Estadísticas) ofrece áreas inactivas.
  - Los inputs de los modales no tienen etiqueta asociada (accesibilidad).
- **Editor de campos:**
  - En ETIQUETAS, la ayuda de "Longitud máxima de cada elemento" dice "…al llenar este campo".
  - `CamposTipoModal` y su vista previa hablan de "fecha del evento" aunque el tipo la haya renombrado.
- **Asistente y formularios:**
  - El botón del calendario siempre dice "Selecciona la fecha del evento", aunque la etiqueta sea otra.
  - IA y Cobertura muestran "Fecha estimada de entrega" y "días hábiles de producción".
  - En los campos FECHA el mínimo es hoy, no el primer día de producción. Hay que confirmar la regla.
  - Un booleano sin responder se muestra como "No".
  - Un duplicado en ETIQUETAS se ignora sin avisar.
  - En el paso de adjuntos dice "…que el diseñador necesite".
- **Tablero y asignación:**
  - Solo se puede subir un entregable por versión: archivo o enlace, no ambos.
  - La primera asignación ("Asignar a…") no pide confirmación.
  - El selector del Asignador repite "Yo (Manual Asignador .)" y "Manual Asignador .".
  - En el tablero del diseñador, las excepcionales dicen "si no respondes" (el diseñador no puede responder), y la fecha de rechazo es el día después del evento.
  - El detalle de una excepcional sigue diciendo "Aceptada – en proceso" estando Finalizado o en Corrección.
- **Notificaciones:**
  - JEFE-A tiene "El ticket ADS-0001 espera tu dictamen" de un ticket del Área de Salud que no puede abrir: EMP-A lo creó cuando pertenecía a ADS.
  - Una notificación recién llegada dice "en 1 segundo" en vez de "hace…" (el reloj del servidor va adelantado).
- **Estadísticas:** la tarjeta "Excepcionales 4 (67% aceptadas)" ocupa dos líneas en letra grande.

## 5. Datos creados y limpieza

**Tickets [QA]:**

| Ticket | Código | Tipo | Solicitante | Estado o uso |
|---|---|---|---|---|
| t20 | AOAA-0019 | Video | EMP-A | Retrasado → entregado → Finalizado (el cron lo aprobará solo en 24 h hábiles) |
| t21 | AOAA-0020 | Afiche | EMP-A | Aprobado |
| t22 | AOAA-0021 | Trifolio | EMP-A | Aprobado (Automático), 5/5 correcciones |
| t23 | ADH-0001 | Diploma | EMP-B | DIS-1 |
| t24 | UCCR-0001 | Afiche | EMP-C | Aprobado |
| t25 | UPLAN-0001 | Afiche | EMP-D | Aprobado |
| t26 | AOAA-0022 | IA | EMP-A | Aprobado |
| t27 | AOAA-0023 | IA | EMP-A | Rechazado tras 5 intentos |
| t28 | AOAA-0024 | IA | EMP-A | Retrasado (7.8) |
| t35 | AOAA-0031 | IA | EMP-A | Aprobado (tiempo real + doble clic) |
| t29 | AOAA-0025 | Cobertura | EMP-A | Aprobado |
| t30 | AOAA-0026 | Cobertura | EMP-A | Rechazado |
| t31 | AOAA-0027 | Cobertura | EMP-A | Retrasado (8.5) |
| t32 | AOAA-0028 | Excepcional (JEFE-A) | JEFE-A | Corrección, sin asignar (ver E-02) |
| t33 | AOAA-0029 | Excepcional (JEFE-A) | JEFE-A | Rechazado |
| t34 | AOAA-0030 | Excepcional (JEFE-A) | JEFE-A | Rechazado automáticamente (6.4) |
| t36 | ADH-0002 | Afiche (doble clic) | EMP-B | Aprobado |
| t37 | AOAA-0032 | Cobertura (doble clic) | EMP-A | Aprobado |

**Estado de la limpieza:**
- ✅ `[QA] Feriado editado` (11/11/2026) desactivado.
- ✅ JEFE-C devuelta a su estado original: solo UPLAN (UCCR desmarcada; lo verifiqué tras recargar).
- ✅ `[QA] Área prueba` y `[QA] Coordinación prueba editada` desactivadas.
- ✅ DIS-2 reactivado.
- ✅ `[QA] Tipo prueba` desactivado.
- ❗ AOAA-0028 quedó en Corrección y sin diseñador. Solo ASIG puede reasignarlo (E-02).

## 6. Dónde me quedé y qué falta
- **Hecho:** todas las fases, incluidas las pruebas ⏱, que verifiqué después de que corrieras el SQL.
### Lo que falta

**Antes de empezar:** sacar la base del "modo pruebas" (horario activado) y probar fuera del horario hábil: lunes a viernes antes de las 8:00 a. m. o después de las 4:00 p. m., un fin de semana o un feriado activo.

| # | Prueba | Usuario | Qué hacer | Esperado |
|---|---|---|---|---|
| 1 | 3.11 | EMP-A | Intentar enviar una solicitud normal (por ejemplo, un Afiche `[QA]`). | Un aviso de fuera de horario y el botón deshabilitado, o el mensaje de rechazo de la base. No se crea nada. |
| 2 | 3.11 | ADMIN | Enviar una solicitud normal `[QA]`. | Se envía. |
| 3 | 3.11 | JEFE-A | Enviar una solicitud excepcional `[QA]` desde `/jefe/excepcional`. | Se envía. |
| 4 | 5.9 | JEFE-A | Dictaminar un ticket de diseño Finalizado y no excepcional. Hay que dejar uno preparado en horario hábil; AOAA-0019 sirve si el cron todavía no lo aprobó. | "Dictaminar" deshabilitado o mensaje de la base. |
| 5 | 5.9 | JEFE-A | Dictaminar una excepcional Finalizada. Hay que preparar una antes: excepcional → aceptar → entregar. | Se permite. |
| 6 | 5.10 | DIS-1 | Tomar un ticket sin asignar y subir un entregable. | Se permite a cualquier hora. |

**Otras revisiones menores que no hice:**
- 7.3: la bandeja del Validador a 4 columnas (pantalla de 1920 px) y con nombres largos.
- 12.2: comprobar que una URL firmada deja de abrir después de 60 minutos (dura 3600 s).

**Pendiente fuera de las pruebas:**
- AOAA-0028 sigue en Corrección y sin diseñador. Solo el Asignador puede reasignarlo (E-02).
- AOAA-0019 quedó Finalizado; el cron lo aprobará solo en 24 horas hábiles. Si se quiere usar para el punto 4, hay que hacerlo antes.
- El servidor de pruebas (Puppeteer) está **cerrado**. Las credenciales solo existieron en la memoria de ese proceso; no se guardaron en ningún archivo.
