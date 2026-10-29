-- =====================================================================
-- iTickets (VOAE/UNAH) · Cambios en la base del 28/10/2026 · Partes 52 a 58
-- Ejecuta en el SQL Editor (proyecto "Gestion Tickets"), UNA PARTE A LA VEZ, en orden.
-- Copia desde este .sql (no desde un PDF). Todo es repetible.
--
-- 52  Campus: opción "COBERTURA NACIONAL" (excluyente: si se elige, reemplaza a los demás campus)
-- 53  Plazos: si el jefe pide corrección al último momento, el diseñador tiene mínimo 1 día hábil
-- 54  Cambio urgente: el jefe pide una excepcional nueva, ligada a un ticket Retrasado o Aprobado
-- 55  Logotipos: todos los formularios empiezan sin logos marcados
-- 56  (OPCIONAL, NO CORRER TODAVÍA) Prefijo del Área de Salud: ADS → AS
-- 57  Recargar el esquema
-- 58  Verificación (todo en true)
--
-- Convención: las tablas y funciones siguen en PascalCase ("Ticket", "fnXxxEscalar");
-- las COLUMNAS siguen en minúsculas con guion bajo (area_id, fecha_limite…), como todas
-- las existentes. Por eso la columna nueva es es_cobertura_nacional y no "Cobertura_Nacional".
-- =====================================================================


-- ===== PARTE 52 · COBERTURA NACIONAL =====
alter table "Solicitudes"."Campus"
  add column if not exists es_cobertura_nacional boolean not null default false;

-- Solo puede haber una opción de cobertura nacional
create unique index if not exists "ukCampus_CoberturaNacional"
  on "Solicitudes"."Campus" (es_cobertura_nacional) where es_cobertura_nacional;

insert into "Solicitudes"."Campus" (nombre, siglas, orden, estado, es_cobertura_nacional)
select 'COBERTURA NACIONAL', 'NACIONAL', 0, true, true
 where not exists (select 1 from "Solicitudes"."Campus" where es_cobertura_nacional);

-- Excluyente: si una solicitud elige "COBERTURA NACIONAL", se guarda solo esa opción
create or replace function "Solicitudes"."fnFormularioCampusNacionalTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_nueva_es_nacional boolean;
begin
  select es_cobertura_nacional into v_nueva_es_nacional
    from "Solicitudes"."Campus" where id = new.campus_id;

  if v_nueva_es_nacional then
    -- Quita los campus individuales que ya se hubieran guardado
    delete from "Solicitudes"."FormularioCampus" fc
     where fc.formulario_id = new.formulario_id and fc.campus_id <> new.campus_id;
  elsif exists (select 1 from "Solicitudes"."FormularioCampus" fc
                  join "Solicitudes"."Campus" c on c.id = fc.campus_id
                 where fc.formulario_id = new.formulario_id and c.es_cobertura_nacional) then
    -- Ya tiene cobertura nacional: el campus individual sobra
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists "tgrFormularioCampusNacionalInsertar" on "Solicitudes"."FormularioCampus";
create trigger "tgrFormularioCampusNacionalInsertar"
before insert on "Solicitudes"."FormularioCampus"
for each row execute function "Solicitudes"."fnFormularioCampusNacionalTrigger"();


-- ===== PARTE 53 · CORRECCIÓN AL ÚLTIMO MOMENTO: MÍNIMO 1 DÍA HÁBIL PARA CORREGIR =====
-- El plazo del diseñador NO se pausa. Solo en un caso excepcional se le da un margen:
--   · el diseñador entregó A TIEMPO (antes de su fecha límite), y
--   · el jefe pide la corrección cuando al diseñador le queda MENOS de 1 día hábil (8 h hábiles)
--     de plazo, o el plazo ya venció.
-- Entonces la nueva fecha límite = momento de la corrección + 1 día hábil (8 h hábiles).
-- Si el diseñador ya había entregado tarde, no hay margen: el retraso es real.

