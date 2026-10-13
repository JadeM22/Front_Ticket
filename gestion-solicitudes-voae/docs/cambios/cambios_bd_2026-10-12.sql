-- =====================================================================
-- Gestión de Solicitudes VOAE: cambios del 12 de octubre de 2026
-- Ejecutar en el SQL Editor de Supabase, UNA PARTE A LA VEZ y en orden.
-- Probado en PostgreSQL 16 sobre una copia de la base con datos y en una instalación limpia.
-- =====================================================================

-- ===== PARTE 1 =====
-- Áreas: nombres oficiales, prefijo y consecutivo para los códigos de ticket
alter table "Seguridad"."Areas"
  add column prefijo            varchar(6),
  add column ultimo_consecutivo int not null default 0,
  add constraint "ukArea_Prefijo" unique (prefijo),
  add constraint "chkArea_Prefijo" check (prefijo ~ '^[A-Z]{2,6}$');

update "Seguridad"."Areas" set nombre = 'Área de Desarrollo Humano',              prefijo = 'ADH'  where nombre ilike 'Becas%' or nombre = 'Área de Desarrollo Humano';
update "Seguridad"."Areas" set nombre = 'Área de Orientación y Asesoría Académica', prefijo = 'AOAA' where nombre ilike 'Comunicaci%' or nombre = 'Área de Orientación y Asesoría Académica';
update "Seguridad"."Areas" set nombre = 'Área de Salud',                           prefijo = 'ADS'  where nombre ilike 'Salud%' or nombre = 'Área de Salud';

-- Código del ticket por área (ADH0001, AOAA0001, ADS0001...)
alter table "Solicitudes"."Ticket" add column codigo varchar(20);

with numerados as (
  select t.id,
         coalesce(a.prefijo, 'TKT') || lpad(row_number() over (partition by t.area_id order by t.id)::text, 4, '0') as codigo
    from "Solicitudes"."Ticket" t
    join "Seguridad"."Areas" a on a.id = t.area_id
)
update "Solicitudes"."Ticket" t set codigo = n.codigo from numerados n where n.id = t.id;

update "Seguridad"."Areas" a
   set ultimo_consecutivo = (select count(*) from "Solicitudes"."Ticket" t where t.area_id = a.id);

alter table "Solicitudes"."Ticket"
  alter column codigo set not null,
  add constraint "ukTicket_Codigo" unique (codigo);

create or replace function "Solicitudes"."fnTicketAsignarCodigoTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_area_id int := coalesce(new.area_id,
                            (select u.area_id from "Seguridad"."Usuarios" u where u.id = new.usuario_registro));
  v_prefijo varchar(6);
  v_numero  int;
begin
  -- Bloquea la fila del área: dos tickets simultáneos nunca reciben el mismo número
  update "Seguridad"."Areas"
     set ultimo_consecutivo = ultimo_consecutivo + 1
   where id = v_area_id
  returning prefijo, ultimo_consecutivo into v_prefijo, v_numero;

  if v_numero is null then
    raise exception 'El solicitante no tiene un área válida asignada.' using errcode = 'check_violation';
  end if;

  new.codigo := coalesce(v_prefijo, 'TKT') || lpad(v_numero::text, greatest(4, length(v_numero::text)), '0');
  return new;
end;
$$;

create trigger "tgrTicketAsignarCodigoInsertar"
before insert on "Solicitudes"."Ticket"
for each row execute function "Solicitudes"."fnTicketAsignarCodigoTrigger"();

-- ===== PARTE 2 =====
-- Usuarios: apellidos y nombre completo
alter table "Seguridad"."Usuarios"
  add column primer_apellido  varchar(60),
  add column segundo_apellido varchar(60),
  add column nombre_completo  varchar(230) generated always as
      (btrim(nombre || coalesce(' ' || nullif(btrim(primer_apellido), ''), '')
                    || coalesce(' ' || nullif(btrim(segundo_apellido), ''), ''))) stored;

-- Nombres para la app (ahora devuelve el nombre completo)
create or replace function "Seguridad"."fnUsuariosNombresTabla"()
returns table (id int, nombre varchar)
language sql stable security definer set search_path = '' as $$
  select u.id, u.nombre_completo
    from "Seguridad"."Usuarios" u
   where auth.uid() is not null;
$$;

-- Al crear la cuenta: guardar nombre y apellidos
create or replace function "Seguridad"."fnUsuarioCrearDesdeAuthTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into "Seguridad"."Usuarios" (auth_id, nombre, primer_apellido, segundo_apellido, correo)
  values (new.id,
          coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
          nullif(btrim(new.raw_user_meta_data ->> 'primer_apellido'), ''),
          nullif(btrim(new.raw_user_meta_data ->> 'segundo_apellido'), ''),
          lower(btrim(new.email)));

  perform "Seguridad"."fnUsuarioAplicarConfiguracionInicial"(new.id, new.raw_app_meta_data);
  return new;
end;
$$;

-- ===== PARTE 3 =====
-- Rol Asignador (solo para usuarios que ya son Diseñador)
insert into "Seguridad"."Roles" (nombre, descripcion)
values ('Asignador', 'Diseñador que distribuye y reasigna los tickets entre el equipo de diseño')
on conflict on constraint "ukRol_Nombre" do nothing;

create or replace function "Seguridad"."fnUsuarioRolValidarTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_rol varchar(50);
begin
  if tg_op = 'INSERT' then
    select nombre into v_rol from "Seguridad"."Roles" where id = new.rol_id;
    if v_rol = 'Asignador' and not exists (
         select 1 from "Seguridad"."UsuariosRoles" ur
           join "Seguridad"."Roles" r on r.id = ur.rol_id
          where ur.usuario_id = new.usuario_id and r.nombre = 'Diseñador') then
      raise exception 'El rol Asignador solo se puede dar a un usuario que ya tenga el rol Diseñador.'
            using errcode = 'check_violation';
    end if;
    return new;
  else
    select nombre into v_rol from "Seguridad"."Roles" where id = old.rol_id;
    if v_rol = 'Diseñador' and exists (
         select 1 from "Seguridad"."UsuariosRoles" ur
           join "Seguridad"."Roles" r on r.id = ur.rol_id
          where ur.usuario_id = old.usuario_id and r.nombre = 'Asignador') then
      raise exception 'Primero quite el rol Asignador; luego podrá quitar el rol Diseñador.'
            using errcode = 'check_violation';
    end if;
    return old;
  end if;
