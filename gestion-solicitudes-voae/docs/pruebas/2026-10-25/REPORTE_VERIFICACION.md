# Reporte de verificación · segunda ronda (25/10/2026)

- **Entorno:** local (`npm run dev` en `http://localhost:5173`) contra la base de Supabase de siempre. Las correcciones todavía no están publicadas en front-ticket.pages.dev.
- **Base de datos:** en modo pruebas (horario hábil desactivado).
- **Herramienta:** Chrome sin interfaz (puppeteer-core). Una sesión aislada por usuario, con registro de errores de consola y de respuestas HTTP ≥ 400.
- **Credenciales:** las 13 se usaron solo en memoria. No aparecen en ningún archivo, captura ni registro.
- **Capturas:** `capturas/v2-*.png`.

## Resumen

| | Cantidad |
|---|---|
| Errores del reporte **resueltos** | 19 de 20 (E-01 a E-18 y 6.4) |
| **Sin poder verlos** en el navegador | E-15 (la bandeja nunca quedó vacía) |
| Pendientes de SQL ⏱ | 9.2 (aviso al jefe en la aprobación automática) |
| **Siguen** | 0 |
| **Errores nuevos** | 0 (solo 3 observaciones menores, ver Parte B) |
| Parte C | Pendiente ☾ |

---

## 1. Parte A: errores del reporte

| # | Estado | Nota |
|---|---|---|
| **E-01** | ✅ Resuelto | Revisé las respuestas de EMP-A y JEFE-A en AOAA-0020 y AOAA-0021:<br>• El detalle pide `Ticket?select=id,formulario_id,tipo_solicitud_id` (sin `disenador_id` ni `asignado_por`).<br>• No pide `TicketLog`.<br>• `vw_TicketsEstadoReal` no trae campos de asignación.<br>• `fnUsuariosNombresTabla` no incluye a ningún diseñador (Cristobal Diseñador, Daniel Josue Mayorquin, Edwin Miranda, Manual Diseñador, angienam2004, Prueba Manual, Manual Asignador).<br>• En pantalla no aparece ningún diseñador.<br>Nota: una consulta REST hecha a mano a `Ticket?select=disenador_id` todavía devuelve el id. La app ya no lo pide, pero cerrarlo del todo requiere RLS o permisos por columna (**Base de datos**). |
| **E-01 (equipo)** | ✅ | DIS-1, ASIG y ADMIN ven "Cristobal Diseñador" en AOAA-0021. |
| **E-02** | ✅ | AOAA-0028 (excepcional en Corrección, liberada) apareció en "Tickets sin asignación" y DIS-1 la tomó ("Tomaste AOAA-0028."). Ahora está en sus tickets, en Corrección 1/5. |
| **E-02 (pendiente)** | ✅ | La `[QA2]` AOAA-0034 recién creada no aparece en "Tickets sin asignación". Solo sale en "Excepcionales pendientes de aceptación" (sin botón Tomar), y el detalle no muestra ningún botón. Captura: `v2-e02-pendiente.png`. |
| **E-03** | ✅ | Con 5 sale "El mínimo es 10" en rojo, Guardar queda deshabilitado, el valor sigue en 5 y no se guarda nada. Captura: `v2-e03.png`. |
| **E-04** | ✅ | Al vaciarlo, el campo queda en `""`, no en "0". |
| **E-05** | ✅ | "trifolio" → Trifolio · "cobertura" → Cobertura de evento · "AFICHE" → Afiche y Aprobación de afiches con IA · "grabacion" (sin tilde) → Grabación y edición… |
| **E-06** | ✅ | "Solicitud de cobertura fotográfica o de video de un evento. Tu solicitud será aprobada o rechazada." |
| **E-07** | ✅ | JEFE-C ve "Todas, UROE, Unidad de Planificación". UCCR no sale porque hoy JEFE-C no tiene esa jefatura: en la limpieza de la primera ronda se le dejó solo UPLAN. Ver la observación O-03. |
| **E-08** | ✅ | 3 tarjetas: 2 con miniatura (imagen 4:3) y 1 con ícono de PDF. Captura: `v2-e08-afiches.png`. |
| **E-09** | ✅ | El menú tiene "Afiches pendientes 3" (`/validador`) y "Solicitudes pendientes 2" (`/validador/solicitudes`). |
| **E-10** | ✅ | Abrí el modal de DIS-1 y lo cancelé: "…los tickets activos volverán a la cola sin asignar y se avisará a quien asigna el trabajo." No menciona a los solicitantes ni nombra roles. DIS-1 sigue activo. Captura: `v2-e10.png`. |
| **E-11** | ✅ | "Correo o contraseña incorrectos." |
| **E-12** | ✅ | Coordinación con prefijo `UROE` → "Ese prefijo ya está en uso." (409 esperado y nada creado). |
| **E-13** | ✅ | Esc cierra el modal de jefaturas, además de Crear tipo y el de la excepcional del Asignador. |
| **E-14** | ✅ | "aoaa20", "aoaa-20", "aoaa 20" y "AOAA-0020" encuentran solo AOAA-0020. |
| **E-15** | ⚠️ No verificable | La bandeja de solicitudes nunca quedó vacía: queda AOAA-0018 ("prueba jade covertura de evento"), que no es `[QA]`, así que no la toqué. Tampoco hay un filtro que la vacíe. En el código, el texto ya es "No hay solicitudes pendientes". |
| **E-16** | ✅ | "Grabación y edición de videos," / "spots o cortinas institucionales": se lee completo en 2 líneas, y tiene `<title>` con el nombre entero. |
| **E-17** | ✅ | VAL rechazó AOAA-0038 con "Mejorar contraste.". EMP-A recibió: "…Motivo: Mejorar contraste. Puedes reenviarlo." con un solo punto. |
| **E-18** | ✅ | Títulos del menú: EMP-A "Mis solicitudes", DIS-1 "Producción", VAL "Revisión", JEFE-A "Mi área", ANA "Análisis", ASIG "Distribución / Producción", ADMIN "Administración". |
| **6.4** | ✅ | AOAA-0030: "Rechazada automáticamente: no fue atendida antes de la fecha del evento.", sin la palabra repetida. |
| **9.2 (aviso al jefe)** | ⏱ Pendiente | AOAA-0041 (`[QA2]`, t47) ya está Finalizado. Falta correr el SQL de la sección 4 y revisar las notificaciones de JEFE-A. |