-- Sumar minutos hábiles (L-V 8:00–16:00, sin feriados) a un momento
create or replace function "Solicitudes"."fnSumarMinutosHabilesEscalar"(p_desde timestamptz, p_minutos integer)
returns timestamptz language plpgsql stable security definer set search_path = '' as $$
declare
  v_local     timestamp := p_desde at time zone 'America/Tegucigalpa';
  v_restantes numeric   := greatest(coalesce(p_minutos, 0), 0);
  v_dia       date;
  v_inicio    timestamp;
  v_fin       timestamp;
  v_libres    numeric;
begin
  if v_restantes = 0 then
    return p_desde;
  end if;
  loop
    v_dia    := v_local::date;
    v_inicio := v_dia + time '08:00';
    v_fin    := v_dia + time '16:00';
    if "Solicitudes"."fnEsDiaHabilEscalar"(v_dia) then
      if v_local < v_inicio then v_local := v_inicio; end if;
      if v_local < v_fin then
        v_libres := extract(epoch from (v_fin - v_local)) / 60;
        if v_libres >= v_restantes then
          return (v_local + make_interval(mins => v_restantes::int)) at time zone 'America/Tegucigalpa';
        end if;
        v_restantes := v_restantes - v_libres;
      end if;
    end if;
    v_local := (v_dia + 1) + time '08:00';
  end loop;
end;
$$;

-- Quitar la versión anterior (pausa completa), si se llegó a correr
drop trigger if exists "tgrDictamenJefePausarPlazoInsertar" on "Solicitudes"."DictamenJefe";
drop function if exists "Solicitudes"."fnDictamenJefePausarPlazoTrigger"();

create or replace function "Solicitudes"."fnDictamenJefeMargenCorreccionTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c_margen  constant int := 480;   -- 1 día hábil = 8 horas hábiles (cámbialo aquí si se decide otro margen)
  v_entrega timestamptz;
  v_limite  timestamptz;
begin
  if new.decision <> 'CORRECCION' then
    return null;
  end if;

  select fecha_entrega_diseno, fecha_limite into v_entrega, v_limite
    from "Solicitudes"."Ticket" where id = new.ticket_id;

  if v_entrega is null or v_limite is null or v_entrega > v_limite then
    return null;   -- sin entrega registrada, o entregó tarde: no hay margen
  end if;

  if "Solicitudes"."fnMinutosHabilesEntreEscalar"(new.fecha_dictamen, v_limite) < c_margen then
    update "Solicitudes"."Ticket"
       set fecha_limite = "Solicitudes"."fnSumarMinutosHabilesEscalar"(new.fecha_dictamen, c_margen)
     where id = new.ticket_id;
  end if;
  return null;
end;
$$;

drop trigger if exists "tgrDictamenJefeMargenCorreccionInsertar" on "Solicitudes"."DictamenJefe";
create trigger "tgrDictamenJefeMargenCorreccionInsertar"
after insert on "Solicitudes"."DictamenJefe"
for each row execute function "Solicitudes"."fnDictamenJefeMargenCorreccionTrigger"();


-- ===== PARTE 54 · CAMBIO URGENTE SOBRE UN TICKET RETRASADO O APROBADO =====
alter table "Solicitudes"."Ticket"
  add column if not exists ticket_origen_id int
      constraint "fkTicket_TicketOrigen" references "Solicitudes"."Ticket" (id),
  add column if not exists motivo_cambio_urgente text;

alter table "Solicitudes"."Ticket" drop constraint if exists "chkTicket_CambioUrgente";
alter table "Solicitudes"."Ticket" add constraint "chkTicket_CambioUrgente"
  check (ticket_origen_id is null
         or (es_excepcional and ticket_origen_id <> id and btrim(coalesce(motivo_cambio_urgente, '')) <> ''));

create index if not exists "ixTicket_TicketOrigen" on "Solicitudes"."Ticket" (ticket_origen_id);

-- El ticket nuevo se numera con el área del ticket original (para jefes de varias coordinaciones)
create or replace function "Solicitudes"."fnTicketAreaCambioUrgenteTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_area text := nullif(current_setting('itickets.area_cambio_urgente', true), '');
begin
  if v_area is not null then
    new.area_id := v_area::int;
  end if;
  return new;
end;
$$;