end;
$$;

create trigger "tgrUsuariosRolesValidarInsertarEliminar"
before insert or delete on "Seguridad"."UsuariosRoles"
for each row execute function "Seguridad"."fnUsuarioRolValidarTrigger"();

-- ===== PARTE 4 =====
-- Tiempos: mínimo 10 días hábiles, Campaña publicitaria 30, renombrar Promocionales, quitar Trifolio
update "Solicitudes"."TipoSolicitud" set dias_estimados = 10 where dias_estimados < 10;
update "Solicitudes"."TipoSolicitud" set dias_estimados = 30 where nombre = 'Campaña publicitaria';
update "Solicitudes"."TipoSolicitud" set nombre = 'Promociones (licitaciones)' where nombre = 'Promocionales';

alter table "Solicitudes"."TipoSolicitud"
  add constraint "chkTipoSolicitud_DiasMinimos" check (dias_estimados >= 10);

do $$
begin
  -- Si Trifolio ya tiene solicitudes, no se puede borrar (es historial): se desactiva
  if exists (select 1 from "Solicitudes"."Formularios" f
               join "Solicitudes"."TipoSolicitud" t on t.id = f.tipo_solicitud_id
              where t.nombre = 'Trifolio') then
    update "Solicitudes"."TipoSolicitud" set estado = false where nombre = 'Trifolio';
    raise notice 'Trifolio tiene solicitudes registradas: se desactivó en lugar de eliminarse.';
  else
    delete from "Solicitudes"."TipoSolicitud" where nombre = 'Trifolio';
  end if;
end $$;

-- ===== PARTE 5 =====
-- Horario hábil (L-V, 8:00 a. m. a 4:00 p. m., sin feriados) y horas hábiles
create or replace function "Solicitudes"."fnEsHorarioHabilEscalar"(p_momento timestamptz default current_timestamp)
returns boolean language sql stable security definer set search_path = '' as $$
  select "Solicitudes"."fnEsDiaHabilEscalar"((p_momento at time zone 'America/Tegucigalpa')::date)
     and (p_momento at time zone 'America/Tegucigalpa')::time >= time '08:00'
     and (p_momento at time zone 'America/Tegucigalpa')::time <  time '16:00';
$$;

-- Suma horas hábiles (solo cuenta L-V de 8:00 a 16:00, sin feriados)
create or replace function "Solicitudes"."fnSumarHorasHabilesEscalar"(p_desde timestamptz, p_horas int)
returns timestamptz language plpgsql stable security definer set search_path = '' as $$
declare
  v_local     timestamp := p_desde at time zone 'America/Tegucigalpa';
  v_restantes numeric   := p_horas * 60;
  v_dia       date;
  v_inicio    timestamp;
  v_fin       timestamp;
  v_libres    numeric;
begin
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

-- Minutos hábiles entre dos momentos (para el cronómetro del jefe)
create or replace function "Solicitudes"."fnMinutosHabilesEntreEscalar"(p_desde timestamptz, p_hasta timestamptz)
returns int language plpgsql stable security definer set search_path = '' as $$
declare
  v_local  timestamp := p_desde at time zone 'America/Tegucigalpa';
  v_hasta  timestamp := p_hasta at time zone 'America/Tegucigalpa';
  v_total  numeric   := 0;
  v_dia    date;
  v_inicio timestamp;
  v_fin    timestamp;
begin
  if p_hasta <= p_desde then return 0; end if;
  while v_local < v_hasta loop
    v_dia    := v_local::date;
    v_inicio := greatest(v_local, v_dia + time '08:00');
    v_fin    := least(v_hasta, v_dia + time '16:00');
    if "Solicitudes"."fnEsDiaHabilEscalar"(v_dia) and v_fin > v_inicio then
      v_total := v_total + extract(epoch from (v_fin - v_inicio)) / 60;
    end if;
    v_local := (v_dia + 1) + time '00:00';
  end loop;
  return floor(v_total)::int;
end;
$$;

-- La aprobación automática ahora es a las 24 horas HÁBILES (3 días hábiles completos)
create or replace function "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(p_fecha_entrega_diseno timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select p_fecha_entrega_diseno is not null
     and current_timestamp >= "Solicitudes"."fnSumarHorasHabilesEscalar"(p_fecha_entrega_diseno, 24);
$$;

grant execute on function "Solicitudes"."fnEsHorarioHabilEscalar"(timestamptz)                  to authenticated;
grant execute on function "Solicitudes"."fnSumarHorasHabilesEscalar"(timestamptz, int)           to authenticated;
grant execute on function "Solicitudes"."fnMinutosHabilesEntreEscalar"(timestamptz, timestamptz) to authenticated;

-- ===== PARTE 6 =====
-- Fecha del evento (obligatoria en todos los formularios) y solicitudes excepcionales
alter table "Solicitudes"."Formularios" add column fecha_evento date;

update "Solicitudes"."Formularios" f
   set fecha_evento = coalesce(
         (select a.fecha            from "Solicitudes"."FormularioArte" a      where a.formulario_id = f.id),
         (select p.fecha            from "Solicitudes"."FormularioProtocolo" p where p.formulario_id = f.id),
         (select g.fecha_requerida  from "Solicitudes"."FormularioGenerico" g  where g.formulario_id = f.id),
         (select v.fecha_entrega_publicacion from "Solicitudes"."FormularioVideo" v where v.formulario_id = f.id),
         (select d.fecha_necesaria  from "Solicitudes"."FormularioDircom" d    where d.formulario_id = f.id),
         (select (t.fecha_limite at time zone 'America/Tegucigalpa')::date + 1
            from "Solicitudes"."Ticket" t where t.formulario_id = f.id),
         (f.fecha_creacion at time zone 'America/Tegucigalpa')::date);