### Observaciones de UX

| Observación | Estado | Nota |
|---|---|---|
| Toast al activar o desactivar un área o coordinación y al cambiar jefaturas | ✅ | "Coordinación "[QA] Coordinación prueba editada" activada/desactivada." · "Ahora también es jefe de…" / "Ya no es jefe de…" |
| Confirmación antes de desactivar | ✅ | "¿Desactivar …? Dejará de ofrecerse al crear o editar usuarios…" Activar no pide confirmación. |
| La columna "Jefaturas" lista las coordinaciones | ✅ | JEFE-C: "UROE, Unidad de Planificación". Ver O-03. |
| Usuarios no ofrece áreas inactivas; Estadísticas las marca | ✅ | Ningún selector de Usuarios ni el de Crear usuario ofrece `[QA]`. Estadísticas muestra "[QA] Área prueba (inactiva)" y "[QA] Coordinación prueba editada (inactiva)". |
| El selector del Asignador no repite al usuario | ✅ | "Yo, angienam2004, Cristobal Diseñador, Daniel Josue…, Edwin Miranda, Manual Diseñador ., Prueba Manual…", sin "Manual Asignador .". |
| El calendario y la vista previa usan la etiqueta del tipo | ✅ | Trifolio: "Seleccionar fecha de entrega" y "Fecha de entrega *". En Campos: "generalidades (título, fecha de entrega, dirigido a y alcance)". |
| IA y Cobertura dicen "Plazo de respuesta" | ✅ | "Plazo de respuesta: 10 día(s) hábiles" en ambos (paso 2 y ayuda del calendario). |
| Ayuda de ETIQUETAS y texto de adjuntos | ✅ | "…al escribir cada elemento" y "…que sirvan para tu solicitud". Ver O-01 sobre la redacción. |
| En el tablero, las excepcionales no dicen "si no respondes" | ✅ | "Pendiente de aceptación; se rechaza automáticamente si no se acepta antes del 31/10/2026". |
| BOOLEANO sin responder muestra "—" | ⚠️ No verificable | Todos los BOOLEANO activos son obligatorios. El único opcional es del tipo `[QA] Tipo prueba`, que está inactivo y no tiene tickets. En el código ya muestra "—". |
| Duplicado en ETIQUETAS | ✅ | Escribir "Logo QA2" y luego "LOGO qa2" muestra "Ya está agregado.". |
| Una excepcional aceptada muestra su estado real | ✅ | AOAA-0028 "Aceptada – Corrección" y AOAA-0034 "Aceptada – En proceso". |
| Notificación de un ticket sin acceso | ✅ | ADS-0001 de JEFE-A → "Ya no tienes acceso a este ticket". |
| Tarjeta "Excepcionales" con la misma letra | ✅ | 24 px y 32 px de alto, igual que "Total". El detalle "(60% aceptadas)" va en pequeño. |

---

## 2. Parte B: que no se rompió nada

