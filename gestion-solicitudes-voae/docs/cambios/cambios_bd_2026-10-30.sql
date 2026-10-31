-- =====================================================================
-- iTickets (VOAE/UNAH) · Cambios en la base del 30/10/2026 · Partes 59 a 64
-- Requisito: haber corrido antes cambios_bd_2026-10-28.sql (Partes 52–58).
-- Ejecuta en el SQL Editor (proyecto "Gestion Tickets"), UNA PARTE A LA VEZ, en orden.
-- Copia desde este .sql (no desde un PDF). Todo es repetible.
--
-- 59  Horario laboral en un solo lugar (sigue de 8:00 a. m. a 4:00 p. m.; plazos de 24 h y 8 h sin cambios)
-- 60  Flujos renombrados: APROBACION_IA → APROBACION  y  VALIDACION → CONFIRMACION
-- 61  Excepcionales también para Aprobación y Confirmación (avisan al Validador)
-- 62  Aceptar / Rechazar antes del dictamen (Aprobación: 2 pasos · Confirmación: 1 paso)
-- 63  Modificaciones (cambio urgente): una sola instrucción, sin correcciones
-- 64  Recargar el esquema + verificación (todo en true)
-- =====================================================================


-- ===== PARTE 59 · HORARIO EN UN SOLO LUGAR (8:00 – 16:00, SIN CAMBIOS) =====
-- El horario vive SOLO en estas dos funciones. Para cambiarlo en el futuro, se editan aquí.
create or replace function "Solicitudes"."fnHorarioInicioEscalar"()
returns time language sql immutable set search_path = '' as $$ select time '08:00' $$;

create or replace function "Solicitudes"."fnHorarioFinEscalar"()
returns time language sql immutable set search_path = '' as $$ select time '16:00' $$;

grant execute on function "Solicitudes"."fnHorarioInicioEscalar"() to authenticated;
grant execute on function "Solicitudes"."fnHorarioFinEscalar"()    to authenticated;

-- ¿Ahora es horario hábil? (también saca la base del "modo pruebas", si estuviera activo)
create or replace function "Solicitudes"."fnEsHorarioHabilEscalar"(p_momento timestamptz default current_timestamp)
returns boolean language sql stable security definer set search_path = '' as $$
  select "Solicitudes"."fnEsDiaHabilEscalar"((p_momento at time zone 'America/Tegucigalpa')::date)
     and (p_momento at time zone 'America/Tegucigalpa')::time >= "Solicitudes"."fnHorarioInicioEscalar"()
     and (p_momento at time zone 'America/Tegucigalpa')::time <  "Solicitudes"."fnHorarioFinEscalar"();
$$;

do $$
declare
  r record; v_def text; v_nuevo text; i int;
  v_textos text[][] := array[
    -- El horario y los plazos NO cambian. Estas líneas solo deshacen una versión anterior
    -- de este script (5:00 p. m. / 27 h / 9 h), si se llegó a correr.
    ['5:00 p. m.',                       '4:00 p. m.'],
    ['3 días hábiles sin dictamen',      '24 h sin dictamen'],
    ['3 días hábiles',                   '24 horas hábiles'],
    ['(p_fecha_entrega_diseno, 27)',     '(p_fecha_entrega_diseno, 24)'],
    ['c_margen  constant int := 540;',   'c_margen  constant int := 480;'],
    ['1 día hábil = 9 horas hábiles',    '1 día hábil = 8 horas hábiles']
  ];
begin
  -- 1) Las funciones de cálculo leen el horario de fnHorarioInicio/FinEscalar
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'Solicitudes'
              and p.proname in ('fnSumarHorasHabilesEscalar', 'fnMinutosHabilesEntreEscalar', 'fnSumarMinutosHabilesEscalar')
  loop
    v_def := pg_get_functiondef(r.oid);
    v_nuevo := replace(replace(v_def,
                 $q$time '16:00'$q$, $q$"Solicitudes"."fnHorarioFinEscalar"()$q$),
                 $q$time '08:00'$q$, $q$"Solicitudes"."fnHorarioInicioEscalar"()$q$);
    if v_nuevo <> v_def then execute v_nuevo; end if;
  end loop;

  -- 2) Mensajes y plazos: se mantienen 4:00 p. m., 24 h y 8 h
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('Seguridad', 'Solicitudes') and p.prokind = 'f'
  loop
    v_def := pg_get_functiondef(r.oid);
    v_nuevo := v_def;
    for i in 1 .. array_length(v_textos, 1) loop
      v_nuevo := replace(v_nuevo, v_textos[i][1], v_textos[i][2]);
    end loop;
    if v_nuevo <> v_def then execute v_nuevo; end if;
  end loop;