alter table "Solicitudes"."Formularios" alter column fecha_evento set not null;

-- Se quitan los campos de fecha que reemplaza "Fecha del evento"
alter table "Solicitudes"."FormularioArte"      drop column fecha;
alter table "Solicitudes"."FormularioProtocolo" drop column fecha;
alter table "Solicitudes"."FormularioGenerico"  drop column fecha_requerida;

-- Solicitudes excepcionales y estado "Rechazado"
alter table "Solicitudes"."Ticket"
  add column es_excepcional               boolean      not null default false,
  add column excepcional_estado           varchar(10),
  add column excepcional_respondido_por   int,
  add column excepcional_fecha_respuesta  timestamptz,
  add column excepcional_motivo_rechazo   text,
  add constraint "chkTicket_ExcepcionalEstado"
      check ((not es_excepcional and excepcional_estado is null)
             or (es_excepcional and excepcional_estado in ('PENDIENTE', 'ACEPTADA', 'RECHAZADA'))),
  add constraint "fkTicket_ExcepcionalRespondidoPor"
      foreign key (excepcional_respondido_por) references "Seguridad"."Usuarios" (id);

insert into "Solicitudes"."Estado" (nombre) values ('Rechazado')
on conflict on constraint "ukEstado_Nombre" do nothing;

-- Fecha límite: normal = días hábiles; excepcional = antes del evento (mínimo 4 h)
create or replace function "Solicitudes"."fnTicketCalcularFechaLimiteTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_dias         int;
  v_habiles      boolean;
  v_fecha_evento date;
begin
  select ts.dias_estimados, ts.dias_habiles into v_dias, v_habiles
    from "Solicitudes"."TipoSolicitud" ts where ts.id = new.tipo_solicitud_id;

  if v_dias is null then
    raise exception 'El tipo de solicitud % no existe.', new.tipo_solicitud_id
          using errcode = 'foreign_key_violation';
  end if;

  new.fecha_registro := coalesce(new.fecha_registro, current_timestamp);

  if new.es_excepcional then
    select fecha_evento into v_fecha_evento from "Solicitudes"."Formularios" where id = new.formulario_id;
    new.fecha_limite := greatest(new.fecha_registro + interval '4 hours',
                                 (v_fecha_evento + time '08:00') at time zone 'America/Tegucigalpa');
  elsif v_habiles then
    new.fecha_limite := "Solicitudes"."fnSumarDiasHabilesEscalar"(new.fecha_registro, v_dias);
  else
    new.fecha_limite := new.fecha_registro + make_interval(days => v_dias);
  end if;

  return new;
end;
$$;

-- Fecha mínima del evento para la app (el día siguiente a la entrega estimada)
create or replace function "Solicitudes"."fnFechaEventoMinimaEscalar"(p_tipo_solicitud_id int)
returns date language sql stable security definer set search_path = '' as $$
  select ("Solicitudes"."fnFechaLimiteCalcularEscalar"(p_tipo_solicitud_id) at time zone 'America/Tegucigalpa')::date + 1;
$$;
grant execute on function "Solicitudes"."fnFechaEventoMinimaEscalar"(int) to authenticated;

-- ===== PARTE 7 =====
-- Crear solicitud: fecha del evento, horario hábil y solicitudes excepcionales
drop function if exists "Solicitudes"."fnSolicitudCrearEscalar"(int, jsonb);