| # | Estado | Nota |
|---|---|---|
| **1. Login de los 13** | ✅ | Todos llegan a su panel en 7–8 s, sin spinner ni `PGRST201`. Los logos VOAE (193 px) y UNAH (124 px) cargan. Captura: `v2-b1-login.png`. |
| **2. Diseño** | ✅ | Pasos (AOAA-0035, t40):<br>• **Calendario:** 06/11 (antes del mínimo), 14/11 y 15/11 (fin de semana) deshabilitados; 13/11 y 16/11 habilitados.<br>• **Enlace:** `drive.google.com/x` → "Se guardará como: https://drive.google.com/x", y así quedó en `Adjuntos`.<br>• **Entregas:** DIS-1 tomó y entregó la v1 (imagen). JEFE-A pidió corrección con comentario y DIS-1 la ve. La v2 fue un enlace.<br>• **Cierre:** JEFE-A aprobó.<br>• **Vista de EMP-A:** ve "VERSIÓN 1 IMAGEN / VERSIÓN 2 LINK", sin el diseñador ni el comentario. Captura: `v2-b2-empleado.png`. |
| **3. Video** | ✅ | Sale el modal "Antes de enviar". "Volver" y Esc no envían (0 tickets); "Acepto, enviar solicitud" crea AOAA-0037 (t42). |
| **4. Coordinaciones** | ✅ (con cambio) | Lo hice con **EMP-D (UPLAN)** en lugar de EMP-C (UCCR), porque JEFE-C hoy dirige UPLAN y no UCCR. UPLAN-0002: DIS-1 entregó, JEFE-C recibió "El ticket UPLAN-0002 espera tu dictamen…" y lo aprobó. JEFE-A no lo ve ni en `/jefe` ni por REST. |
| **5. Asignador** | ✅ | AOAA-0036: ASIG lo asignó a DIS-2 (sin confirmación, como antes) y lo reasignó a DIS-1 (con confirmación). En Bitácora → Asignaciones (ADMIN) aparecen "Asignado: Sin asignar → Daniel Josue…" y "Reasignado: Daniel Josue… → Cristobal Diseñador", hechos por Manual Asignador. Captura: `v2-b5-bitacora.png`. |
| **6. Excepcional** | ✅ | AOAA-0034: ASIG pulsó Dictaminar → Aceptar con DIS-2 ("Solicitud excepcional AOAA-0034 aceptada."). JEFE-A recibió "Tu solicitud excepcional AOAA-0034 fue ACEPTADA y ya está en proceso.", sin nombre de diseñador. |
| **7. IA** | ✅ | AOAA-0038: EMP-A envió, VAL rechazó ("Mejorar contraste."), EMP-A reenvió y VAL aprobó. Queda Aprobado con 2 intentos. |
| **8. Cobertura** | ✅ | AOAA-0039 aprobada y AOAA-0040 rechazada con motivo. EMP-A recibió los dos avisos: "fue APROBADA" y "fue RECHAZADA. Motivo: …". |
| **9. Administración** | ✅ | • Catálogos tiene Áreas, Coordinaciones y Tipos de solicitud, sin Campus.<br>• En "Días estimados", la rueda no cambia el valor y "-" no se escribe ("12" + rueda + "-3" → "123").<br>• El editor de campos muestra la ayuda nueva y "Predeterminado: 100 · Restablecer".<br>• Trifolio dice "Fecha de entrega". |
| **10. Bitácoras y Estadísticas** | ✅ | • Bitácoras: las 3 pestañas cargan (Roles 23, Feriados 9, Asignaciones 33); el buscador filtra ("aoaa36" → 2 filas) y "Exportar CSV" descarga los 3 archivos. Las bitácoras no tienen PDF, igual que antes.<br>• Estadísticas: el filtro Flujo pasa de 46 a 26 y se refleja en la URL; "Exportar → CSV" (4 KB) y "→ PDF" (105 KB) descargan. Ver O-02. |
| **11. Móvil (390 px)** | ✅ | Ni Nueva solicitud, ni el tablero del diseñador, ni Afiches del Validador, ni Por dictaminar tienen scroll horizontal (`scrollWidth = 390`). La tabla de Por dictaminar se desplaza dentro de su contenedor. Capturas: `v2-b11-movil-*.png`. |
| **12. Textos sin roles** | ✅ | Revisé las pantallas, los diálogos y las notificaciones de EMP-A, JEFE-A, DIS-1 y VAL. Las únicas coincidencias son datos, no textos de la app: mi título "[QA2] Afiche para asignador" y los nombres de las cuentas "Validador 1 2" y "Manual Asignador ." ("Asignado por Manual Asignador" en DIS-1). |

### Errores nuevos

No encontré ninguno.

### Observaciones menores