end $$;


-- ===== PARTE 60 · FLUJOS: APROBACION y CONFIRMACION =====
begin;
alter table "Solicitudes"."TipoSolicitud" drop constraint if exists "chkTipoSolicitud_Flujo";

update "Solicitudes"."TipoSolicitud" set flujo = 'APROBACION'   where flujo = 'APROBACION_IA';
update "Solicitudes"."TipoSolicitud" set flujo = 'CONFIRMACION' where flujo = 'VALIDACION';

alter table "Solicitudes"."TipoSolicitud" add constraint "chkTipoSolicitud_Flujo"
  check (flujo in ('DISENO', 'APROBACION', 'CONFIRMACION'));

do $$
declare
  r record; v_def text; v_nuevo text; i int;
  v_using text; v_check text;
  v_cambios text[][] := array[
    ['APROBACION_IA',  'APROBACION'],
    ['''VALIDACION''', '''CONFIRMACION'''],
    -- Mensajes: "Aprobación" es ahora un concepto general (no solo afiches con IA)
    ['Tu afiche con IA %s fue aprobado.',                         'Tu solicitud de aprobación %s fue aprobada.'],
    ['Tu afiche con IA %s fue rechazado (intento',                'Tu solicitud de aprobación %s fue denegada (intento'],
    ['Tu afiche con IA %s fue rechazado en el último intento',    'Tu solicitud de aprobación %s fue denegada en el último intento'],
    ['Nuevo afiche con IA para revisar: %s.',                     'Nueva solicitud de aprobación para revisar: %s.'],
    ['Afiche con IA reenviado para revisar',                      'Archivo reenviado para revisar'],
    ['Solo las solicitudes de aprobación de afiches con IA admiten envíos de afiche.',
                                                                  'Solo las solicitudes de aprobación admiten el envío de un archivo a revisar.'],
    ['Las solicitudes de aprobación de afiches con IA solo admiten el afiche a revisar',
                                                                  'Las solicitudes de aprobación solo admiten el archivo a revisar'],
    ['No tienes permiso para dictaminar afiches con IA.',         'No tienes permiso para dictaminar solicitudes de aprobación.'],
    ['cuando se reenvía el afiche',                               'cuando se reenvía el archivo'],
    ['puede enviar el afiche',                                    'puede enviar el archivo'],
    ['El primer afiche solo',                                     'El primer archivo solo'],
    ['reenviar el afiche después',                                'reenviar el archivo después'],
    ['Este afiche no está pendiente',                             'Este archivo no está pendiente']
  ];
begin
  -- Funciones
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('Seguridad', 'Solicitudes') and p.prokind = 'f'
  loop
    v_def := pg_get_functiondef(r.oid);
    v_nuevo := v_def;
    for i in 1 .. array_length(v_cambios, 1) loop
      v_nuevo := replace(v_nuevo, v_cambios[i][1], v_cambios[i][2]);
    end loop;
    if v_nuevo <> v_def then execute v_nuevo; end if;
  end loop;

  -- Políticas (incluye Storage)
  for r in select pol.polname, pol.polrelid, pol.polqual, pol.polwithcheck from pg_policy pol
            where coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
                  ~ 'APROBACION_IA|''VALIDACION'''
  loop
    v_using := replace(replace(pg_get_expr(r.polqual, r.polrelid), 'APROBACION_IA', 'APROBACION'), '''VALIDACION''', '''CONFIRMACION''');
    v_check := replace(replace(pg_get_expr(r.polwithcheck, r.polrelid), 'APROBACION_IA', 'APROBACION'), '''VALIDACION''', '''CONFIRMACION''');
    if v_using is not null then execute format('alter policy %I on %s using (%s)', r.polname, r.polrelid::regclass, v_using); end if;
    if v_check is not null then execute format('alter policy %I on %s with check (%s)', r.polname, r.polrelid::regclass, v_check); end if;
  end loop;

  -- Vistas
  for r in select c.oid, c.oid::regclass::text as nombre, c.reloptions from pg_class c
            where c.relkind = 'v' and c.relnamespace in ('"Seguridad"'::regnamespace, '"Solicitudes"'::regnamespace)
              and pg_get_viewdef(c.oid) ~ 'APROBACION_IA|''VALIDACION'''
  loop
    execute format('create or replace view %s %s as %s', r.nombre,
                   case when r.reloptions is not null then 'with (' || array_to_string(r.reloptions, ', ') || ')' else '' end,
                   replace(replace(pg_get_viewdef(r.oid), 'APROBACION_IA', 'APROBACION'), '''VALIDACION''', '''CONFIRMACION'''));
  end loop;