create or replace function "Solicitudes"."fnSolicitudCrearEscalar"(
  p_tipo_solicitud_id int,
  p_detalle           jsonb,
  p_excepcional       boolean default false
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id    int := "Seguridad"."fnUsuarioActualIdEscalar"();
  v_formulario_id int;
  v_ticket_id     int;
  v_formulario    varchar(20);
  v_tipo_nombre   varchar(100);
  v_dias          int;
  v_logos         varchar(100)[];
  v_hoy           date := (current_timestamp at time zone 'America/Tegucigalpa')::date;
  v_campo         text;
  v_fecha_evento  date := nullif(p_detalle->>'fecha_evento', '')::date;
  v_evento_minimo date;
  v_es_admin      boolean := "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador');
begin
  if v_usuario_id is null then
    raise exception 'Debe iniciar sesión con un usuario activo.';
  end if;

  select formulario, nombre, dias_estimados into v_formulario, v_tipo_nombre, v_dias
    from "Solicitudes"."TipoSolicitud"
   where id = p_tipo_solicitud_id and estado;

  if v_formulario is null then
    raise exception 'Tipo de solicitud inválido o inactivo.';
  end if;

  -- Solicitud excepcional: solo Jefe de Área o Administrador
  if p_excepcional and not (v_es_admin or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Jefe de Área')) then
    raise exception 'Solo un Jefe de Área puede enviar solicitudes excepcionales.' using errcode = 'check_violation';
  end if;

  -- Horario hábil: L-V 8:00 a. m. a 4:00 p. m. (salvo excepcionales y Administrador)
  if not p_excepcional and not v_es_admin and not "Solicitudes"."fnEsHorarioHabilEscalar"() then
    raise exception 'Las solicitudes solo se pueden enviar en días hábiles, de lunes a viernes de 8:00 a. m. a 4:00 p. m.'
          using errcode = 'check_violation';
  end if;

  -- Fecha del evento: obligatoria y nunca en el pasado
  if v_fecha_evento is null then
    raise exception 'La fecha del evento es obligatoria.' using errcode = 'check_violation';
  end if;

  foreach v_campo in array array['fecha_evento', 'fecha_entrega_publicacion', 'fecha_necesaria']
  loop
    if nullif(p_detalle->>v_campo, '') is not null and (p_detalle->>v_campo)::date < v_hoy then
      raise exception 'La fecha "%" (%) no puede ser anterior a hoy (%).',
            replace(v_campo, '_', ' '), to_char((p_detalle->>v_campo)::date, 'DD/MM/YYYY'), to_char(v_hoy, 'DD/MM/YYYY')
            using errcode = 'check_violation';
    end if;
  end loop;

  -- Anticipación: el evento debe ser DESPUÉS de la fecha límite de entrega (salvo excepcionales)
  if not p_excepcional then
    v_evento_minimo := "Solicitudes"."fnFechaEventoMinimaEscalar"(p_tipo_solicitud_id);
    if v_fecha_evento < v_evento_minimo then
      raise exception 'Para "%" se necesitan % días hábiles de anticipación: la fecha del evento debe ser a partir del %.',
            v_tipo_nombre, v_dias, to_char(v_evento_minimo, 'DD/MM/YYYY')
            using errcode = 'check_violation';
    end if;
  end if;

  v_logos := array(select jsonb_array_elements_text(coalesce(p_detalle->'logotipos', '[]'::jsonb)));

  insert into "Solicitudes"."Formularios" (tipo_solicitud_id, fecha_evento)
  values (p_tipo_solicitud_id, v_fecha_evento)
  returning id into v_formulario_id;

  case v_formulario
    when 'ARTE' then
      insert into "Solicitudes"."FormularioArte"
             (formulario_id, titulo, hora_inicio, hora_fin, lugar, modalidad,
              aplica_articulo_140, enlace_qr, alcance, informacion_adicional, logotipos)
      values (v_formulario_id,
              p_detalle->>'titulo',
              nullif(p_detalle->>'hora_inicio', '')::time,
              nullif(p_detalle->>'hora_fin', '')::time,
              nullif(p_detalle->>'lugar', ''),
              nullif(p_detalle->>'modalidad', ''),
              coalesce((p_detalle->>'aplica_articulo_140')::boolean, false),
              nullif(p_detalle->>'enlace_qr', ''),
              nullif(p_detalle->>'alcance', ''),
              nullif(p_detalle->>'informacion_adicional', ''),
              v_logos);

    when 'VIDEO' then
      insert into "Solicitudes"."FormularioVideo"
             (formulario_id, objetivo, fecha_entrega_publicacion, participacion_estudiantes,
              informacion_producto, encargado_actividad, logotipos)
      values (v_formulario_id,
              p_detalle->>'objetivo',
              (p_detalle->>'fecha_entrega_publicacion')::date,
              coalesce(nullif(p_detalle->>'participacion_estudiantes', ''), 'No aplica'),
              nullif(p_detalle->>'informacion_producto', ''),
              p_detalle->>'encargado_actividad',
              case when cardinality(v_logos) > 0 then v_logos
                   else '{"Logo de VOAE","Logo de la UNAH"}'::varchar(100)[] end);

    when 'DIRCOM' then
      insert into "Solicitudes"."FormularioDircom"
             (formulario_id, tipo_material, fecha_necesaria, informacion_valor, necesita_dictamen, logotipos)
      values (v_formulario_id,
              p_detalle->>'tipo_material',
              (p_detalle->>'fecha_necesaria')::date,
              p_detalle->>'informacion_valor',
              coalesce((p_detalle->>'necesita_dictamen')::boolean, false),
              case when cardinality(v_logos) > 0 then v_logos
                   else '{"Logo de VOAE","Logo de la UNAH"}'::varchar(100)[] end);

    when 'PROTOCOLO' then
      insert into "Solicitudes"."FormularioProtocolo"
             (formulario_id, nombre_actividad, lugar_propuesto, cantidad_invitados, hora,
              elaborar_invitacion, informacion_programa, necesita_maestro_ceremonia,
              maestro_ceremonia_preferido, equipo_requerido, necesita_edecanes, necesita_pumas)
      values (v_formulario_id,
              p_detalle->>'nombre_actividad',
              p_detalle->>'lugar_propuesto',
              nullif(p_detalle->>'cantidad_invitados', '')::int,
              (p_detalle->>'hora')::time,
              coalesce((p_detalle->>'elaborar_invitacion')::boolean, false),
              nullif(p_detalle->>'informacion_programa', ''),
              coalesce((p_detalle->>'necesita_maestro_ceremonia')::boolean, false),
              nullif(p_detalle->>'maestro_ceremonia_preferido', ''),
              nullif(p_detalle->>'equipo_requerido', ''),
              coalesce((p_detalle->>'necesita_edecanes')::boolean, false),
              coalesce((p_detalle->>'necesita_pumas')::boolean, false));

    else  -- GENERICO
      insert into "Solicitudes"."FormularioGenerico"
             (formulario_id, titulo, descripcion, informacion_producto, logotipos, observaciones)
      values (v_formulario_id,
              p_detalle->>'titulo',
              p_detalle->>'descripcion',
              nullif(p_detalle->>'informacion_producto', ''),
              v_logos,
              nullif(p_detalle->>'observaciones', ''));
  end case;

  insert into "Solicitudes"."Ticket"
         (tipo_solicitud_id, formulario_id, usuario_registro, es_excepcional, excepcional_estado)
  values (p_tipo_solicitud_id, v_formulario_id, v_usuario_id,
          coalesce(p_excepcional, false),
          case when p_excepcional then 'PENDIENTE' end)
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$;

grant execute on function "Solicitudes"."fnSolicitudCrearEscalar"(int, jsonb, boolean) to authenticated;

-- Diseñador acepta o rechaza una solicitud excepcional
create or replace function "Solicitudes"."fnSolicitudExcepcionalResponderEscalar"(
  p_ticket_id int,
  p_aceptar   boolean,
  p_motivo    text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_yo     int := "Seguridad"."fnUsuarioActualIdEscalar"();
  v_ticket "Solicitudes"."Ticket"%rowtype;
begin
  if not "Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador') then
    raise exception 'Solo un Diseñador puede aceptar o rechazar solicitudes excepcionales.' using errcode = 'check_violation';
  end if;

  select * into v_ticket from "Solicitudes"."Ticket" where id = p_ticket_id for update;
  if not found or not v_ticket.es_excepcional or v_ticket.excepcional_estado <> 'PENDIENTE' then
    raise exception 'El ticket no es una solicitud excepcional pendiente.' using errcode = 'check_violation';
  end if;

  if p_aceptar then
    update "Solicitudes"."Ticket"
       set excepcional_estado          = 'ACEPTADA',
           excepcional_respondido_por  = v_yo,
           excepcional_fecha_respuesta = current_timestamp,
           disenador_id                = v_yo,
           estado_id                   = "Solicitudes"."fnObtenerEstadoIdEscalar"('En proceso')
     where id = p_ticket_id;
  else
    if btrim(coalesce(p_motivo, '')) = '' then
      raise exception 'Indique el motivo del rechazo.' using errcode = 'check_violation';
    end if;
    update "Solicitudes"."Ticket"
       set excepcional_estado          = 'RECHAZADA',
           excepcional_respondido_por  = v_yo,
           excepcional_fecha_respuesta = current_timestamp,
           excepcional_motivo_rechazo  = p_motivo,
           estado_id                   = "Solicitudes"."fnObtenerEstadoIdEscalar"('Rechazado')
     where id = p_ticket_id;
  end if;

  insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
  values (v_ticket.usuario_registro, p_ticket_id,
          case when p_aceptar
               then format('Tu solicitud excepcional %s fue ACEPTADA y ya está en proceso.', v_ticket.codigo)
               else format('Tu solicitud excepcional %s fue RECHAZADA: %s', v_ticket.codigo, p_motivo) end);
end;
$$;

grant execute on function "Solicitudes"."fnSolicitudExcepcionalResponderEscalar"(int, boolean, text) to authenticated;

-- ===== PARTE 8 =====
-- Flujo de estados: hasta 5 correcciones, retraso también en Corrección, excepcionales y Rechazado
create or replace function "Solicitudes"."fnTicketValidarTransicionTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_anterior  varchar(50);
  v_nuevo     varchar(50);
  v_permitido boolean;
begin
  select nombre into v_anterior from "Solicitudes"."Estado" where id = old.estado_id;
  select nombre into v_nuevo    from "Solicitudes"."Estado" where id = new.estado_id;

  -- Una solicitud excepcional pendiente primero debe ser aceptada o rechazada por un diseñador
  if old.es_excepcional and old.excepcional_estado = 'PENDIENTE' and new.excepcional_estado = 'PENDIENTE' then
    raise exception 'La solicitud excepcional % debe ser aceptada o rechazada por un diseñador antes de trabajarse.', new.codigo
          using errcode = 'check_violation';
  end if;

  v_permitido := case v_anterior
      when 'Enviado'     then v_nuevo in ('En revisión', 'En proceso', 'Finalizado', 'Retrasado')
                              or (v_nuevo = 'Rechazado' and new.es_excepcional)
      when 'En revisión' then v_nuevo in ('En proceso', 'Finalizado', 'Retrasado')
      when 'En proceso'  then v_nuevo in ('Finalizado', 'Retrasado')
      when 'Retrasado'   then v_nuevo in ('Finalizado')
      when 'Finalizado'  then v_nuevo in ('Corrección', 'Aprobado')
      when 'Corrección'  then v_nuevo in ('Finalizado', 'Retrasado')
      else false                                      -- Aprobado y Rechazado son finales
  end;

  if not v_permitido then
    raise exception 'Transición de estado no permitida para el ticket %: "%" -> "%".', new.codigo, v_anterior, v_nuevo
          using errcode = 'check_violation';
  end if;

  if v_nuevo = 'Rechazado' and new.excepcional_estado is distinct from 'RECHAZADA' then
    raise exception 'Solo una solicitud excepcional rechazada por un diseñador pasa a "Rechazado".'
          using errcode = 'check_violation';
  end if;

  if v_nuevo = 'Finalizado' and new.fecha_entrega_diseno is null then
    raise exception 'El ticket % no puede pasar a "Finalizado" sin un entregable de diseño.', new.codigo
          using errcode = 'check_violation';
  end if;

  if v_nuevo = 'Retrasado' and new.fecha_limite >= current_timestamp then
    raise exception 'El ticket % aún no supera su fecha límite.', new.codigo
          using errcode = 'check_violation';
  end if;

  if v_nuevo = 'Corrección' and not exists (
        select 1 from "Solicitudes"."DictamenJefe" d
         where d.ticket_id = new.id and d.decision = 'CORRECCION'
           and d.fecha_dictamen >= new.fecha_entrega_diseno) then
    raise exception 'El ticket % solo pasa a "Corrección" mediante un dictamen del jefe.', new.codigo
          using errcode = 'check_violation';
  end if;

  if v_nuevo = 'Aprobado' then
    if new.aprobado_automatico then
      if not "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(new.fecha_entrega_diseno) then
        raise exception 'El ticket % aún no cumple 24 horas hábiles desde la entrega del diseño.', new.codigo
              using errcode = 'check_violation';
      end if;
    elsif not exists (select 1 from "Solicitudes"."DictamenJefe" d
                       where d.ticket_id = new.id and d.decision = 'APROBADO') then
      raise exception 'El ticket % solo pasa a "Aprobado" por dictamen del jefe o automáticamente.', new.codigo
            using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- Hasta 5 correcciones por ticket
drop index if exists "Solicitudes"."ukDictamenJefe_Correccion";

alter table "Solicitudes"."Entregables" drop constraint "chkEntregable_Version";
alter table "Solicitudes"."Entregables" add  constraint "chkEntregable_Version" check (version between 1 and 6);

-- Dictamen: horario hábil (salvo excepcionales), 24 h hábiles y máximo 5 correcciones
create or replace function "Solicitudes"."fnDictamenJefeValidarTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ticket    "Solicitudes"."Ticket"%rowtype;
  v_estado    varchar(50);
  v_jefe_area int;
begin
  select * into v_ticket from "Solicitudes"."Ticket" where id = new.ticket_id for update;
  if not found then
    raise exception 'El ticket % no existe.', new.ticket_id using errcode = 'foreign_key_violation';
  end if;
  select nombre into v_estado from "Solicitudes"."Estado" where id = v_ticket.estado_id;

  if v_estado <> 'Finalizado' then
    raise exception 'Solo se dictamina un ticket en estado "Finalizado" (el ticket % está en "%").', v_ticket.codigo, v_estado
          using errcode = 'check_violation';
  end if;

  if not v_ticket.es_excepcional and not "Solicitudes"."fnEsHorarioHabilEscalar"() then
    raise exception 'Los dictámenes solo se pueden hacer en días hábiles, de lunes a viernes de 8:00 a. m. a 4:00 p. m.'
          using errcode = 'check_violation';
  end if;

  if "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(v_ticket.fecha_entrega_diseno) then
    raise exception 'Venció el plazo de 24 horas hábiles para dictaminar el ticket %; quedó aprobado automáticamente.', v_ticket.codigo
          using errcode = 'check_violation';
  end if;

  if not "Seguridad"."fnUsuarioTieneRolEscalar"(new.jefe_id, 'Jefe de Área') then
    raise exception 'El usuario % no está activo o no tiene el rol "Jefe de Área".', new.jefe_id
          using errcode = 'check_violation';
  end if;

  select area_id into v_jefe_area from "Seguridad"."Usuarios" where id = new.jefe_id;
  if v_jefe_area is distinct from v_ticket.area_id then
    raise exception 'El jefe no pertenece al área del ticket %.', v_ticket.codigo
          using errcode = 'check_violation';
  end if;

  if new.decision = 'CORRECCION' and (select count(*) from "Solicitudes"."DictamenJefe"
                                       where ticket_id = new.ticket_id and decision = 'CORRECCION') >= 5 then
    raise exception 'El ticket % ya tuvo las 5 correcciones permitidas; solo puede aprobarse.', v_ticket.codigo
          using errcode = 'check_violation';
  end if;

  new.fecha_dictamen := coalesce(new.fecha_dictamen, current_timestamp);
  return new;
end;
$$;

create or replace function "Solicitudes"."fnDictamenJefeAplicarTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ticket "Solicitudes"."Ticket"%rowtype;
  v_num    int;
begin
  update "Solicitudes"."Ticket"
     set estado_id = "Solicitudes"."fnObtenerEstadoIdEscalar"(
                         case new.decision when 'APROBADO' then 'Aprobado' else 'Corrección' end)
   where id = new.ticket_id
  returning * into v_ticket;

  select count(*) into v_num from "Solicitudes"."DictamenJefe"
   where ticket_id = new.ticket_id and decision = 'CORRECCION';

  if v_ticket.disenador_id is not null then
    insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
    values (v_ticket.disenador_id, new.ticket_id,
            case new.decision
              when 'APROBADO' then format('El ticket %s fue aprobado por el jefe de área.', v_ticket.codigo)
              else format('El ticket %s requiere corrección (%s/5): %s', v_ticket.codigo, v_num, new.comentario)
            end);
  end if;
  return null;
end;
$$;

-- ===== PARTE 9 =====
-- Tareas automáticas con códigos, retraso en Corrección y 24 horas hábiles
create or replace function "Solicitudes"."fnVerificarTicketsRetrasados"()
returns int language plpgsql set search_path = '' as $$
declare
  v_total int;
begin
  with retrasados as (
      update "Solicitudes"."Ticket" t
         set estado_id = "Solicitudes"."fnObtenerEstadoIdEscalar"('Retrasado')
        from "Solicitudes"."Estado" e
       where e.id = t.estado_id
         and t.fecha_limite < current_timestamp
         and not (t.es_excepcional and t.excepcional_estado = 'PENDIENTE')
         and ((e.nombre in ('Enviado', 'En revisión', 'En proceso') and t.fecha_entrega_diseno is null)
              or e.nombre = 'Corrección')
      returning t.id, t.codigo, t.disenador_id, t.tipo_solicitud_id, t.fecha_limite
  ),
  destinatarios as (
      select r.id as ticket_id, r.codigo, r.disenador_id as usuario_id, r.tipo_solicitud_id, r.fecha_limite
        from retrasados r where r.disenador_id is not null
      union
      select r.id, r.codigo, ur.usuario_id, r.tipo_solicitud_id, r.fecha_limite
        from retrasados r
        join "Seguridad"."UsuariosRoles" ur on true
        join "Seguridad"."Roles"    ro on ro.id = ur.rol_id and ro.nombre = 'Diseñador' and ro.estado
        join "Seguridad"."Usuarios" u  on u.id  = ur.usuario_id and u.estado
       where r.disenador_id is null
  ),
  notificadas as (
      insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
      select d.usuario_id, d.ticket_id,
             format('El ticket %s (%s) está RETRASADO: su fecha límite era %s.',
                    d.codigo, ts.nombre, to_char(d.fecha_limite at time zone 'America/Tegucigalpa', 'DD/MM/YYYY HH24:MI'))
        from destinatarios d
        join "Solicitudes"."TipoSolicitud" ts on ts.id = d.tipo_solicitud_id
      returning 1
  )
  select count(*) into v_total from retrasados;
  return v_total;
end;
$$;

create or replace function "Solicitudes"."fnAprobarTicketsAutomaticamente"()
returns int language plpgsql set search_path = '' as $$
declare
  v_total int;
begin
  with aprobados as (
      update "Solicitudes"."Ticket" t
         set estado_id           = "Solicitudes"."fnObtenerEstadoIdEscalar"('Aprobado'),
             aprobado_automatico = true
        from "Solicitudes"."Estado" e
       where e.id = t.estado_id
         and e.nombre = 'Finalizado'
         and "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(t.fecha_entrega_diseno)
      returning t.id, t.codigo, t.usuario_registro, t.disenador_id
  ),
  notificadas as (
      insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
      select x.usuario_id, a.id,
             format('El ticket %s fue aprobado automáticamente (24 horas hábiles sin dictamen del jefe).', a.codigo)
        from aprobados a
        cross join lateral (values (a.usuario_registro), (a.disenador_id)) as x(usuario_id)
       where x.usuario_id is not null
      returning 1
  )
  select count(*) into v_total from aprobados;
  return v_total;
end;
$$;

-- Aviso al entregar (con código y 24 horas hábiles)
create or replace function "Solicitudes"."fnTicketNotificarFinalizadoTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado_id <> "Solicitudes"."fnObtenerEstadoIdEscalar"('Finalizado') then
    return null;
  end if;

  insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
  values (new.usuario_registro, new.id, format('Tu ticket %s ya tiene un diseño entregado.', new.codigo));

  insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
  select u.id, new.id,
         format('El ticket %s espera tu dictamen. Tienes 24 horas hábiles para aprobar o pedir corrección.', new.codigo)
    from "Seguridad"."Usuarios" u
   where u.area_id = new.area_id
     and "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, 'Jefe de Área');
  return null;
end;
$$;

-- Aviso al asignar o reasignar un ticket
create or replace function "Solicitudes"."fnTicketNotificarAsignacionTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_yo int := "Seguridad"."fnUsuarioActualIdEscalar"();
begin
  if new.disenador_id is not null and new.disenador_id is distinct from v_yo then
    insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
    values (new.disenador_id, new.id, format('Se te asignó el ticket %s.', new.codigo));
  end if;
  if old.disenador_id is not null and old.disenador_id is distinct from v_yo then
    insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
    values (old.disenador_id, new.id, format('El ticket %s fue reasignado a otro diseñador.', new.codigo));
  end if;
  return null;
end;
$$;

create trigger "tgrTicketNotificarAsignacionActualizar"
after update of disenador_id on "Solicitudes"."Ticket"
for each row
when (old.disenador_id is distinct from new.disenador_id)
execute function "Solicitudes"."fnTicketNotificarAsignacionTrigger"();

-- ===== PARTE 10 =====
-- Vista con código, nombres visibles, excepcionales, correcciones X/5 y cronómetro en horas hábiles
drop view if exists "Solicitudes"."vw_TicketsEstadoReal";

create view "Solicitudes"."vw_TicketsEstadoReal"
with (security_invoker = true)
as
select
    t.id                                                   as ticket_id,
    t.codigo,
    t.tipo_solicitud_id,
    ts.nombre                                              as tipo_solicitud,
    ts.formulario,
    t.area_id,
    a.nombre                                               as area,
    t.usuario_registro,
    (select n.nombre from "Seguridad"."fnUsuariosNombresTabla"() n where n.id = t.usuario_registro) as solicitante,
    t.disenador_id,
    (select n.nombre from "Seguridad"."fnUsuariosNombresTabla"() n where n.id = t.disenador_id)     as disenador,
    e.nombre                                               as estado_registrado,
    case
        when e.nombre = 'Aprobado' and t.aprobado_automatico                           then 'Aprobado (Automático)'
        when e.nombre = 'Finalizado'
             and "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(t.fecha_entrega_diseno) then 'Aprobado (Automático)'
        when t.fecha_limite < current_timestamp
             and not (t.es_excepcional and t.excepcional_estado = 'PENDIENTE')
             and ((e.nombre in ('Enviado', 'En revisión', 'En proceso') and t.fecha_entrega_diseno is null)
                  or e.nombre = 'Corrección')                                          then 'Retrasado'
        else e.nombre
    end                                                    as estado_real,
    f.fecha_evento,
    t.fecha_registro,
    t.fecha_limite,
    t.fecha_entrega_diseno,
    case when t.fecha_entrega_diseno is not null
         then "Solicitudes"."fnSumarHorasHabilesEscalar"(t.fecha_entrega_diseno, 24) end
                                                           as fecha_aprobacion_automatica,
    case when e.nombre = 'Finalizado'
              and not "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(t.fecha_entrega_diseno)
         then "Solicitudes"."fnMinutosHabilesEntreEscalar"(
                  current_timestamp,
                  "Solicitudes"."fnSumarHorasHabilesEscalar"(t.fecha_entrega_diseno, 24)) end
                                                           as minutos_habiles_restantes_dictamen,
    (t.fecha_entrega_diseno is null and t.fecha_limite < current_timestamp) as fuera_de_plazo,
    (select count(*) from "Solicitudes"."DictamenJefe" d
      where d.ticket_id = t.id and d.decision = 'CORRECCION')::int as correcciones_usadas,
    5                                                      as correcciones_maximas,
    t.aprobado_automatico,
    t.es_excepcional,
    t.excepcional_estado,
    t.excepcional_motivo_rechazo
from "Solicitudes"."Ticket" t
join "Solicitudes"."TipoSolicitud" ts on ts.id = t.tipo_solicitud_id
join "Solicitudes"."Formularios"   f  on f.id  = t.formulario_id
join "Solicitudes"."Estado"        e  on e.id  = t.estado_id
join "Seguridad"."Areas"           a  on a.id  = t.area_id;

grant select on "Solicitudes"."vw_TicketsEstadoReal" to authenticated;

-- Estadísticas con código y excepcionales
drop function if exists "Solicitudes"."fnEstadisticasTicketsTabla"(date, date, int, int);

create or replace function "Solicitudes"."fnEstadisticasTicketsTabla"(
  p_desde             date default null,
  p_hasta             date default null,
  p_area_id           int  default null,
  p_tipo_solicitud_id int  default null
)
returns table (
  ticket_id            int,
  codigo               text,
  tipo_solicitud       text,
  area                 text,
  estado_real          text,
  disenador            text,
  fecha_registro       timestamptz,
  fecha_limite         timestamptz,
  fecha_entrega_diseno timestamptz,
  fecha_evento         date,
  dias_resolucion      numeric,
  entregado_a_tiempo   boolean,
  correcciones_usadas  int,
  aprobado_automatico  boolean,
  es_excepcional       boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Analista')
          or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')) then
    raise exception 'Solo un Analista o un Administrador puede ver las estadísticas.';
  end if;

  return query
  select v.ticket_id, v.codigo::text, v.tipo_solicitud::text, v.area::text, v.estado_real::text,
         (select u.nombre_completo from "Seguridad"."Usuarios" u where u.id = v.disenador_id)::text,
         v.fecha_registro, v.fecha_limite, v.fecha_entrega_diseno, v.fecha_evento,
         round((extract(epoch from (v.fecha_entrega_diseno - v.fecha_registro)) / 86400.0)::numeric, 1),
         case when v.fecha_entrega_diseno is null then null else v.fecha_entrega_diseno <= v.fecha_limite end,
         v.correcciones_usadas, v.aprobado_automatico, v.es_excepcional
    from "Solicitudes"."vw_TicketsEstadoReal" v
   where (p_desde is null or (v.fecha_registro at time zone 'America/Tegucigalpa')::date >= p_desde)
     and (p_hasta is null or (v.fecha_registro at time zone 'America/Tegucigalpa')::date <= p_hasta)
     and (p_area_id is null or v.area_id = p_area_id)
     and (p_tipo_solicitud_id is null or v.tipo_solicitud_id = p_tipo_solicitud_id)
   order by v.ticket_id desc;
end;
$$;

-- ===== PARTE 11 =====
-- Visibilidad: diseñador ve sin asignar + los suyos; Asignador ve todos; entregables solo para el equipo y el jefe
drop policy "polTicketLeer"       on "Solicitudes"."Ticket";
drop policy "polTicketActualizar" on "Solicitudes"."Ticket";

create policy "polTicketLeer" on "Solicitudes"."Ticket"
  for select to authenticated
  using (usuario_registro = "Seguridad"."fnUsuarioActualIdEscalar"()
         or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')
         or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Asignador')
         or ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
             and (disenador_id is null or disenador_id = "Seguridad"."fnUsuarioActualIdEscalar"()))
         or ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Jefe de Área')
             and area_id = "Seguridad"."fnUsuarioActualAreaEscalar"()));

-- Admin y Asignador: cualquier ticket y a cualquier diseñador
create policy "polTicketActualizarAsignador" on "Solicitudes"."Ticket"
  for update to authenticated
  using ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')
         or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Asignador'))
  with check ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')
              or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Asignador'));

-- Diseñador: solo tickets sin asignar o suyos, y solo se los puede asignar a sí mismo
create policy "polTicketActualizarDisenador" on "Solicitudes"."Ticket"
  for update to authenticated
  using ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
         and (disenador_id is null or disenador_id = "Seguridad"."fnUsuarioActualIdEscalar"()))
  with check ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
              and disenador_id = "Seguridad"."fnUsuarioActualIdEscalar"());