-- El nombre empieza con "AA" para que corra ANTES de que se asigne el código
drop trigger if exists "tgrTicketAAAreaCambioUrgenteInsertar" on "Solicitudes"."Ticket";
create trigger "tgrTicketAAAreaCambioUrgenteInsertar"
before insert on "Solicitudes"."Ticket"
for each row execute function "Solicitudes"."fnTicketAreaCambioUrgenteTrigger"();

-- Crear la solicitud de cambio urgente
create or replace function "Solicitudes"."fnSolicitudCambioUrgenteCrearEscalar"(
  p_ticket_origen_id int,
  p_motivo           text,
  p_fecha_evento     date default null
)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_origen     "Solicitudes"."Ticket"%rowtype;
  v_form       "Solicitudes"."Formularios"%rowtype;
  v_estado     varchar(50);
  v_flujo      varchar(20);
  v_fecha      date;
  v_respuestas jsonb;
  v_nuevo      int;
begin
  if btrim(coalesce(p_motivo, '')) = '' then
    raise exception 'Escribe el motivo del cambio urgente.' using errcode = 'check_violation';
  end if;

  select * into v_origen from "Solicitudes"."Ticket" where id = p_ticket_origen_id;
  if not found then
    raise exception 'El ticket % no existe.', p_ticket_origen_id;
  end if;

  if not "Seguridad"."fnUsuarioActualEsJefeDeAreaEscalar"(v_origen.area_id) then
    raise exception 'Solo el jefe del área del ticket % puede pedir un cambio urgente.', v_origen.codigo
          using errcode = 'insufficient_privilege';
  end if;

  select e.nombre, ts.flujo into v_estado, v_flujo
    from "Solicitudes"."Estado" e, "Solicitudes"."TipoSolicitud" ts
   where e.id = v_origen.estado_id and ts.id = v_origen.tipo_solicitud_id;

  if v_flujo <> 'DISENO' then
    raise exception 'Solo las solicitudes de diseño admiten un cambio urgente.' using errcode = 'check_violation';
  end if;

  if v_estado not in ('Retrasado', 'Aprobado') then
    raise exception 'Solo se puede pedir un cambio urgente de un ticket Retrasado o Aprobado (el ticket % está en "%").',
          v_origen.codigo, v_estado using errcode = 'check_violation';
  end if;

  if exists (select 1 from "Solicitudes"."Ticket" h
               join "Solicitudes"."Estado" e on e.id = h.estado_id
              where h.ticket_origen_id = v_origen.id
                and e.nombre not in ('Aprobado', 'Rechazado')) then
    raise exception 'El ticket % ya tiene un cambio urgente en curso.', v_origen.codigo using errcode = 'check_violation';
  end if;

  select * into v_form from "Solicitudes"."Formularios" where id = v_origen.formulario_id;
  v_fecha := coalesce(p_fecha_evento, "Solicitudes"."fnFechaEventoMinimaEscalar"(v_origen.tipo_solicitud_id, true));

  -- Copia de las respuestas: solo campos todavía activos; las fechas pasadas se cambian por la nueva fecha
  select coalesce(jsonb_object_agg(r.key,
           case when c.tipo_campo = 'FECHA' and (r.value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$'
                     and (r.value #>> '{}')::date < v_fecha
                then to_jsonb(to_char(v_fecha, 'YYYY-MM-DD'))
                else r.value end), '{}'::jsonb)
    into v_respuestas
    from jsonb_each(coalesce(v_form.respuestas, '{}'::jsonb)) r
    join "Solicitudes"."CampoFormulario" c
      on c.tipo_solicitud_id = v_origen.tipo_solicitud_id and c.clave = r.key and c.estado;

  perform set_config('itickets.area_cambio_urgente', v_origen.area_id::text, true);

  v_nuevo := "Solicitudes"."fnSolicitudCrearEscalar"(
    v_origen.tipo_solicitud_id,
    jsonb_build_object(
      'titulo',       left('Cambio urgente ' || v_origen.codigo || ': ' || v_form.titulo, 200),
      'fecha_evento', v_fecha,
      'dirigido_a',   v_form.dirigido_a,
      'campus_ids',   (select coalesce(jsonb_agg(fc.campus_id), '[]'::jsonb)
                         from "Solicitudes"."FormularioCampus" fc
                         join "Solicitudes"."Campus" c on c.id = fc.campus_id and c.estado
                        where fc.formulario_id = v_form.id),
      'respuestas',   v_respuestas),
    true);

  perform set_config('itickets.area_cambio_urgente', '', true);

  update "Solicitudes"."Ticket"
     set ticket_origen_id      = v_origen.id,
         motivo_cambio_urgente = btrim(p_motivo)
   where id = v_nuevo;

  -- Aviso al solicitante original (si no es el mismo jefe)
  insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
  select v_origen.usuario_registro, v_origen.id,
         format('Tu jefe de área pidió un cambio urgente sobre tu ticket %s.', v_origen.codigo)
   where v_origen.usuario_registro is distinct from "Seguridad"."fnUsuarioActualIdEscalar"();

  return v_nuevo;
end;
$$;

revoke execute on function "Solicitudes"."fnSolicitudCambioUrgenteCrearEscalar"(int, text, date) from public, anon;
grant  execute on function "Solicitudes"."fnSolicitudCambioUrgenteCrearEscalar"(int, text, date) to authenticated;

-- Quien trabaja el cambio urgente puede ver el ticket original (diseño anterior, adjuntos, entregables)
create or replace function "Solicitudes"."fnTicketEsOrigenVisibleEscalar"(p_ticket_id int)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from "Solicitudes"."Ticket" h
     where h.ticket_origen_id = p_ticket_id
       and h.disenador_id = "Seguridad"."fnUsuarioActualIdEscalar"());
$$;

do $$
declare
  v_qual text;
begin
  select pg_get_expr(polqual, polrelid) into v_qual
    from pg_policy where polname = 'polTicketLeer' and polrelid = '"Solicitudes"."Ticket"'::regclass;
  if v_qual not like '%fnTicketEsOrigenVisibleEscalar%' then
    execute format('alter policy "polTicketLeer" on "Solicitudes"."Ticket" using ((%s) or "Solicitudes"."fnTicketEsOrigenVisibleEscalar"(id))', v_qual);
  end if;
end $$;


-- ===== PARTE 55 · LOGOTIPOS SIN MARCAR POR DEFECTO =====
update "Solicitudes"."CampoFormulario"
   set valor_defecto = '[]'::jsonb
 where tipo_campo = 'ETIQUETAS'
   and valor_defecto is distinct from '[]'::jsonb;


-- ===== PARTE 56 · (OPCIONAL) PREFIJO DEL ÁREA DE SALUD: ADS → AS =====
-- NO la corras hasta que te confirmen el cambio. Los tickets que ya existan conservan su código;
-- solo los nuevos saldrán como AS-0001, AS-0002…
-- update "Seguridad"."Areas" set prefijo = 'AS' where prefijo = 'ADS';


-- ===== PARTE 57 =====
notify pgrst, 'reload schema';


-- ===== PARTE 58 · VERIFICACIÓN (todo en true) =====
select
  exists (select 1 from "Solicitudes"."Campus" where es_cobertura_nacional and estado and orden = 0)   as cobertura_nacional,
  exists (select 1 from pg_trigger where tgname = 'tgrFormularioCampusNacionalInsertar')               as nacional_excluyente,
  (exists (select 1 from pg_trigger where tgname = 'tgrDictamenJefeMargenCorreccionInsertar')
   and not exists (select 1 from pg_trigger where tgname = 'tgrDictamenJefePausarPlazoInsertar'))      as margen_correccion,
  exists (select 1 from information_schema.columns
           where table_name = 'Ticket' and column_name in ('ticket_origen_id'))                        as columna_origen,
  exists (select 1 from pg_proc where proname = 'fnSolicitudCambioUrgenteCrearEscalar')                as funcion_cambio_urgente,
  (select pg_get_expr(polqual, polrelid) like '%fnTicketEsOrigenVisibleEscalar%'
     from pg_policy where polname = 'polTicketLeer')                                                   as origen_visible,
  not exists (select 1 from "Solicitudes"."CampoFormulario"
               where tipo_campo = 'ETIQUETAS' and valor_defecto is distinct from '[]'::jsonb)          as logos_sin_marcar;