end $$;
commit;


-- ===== PARTE 61 · EXCEPCIONALES DE APROBACIÓN Y CONFIRMACIÓN =====
do $$
declare
  v_def text; v_nuevo text;
begin
  v_def := pg_get_functiondef('"Solicitudes"."fnSolicitudCrearEscalar"(integer, jsonb, boolean)'::regprocedure);

  -- Ya no se bloquean las excepcionales fuera del flujo de diseño
  v_nuevo := regexp_replace(v_def,
    'if p_excepcional and v_flujo <> ''DISENO'' then\s*raise exception ''Las solicitudes de tipo "%" no pueden ser excepcionales\.''[^;]*;\s*end if;',
    '-- (desde el 30/10 las excepcionales se permiten en todos los flujos)');

  -- El aviso de nueva excepcional va a quien la acepta: Asignador (diseño) o Validador (aprobación y confirmación)
  v_nuevo := replace(v_nuevo,
    $q$where u.estado and "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, 'Asignador');$q$,
    $q$where u.estado and "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, case when v_flujo = 'DISENO' then 'Asignador' else 'Validador' end);$q$);

  if v_nuevo = v_def and v_def not like '%desde el 30/10%' then
    raise exception 'No se encontró el texto esperado en fnSolicitudCrearEscalar. Avísale a quien te dio el script.';
  end if;
  if v_nuevo <> v_def then execute v_nuevo; end if;
end $$;


-- ===== PARTE 62 · ACEPTAR / RECHAZAR ANTES DEL DICTAMEN =====
-- Responder una excepcional:
--   · Diseño: el Asignador la acepta (y elige diseñador) o la rechaza — igual que antes.
--   · Aprobación: el Validador la acepta (luego la dictamina: Aprobar / Denegar) o la rechaza.
--   · Confirmación: un solo paso; el Validador confirma o rechaza con su decisión normal
--     (también puede rechazarla aquí).
create or replace function "Solicitudes"."fnSolicitudExcepcionalResponderEscalar"(
  p_ticket_id    integer,
  p_aceptar      boolean,
  p_motivo       text    default null,
  p_disenador_id integer default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_yo        int := "Seguridad"."fnUsuarioActualIdEscalar"();
  v_disenador int := coalesce(p_disenador_id, "Seguridad"."fnUsuarioActualIdEscalar"());
  v_ticket    "Solicitudes"."Ticket"%rowtype;
  v_flujo     varchar(20);
begin
  select * into v_ticket from "Solicitudes"."Ticket" where id = p_ticket_id for update;
  if not found or not v_ticket.es_excepcional or v_ticket.excepcional_estado <> 'PENDIENTE' then
    raise exception 'El ticket no es una solicitud excepcional pendiente.' using errcode = 'check_violation';
  end if;

  v_flujo := "Solicitudes"."fnTipoSolicitudFlujoEscalar"(v_ticket.tipo_solicitud_id);

  if not "Seguridad"."fnUsuarioActualTieneRolEscalar"(case when v_flujo = 'DISENO' then 'Asignador' else 'Validador' end) then
    raise exception 'No tienes permiso para aceptar o rechazar esta solicitud excepcional.' using errcode = 'check_violation';
  end if;

  if p_aceptar then
    if v_flujo = 'CONFIRMACION' then
      raise exception 'Las confirmaciones excepcionales se responden directamente con Confirmar o Rechazar.' using errcode = 'check_violation';
    end if;

    if v_flujo = 'DISENO' then
      if not "Seguridad"."fnUsuarioTieneRolEscalar"(v_disenador, 'Diseñador') then
        raise exception 'El usuario elegido no es un diseñador activo.' using errcode = 'check_violation';
      end if;
      update "Solicitudes"."Ticket"
         set excepcional_estado          = 'ACEPTADA',
             excepcional_respondido_por  = v_yo,
             excepcional_fecha_respuesta = current_timestamp,
             disenador_id                = v_disenador,
             estado_id                   = "Solicitudes"."fnObtenerEstadoIdEscalar"('En proceso')
       where id = p_ticket_id;
    else
      -- Aprobación: queda aceptada y pasa al dictamen normal (sigue en "Enviado")
      update "Solicitudes"."Ticket"
         set excepcional_estado          = 'ACEPTADA',
             excepcional_respondido_por  = v_yo,
             excepcional_fecha_respuesta = current_timestamp
       where id = p_ticket_id;
    end if;
  else
    if btrim(coalesce(p_motivo, '')) = '' then
      raise exception 'Indique el motivo del rechazo.' using errcode = 'check_violation';
    end if;
    update "Solicitudes"."Ticket"
       set excepcional_estado          = 'RECHAZADA',
           excepcional_respondido_por  = v_yo,
           excepcional_fecha_respuesta = current_timestamp,
           excepcional_motivo_rechazo  = btrim(p_motivo),
           estado_id                   = "Solicitudes"."fnObtenerEstadoIdEscalar"('Rechazado')
     where id = p_ticket_id;
  end if;

  insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
  values (v_ticket.usuario_registro, p_ticket_id,
          case when not p_aceptar
               then format('Tu solicitud excepcional %s fue RECHAZADA: %s', v_ticket.codigo, btrim(p_motivo))
               when v_flujo = 'DISENO'
               then format('Tu solicitud excepcional %s fue ACEPTADA y ya está en proceso.', v_ticket.codigo)
               else format('Tu solicitud excepcional %s fue ACEPTADA y será revisada.', v_ticket.codigo) end);
end;
$$;

-- Transición: una excepcional rechazada pasa a "Rechazado" también en Aprobación y Confirmación
do $$
declare v_def text; v_nuevo text;
begin
  v_def := pg_get_functiondef('"Solicitudes"."fnTicketValidarTransicionTrigger"()'::regprocedure);
  if v_def like '%excepcional rechazada (al responderla%' then
    raise notice 'La transición ya estaba actualizada.';
    return;
  end if;
  v_nuevo := replace(v_def,
$q$  v_flujo := "Solicitudes"."fnTipoSolicitudFlujoEscalar"(new.tipo_solicitud_id);$q$,
$q$  v_flujo := "Solicitudes"."fnTipoSolicitudFlujoEscalar"(new.tipo_solicitud_id);

  -- Excepcional rechazada (al responderla o por vencimiento): pasa a "Rechazado" en cualquier flujo
  if v_flujo <> 'DISENO' and v_nuevo = 'Rechazado' and new.es_excepcional
     and new.excepcional_estado = 'RECHAZADA' and old.excepcional_estado = 'PENDIENTE' then
    return new;
  end if;$q$);
  if v_nuevo = v_def then
    raise exception 'No se encontró el texto esperado en fnTicketValidarTransicionTrigger. Avísale a quien te dio el script.';
  end if;
  execute v_nuevo;
end $$;

-- Aprobación: no se puede dictaminar (Aprobar/Denegar) una excepcional que todavía no se aceptó
create or replace function "Solicitudes"."fnRevisionExcepcionalPendienteTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from "Solicitudes"."Ticket" t
              where t.id = coalesce(new.ticket_id, (select e.ticket_id from "Solicitudes"."EnvioIA" e where e.id = new.envio_id))
                and t.es_excepcional and t.excepcional_estado = 'PENDIENTE') then
    raise exception 'Primero acepta o rechaza esta solicitud excepcional.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists "tgrRevisionIAExcepcionalPendienteInsertar" on "Solicitudes"."RevisionIA";
drop trigger if exists "tgrRevisionIAZExcepcionalPendienteInsertar" on "Solicitudes"."RevisionIA";
create trigger "tgrRevisionIAZExcepcionalPendienteInsertar"
before insert on "Solicitudes"."RevisionIA"
for each row execute function "Solicitudes"."fnRevisionExcepcionalPendienteTrigger"();

-- Confirmación: la decisión del Validador también responde la excepcional (un solo paso)
create or replace function "Solicitudes"."fnDecisionValidacionExcepcionalTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update "Solicitudes"."Ticket"
     set excepcional_estado          = case new.decision when 'APROBADO' then 'ACEPTADA' else 'RECHAZADA' end,
         excepcional_respondido_por  = "Seguridad"."fnUsuarioActualIdEscalar"(),
         excepcional_fecha_respuesta = current_timestamp,
         excepcional_motivo_rechazo  = case when new.decision = 'RECHAZADO' then new.comentario end
   where id = new.ticket_id and es_excepcional and excepcional_estado = 'PENDIENTE';
  return new;
end;
$$;

-- El nombre empieza con "Z" para que corra DESPUÉS de la validación de la decisión
drop trigger if exists "tgrDecisionValidacionZExcepcionalInsertar" on "Solicitudes"."DecisionValidacion";
create trigger "tgrDecisionValidacionZExcepcionalInsertar"
before insert on "Solicitudes"."DecisionValidacion"
for each row execute function "Solicitudes"."fnDecisionValidacionExcepcionalTrigger"();


-- ===== PARTE 63 · MODIFICACIONES SIN CICLO DE CORRECCIONES =====
create or replace function "Solicitudes"."fnDictamenJefeModificacionTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.decision = 'CORRECCION'
     and exists (select 1 from "Solicitudes"."Ticket" t where t.id = new.ticket_id and t.ticket_origen_id is not null) then
    raise exception 'Las solicitudes excepcionales por modificación constan de una única instrucción directa sin ciclo de correcciones.'
          using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists "tgrDictamenJefeModificacionInsertar" on "Solicitudes"."DictamenJefe";
create trigger "tgrDictamenJefeModificacionInsertar"
before insert on "Solicitudes"."DictamenJefe"
for each row execute function "Solicitudes"."fnDictamenJefeModificacionTrigger"();


-- ===== PARTE 64 · RECARGAR Y VERIFICAR =====
notify pgrst, 'reload schema';

select
  ("Solicitudes"."fnHorarioInicioEscalar"() = time '08:00'
   and "Solicitudes"."fnHorarioFinEscalar"() = time '16:00'
   and not exists (select 1 from pg_proc where prosrc like '%5:00 p. m.%'))                                   as horario_8_a_16,
  ((select prosrc like '%, 24)%' from pg_proc where proname = 'fnVentanaAprobacionVencidaEscalar')
   and (select prosrc like '%:= 480;%' from pg_proc where proname = 'fnDictamenJefeMargenCorreccionTrigger')
   and not exists (select 1 from pg_proc where prosrc like '%3 días hábiles%'))                                 as plazos_24h_y_8h,
  (not exists (select 1 from pg_proc where prosrc like '%APROBACION_IA%' or prosrc like '%''VALIDACION''%')
   and not exists (select 1 from pg_policy where coalesce(pg_get_expr(polqual, polrelid), '') ~ 'APROBACION_IA|''VALIDACION''')
   and not exists (select 1 from pg_views where definition ~ 'APROBACION_IA|''VALIDACION''')
   and not exists (select 1 from "Solicitudes"."TipoSolicitud" where flujo not in ('DISENO','APROBACION','CONFIRMACION'))) as flujos_renombrados,
  (select prosrc not like '%no pueden ser excepcionales%' and prosrc like '%else ''Validador'' end%'
     from pg_proc where proname = 'fnSolicitudCrearEscalar')                                                   as excepcionales_todos_los_flujos,
  (exists (select 1 from pg_trigger where tgname = 'tgrRevisionIAZExcepcionalPendienteInsertar')
   and exists (select 1 from pg_trigger where tgname = 'tgrDecisionValidacionZExcepcionalInsertar')
   and (select prosrc like '%else ''Validador'' end%' from pg_proc where proname = 'fnSolicitudExcepcionalResponderEscalar')) as aceptar_antes_de_dictaminar,
  exists (select 1 from pg_trigger where tgname = 'tgrDictamenJefeModificacionInsertar')                     as modificacion_sin_correcciones;