-- Entregables: equipo de diseño, admin y jefe del área; NO el solicitante
drop policy "polEntregablesLeer"  on "Solicitudes"."Entregables";
drop policy "polEntregablesSubir" on "Solicitudes"."Entregables";

create policy "polEntregablesLeer" on "Solicitudes"."Entregables"
  for select to authenticated
  using (exists (select 1 from "Solicitudes"."Ticket" t
                  where t.id = "Entregables".ticket_id
                    and ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')
                         or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
                         or ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Jefe de Área')
                             and t.area_id = "Seguridad"."fnUsuarioActualAreaEscalar"()))));

create policy "polEntregablesSubir" on "Solicitudes"."Entregables"
  for insert to authenticated
  with check (disenador_id = "Seguridad"."fnUsuarioActualIdEscalar"()
              and "Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
              and exists (select 1 from "Solicitudes"."Ticket" t where t.id = "Entregables".ticket_id)
              and (tipo_entregable = 'LINK'
                   or split_part(url_o_ruta, '/', 1) = ticket_id::text));

drop policy "polEntregablesStorageLeer" on storage.objects;
create policy "polEntregablesStorageLeer" on storage.objects
  for select to authenticated
  using (bucket_id = 'entregables'
         and exists (select 1 from "Solicitudes"."Ticket" t
                      where t.id = "Solicitudes"."fnTicketIdDesdeRutaEscalar"(name)
                        and ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')
                             or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
                             or ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Jefe de Área')
                                 and t.area_id = "Seguridad"."fnUsuarioActualAreaEscalar"()))));

-- Lista de diseñadores para el tablero del Asignador (y del Administrador)
create or replace function "Seguridad"."fnDisenadoresTabla"()
returns table (id int, nombre varchar, es_asignador boolean)
language sql stable security definer set search_path = '' as $$
  select u.id, u.nombre_completo, "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, 'Asignador')
    from "Seguridad"."Usuarios" u
   where u.estado
     and "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, 'Diseñador')
     and ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Asignador')
          or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador'))
   order by u.nombre_completo;
$$;
revoke execute on function "Seguridad"."fnDisenadoresTabla"() from public, anon;
grant  execute on function "Seguridad"."fnDisenadoresTabla"() to authenticated;

-- ===== PARTE 12 =====
notify pgrst, 'reload schema';