- **O-01 · Frontend · ayuda de ETIQUETAS redundante:** dice "Número máximo de caracteres que van a poder escribir **al escribir** cada elemento". Propuesta: "Número máximo de caracteres de cada elemento. Se cuentan los espacios y símbolos."
- **O-02 · Frontend · buscador de bitácora con escritura instantánea:** si se escribe sin pausa (0 ms entre teclas, como en un script), el buscador pierde letras porque se sincroniza con la URL. "aoaa36" quedó en "6". A 60 ms y 150 ms por tecla funciona bien, así que no debería afectar a una persona. Propuesta, si se quiere blindar: estado local con *debounce* antes de escribir en la URL.
- **O-03 · Base de datos · datos de jefaturas:**
  - `JefaturasArea` tiene la fila (JEFE-C, UROE), y UROE es su propia coordinación. Ya estaba antes de esta ronda, aunque se supone que la base la rechaza.
  - Además, JEFE-C ya no dirige UCCR, por eso B.4 y E-07 se probaron con UPLAN.
  - Propuesta: borrar esa fila y, si se quiere repetir B.4 tal cual, volver a darle UCCR a JEFE-C.
- **Estadísticas (dato, no error):** "Promedio días resolución" muestra **-0.3**, seguramente por las fechas que se movieron con el SQL ⏱ de la primera ronda.

---

## 3. Parte C: ☾ fuera de horario

**Pendiente ☾.** La base está en modo pruebas (horario desactivado). Los 7 pasos siguen como están en `REPORTE.md`, sección 6.

---

## 4. SQL ⏱ para 9.2 (lo corres tú en el SQL Editor)

Toca solo AOAA-0041 (`[QA2]`):

```sql
begin;
set local session_replication_role = replica;
update "Solicitudes"."Ticket"
   set fecha_entrega_diseno = current_timestamp - interval '7 days'
 where codigo = 'AOAA-0041';
set local session_replication_role = origin;
commit;

-- (Opcional) Antes de aprobar, ver qué Finalizados tienen la ventana vencida:
select t.codigo
  from "Solicitudes"."Ticket" t
  join "Solicitudes"."Estado" e on e.id = t.estado_id
 where e.nombre = 'Finalizado'
   and "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(t.fecha_entrega_diseno);

select "Solicitudes"."fnAprobarTicketsAutomaticamente"();
```

Esperado: AOAA-0041 queda "Aprobado (Automático)" y JEFE-A recibe "El ticket AOAA-0041 se aprobó automáticamente porque pasaron 24 horas hábiles sin tu dictamen.".

---

## 5. Errores de consola y red

No hubo errores rojos inesperados, `PGRST…` ni 5xx. Lo que se registró era esperado:

| Usuario | Qué | Motivo |
|---|---|---|
| ADMIN | 409 `23505 ukArea_Prefijo` en `POST Areas` | Prueba de E-12 (prefijo repetido). |
| ANON | 400 `invalid_credentials` en `/auth/v1/token` | Prueba de E-11. |
| EMP-A | 400 `42703` en `Adjuntos?select=…url_enlace…` | Una consulta de verificación que escribí mal; no es de la app. |
| EMP-A | `beforeunload` en `/empleado/nueva` | Aviso de salir sin guardar, que el script aceptó al navegar. Es lo esperado. |

---

## 6. Tickets `[QA2]` creados

| Ticket | Código | Título | Tipo | Solicitante | Estado final |
|---|---|---|---|---|---|
| t39 | AOAA-0034 | [QA2] Excepcional pendiente | Afiche (excepcional) | JEFE-A | En proceso (aceptada, DIS-2) |
| t40 | AOAA-0035 | [QA2] Afiche flujo diseño | Afiche | EMP-A | Aprobado (v1 imagen + v2 enlace, 1 corrección) |
| t41 | AOAA-0036 | [QA2] Afiche para asignador | Afiche | EMP-A | En proceso (DIS-2 → DIS-1) |
| t42 | AOAA-0037 | [QA2] Video aviso | Grabación y edición de videos… | EMP-A | Enviado |
| t43 | UPLAN-0002 | [QA2] Afiche coordinación | Afiche | EMP-D | Aprobado (JEFE-C) |
| t44 | AOAA-0038 | [QA2] Afiche IA | Aprobación de afiches con IA | EMP-A | Aprobado (2 intentos) |
| t45 | AOAA-0039 | [QA2] Cobertura aprobar | Cobertura de evento | EMP-A | Aprobado |
| t46 | AOAA-0040 | [QA2] Cobertura rechazar | Cobertura de evento | EMP-A | Rechazado |
| t47 | AOAA-0041 | [QA2] Afiche aprobación automática | Afiche | EMP-A | Finalizado (espera el SQL de 9.2) |

**Otros cambios en datos:**
- AOAA-0028 (`[QA]`) ahora está asignado a DIS-1.
- AOAA-0033 (`[QA]`, de la prueba anterior) sigue pendiente y se rechazará sola el 31/10.
- Se agregó el adjunto de enlace "[QA2] Referencias" a t40.
- Las áreas `[QA]` y las jefaturas de JEFE-C quedaron como estaban.
