-- Cambios en la base de datos - Gestión de Solicitudes VOAE (2026-10-06)
-- Ejecutar cada PARTE por separado, en orden y una sola vez. Ver el PDF para el detalle.
-- Plazos en días hábiles (lunes a viernes, sin feriados registrados). Incluye adjuntos del solicitante.

-- ============================== PARTE 1 =====
truncate table
  "Solicitudes"."Notificaciones",
  "Solicitudes"."DictamenJefe",
  "Solicitudes"."Entregables",
  "Solicitudes"."TicketLog",
  "Solicitudes"."Ticket",
  "Solicitudes"."FormularioAfiche",
  "Solicitudes"."FormularioComunicado",
  "Solicitudes"."FormularioAviso",
  "Solicitudes"."FormularioCoberturaEventos",
  "Solicitudes"."FormularioEdicionFotografica",
  "Solicitudes"."FormularioPublicacionRedesSociales",
  "Solicitudes"."Formularios";

-- ============================== PARTE 2 =====
alter table "Solicitudes"."TipoSolicitud"
  add column formulario       varchar(20)  not null default 'GENERICO',
  add column dias_habiles     boolean      not null default true,
  add column descripcion      text,
  add column usuario_registro int,
  add column fecha_registro   timestamptz  not null default current_timestamp,
  add constraint "chkTipoSolicitud_Formulario"
      check (formulario in ('ARTE', 'VIDEO', 'DIRCOM', 'PROTOCOLO', 'GENERICO')),
  add constraint "fkTipoSolicitud_UsuarioRegistro"
      foreign key (usuario_registro) references "Seguridad"."Usuarios" (id);

-- Quién crea un tipo de solicitud desde la app (lo pone la base, no el frontend)
create or replace function "Solicitudes"."fnTipoSolicitudRegistrarUsuarioTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.usuario_registro := coalesce("Seguridad"."fnUsuarioActualIdEscalar"(), new.usuario_registro);
  new.fecha_registro   := current_timestamp;
  return new;
end;
$$;

create trigger "tgrTipoSolicitudInsertar"
before insert on "Solicitudes"."TipoSolicitud"
for each row execute function "Solicitudes"."fnTipoSolicitudRegistrarUsuarioTrigger"();

-- Catálogo nuevo según la tabla de tiempos de la VOAE (todos en días hábiles, lunes a viernes)
-- 1 semana = 5, 2 semanas = 10, 1 mes = 20 días hábiles
insert into "Solicitudes"."TipoSolicitud" (nombre, dias_estimados, dias_habiles, formulario, descripcion)
values
  ('Afiche',                                                          6, true, 'ARTE',      null),
  ('Trifolio',                                                       10, true, 'DIRCOM',    null),
  ('Invitación',                                                      2, true, 'ARTE',      null),
  ('Invitación para evento formal (oficio autoridades)',             10, true, 'PROTOCOLO', '2 semanas'),
  ('Diploma',                                                         4, true, 'GENERICO',  null),
  ('Banner tradicional',                                              5, true, 'ARTE',      null),
  ('Campaña publicitaria',                                           20, true, 'DIRCOM',    'Solicitud anticipada de un mes (DIRCOM)'),
  ('Señalización',                                                    4, true, 'GENERICO',  null),
  ('Promocionales',                                                   7, true, 'DIRCOM',    null),
  ('Actualización en páginas web',                                    2, true, 'GENERICO',  null),
  ('Plantilla de PowerPoint',                                         4, true, 'GENERICO',  null),
  ('Logotipo',                                                       20, true, 'DIRCOM',    'Solicitud anticipada de un mes (DIRCOM)'),
  ('Grabación y edición de videos, spots o cortinas institucionales', 15, true, 'VIDEO',     null),
  ('Solicitud de maestro de ceremonia',                               5, true, 'PROTOCOLO', '1 semana'),
  ('Actividad de la VOAE',                                           10, true, 'PROTOCOLO', '2 semanas'),
  ('Eventos de la VOAE',                                             20, true, 'PROTOCOLO', '1 mes de anticipación. Ej.: Galardón al Mérito Estudiantil, Día del Estudiante, Comienzo de tutorías')
on conflict on constraint "ukTipoSolicitud_Nombre" do update
   set dias_estimados = excluded.dias_estimados,
       dias_habiles   = excluded.dias_habiles,
       formulario     = excluded.formulario,
       descripcion    = excluded.descripcion,
       estado         = true;

-- Quitar los tipos que ya no están en la tabla
delete from "Solicitudes"."TipoSolicitud"
 where nombre in ('Edición fotográfica', 'Cobertura de eventos', 'Comunicado',
                  'Publicación en redes sociales', 'Aviso');

-- ============================== PARTE 3 =====
-- 3.1 Feriados y días inhábiles (los registra el admin desde la app)
create table "Solicitudes"."Feriados"
(
    id                int           not null generated always as identity,
    nombre            varchar(150)  not null,
    fecha_inicio      date          not null,
    fecha_fin         date          not null,
    estado            boolean       not null default true,
    usuario_registro  int,
    fecha_registro    timestamptz   not null default current_timestamp,
    constraint "pkFeriado"                  primary key (id),
    constraint "fkFeriado_UsuarioRegistro"  foreign key (usuario_registro)
        references "Seguridad"."Usuarios" (id),
    constraint "chkFeriado_Fechas"          check (fecha_fin >= fecha_inicio)
);
create index "ixFeriado_Fechas" on "Solicitudes"."Feriados" (fecha_inicio, fecha_fin) where estado;

create or replace function "Solicitudes"."fnFeriadoRegistrarUsuarioTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.usuario_registro := coalesce("Seguridad"."fnUsuarioActualIdEscalar"(), new.usuario_registro);
  new.fecha_registro   := current_timestamp;
  return new;
end;
$$;

create trigger "tgrFeriadosInsertar"
before insert on "Solicitudes"."Feriados"
for each row execute function "Solicitudes"."fnFeriadoRegistrarUsuarioTrigger"();

alter table "Solicitudes"."Feriados" enable row level security;

create policy "polFeriadosLeer" on "Solicitudes"."Feriados"
  for select to authenticated using (true);
create policy "polFeriadosAdministrar" on "Solicitudes"."Feriados"
  for all to authenticated
  using ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador'))
  with check ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador'));

-- 3.2 ¿Es día hábil? (lunes a viernes y no es feriado activo)
create or replace function "Solicitudes"."fnEsDiaHabilEscalar"(p_dia date)
returns boolean language sql stable security definer set search_path = '' as $$
  select extract(isodow from p_dia) < 6
     and not exists (select 1 from "Solicitudes"."Feriados" f
                      where f.estado and p_dia between f.fecha_inicio and f.fecha_fin);
$$;

-- 3.3 Sumar N días hábiles a una fecha (misma hora del día)
create or replace function "Solicitudes"."fnSumarDiasHabilesEscalar"(p_desde timestamptz, p_dias int)
returns timestamptz language plpgsql stable security definer set search_path = '' as $$
declare
  v_fecha    timestamptz := p_desde;
  v_contados int := 0;
begin
  while v_contados < p_dias loop
    v_fecha := v_fecha + interval '1 day';
    if "Solicitudes"."fnEsDiaHabilEscalar"((v_fecha at time zone 'America/Tegucigalpa')::date) then
      v_contados := v_contados + 1;
    end if;
  end loop;
  return v_fecha;
end;
$$;

-- 3.4 Vista previa de la fecha límite para la app (antes de enviar la solicitud)
create or replace function "Solicitudes"."fnFechaLimiteCalcularEscalar"(p_tipo_solicitud_id int)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select case when ts.dias_habiles
              then "Solicitudes"."fnSumarDiasHabilesEscalar"(current_timestamp, ts.dias_estimados)
              else current_timestamp + make_interval(days => ts.dias_estimados) end
    from "Solicitudes"."TipoSolicitud" ts
   where ts.id = p_tipo_solicitud_id;
$$;

grant execute on function "Solicitudes"."fnEsDiaHabilEscalar"(date)                     to authenticated;
grant execute on function "Solicitudes"."fnSumarDiasHabilesEscalar"(timestamptz, int)    to authenticated;
grant execute on function "Solicitudes"."fnFechaLimiteCalcularEscalar"(int)              to authenticated;

-- 3.5 Trigger que calcula la fecha límite de cada ticket nuevo
create or replace function "Solicitudes"."fnTicketCalcularFechaLimiteTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_dias    int;
  v_habiles boolean;
begin
  select ts.dias_estimados, ts.dias_habiles
    into v_dias, v_habiles
    from "Solicitudes"."TipoSolicitud" ts
   where ts.id = new.tipo_solicitud_id;

  if v_dias is null then
    raise exception 'El tipo de solicitud % no existe.', new.tipo_solicitud_id
          using errcode = 'foreign_key_violation';
  end if;

  new.fecha_registro := coalesce(new.fecha_registro, current_timestamp);

  if v_habiles then
    -- Solo lunes a viernes, sin feriados (hora de Honduras)
    new.fecha_limite := "Solicitudes"."fnSumarDiasHabilesEscalar"(new.fecha_registro, v_dias);
  else
    new.fecha_limite := new.fecha_registro + make_interval(days => v_dias);
  end if;

  return new;
end;
$$;

-- ============================== PARTE 4 =====
drop table "Solicitudes"."FormularioAfiche",
           "Solicitudes"."FormularioComunicado",
           "Solicitudes"."FormularioAviso",
           "Solicitudes"."FormularioCoberturaEventos",
           "Solicitudes"."FormularioEdicionFotografica",
           "Solicitudes"."FormularioPublicacionRedesSociales";

-- 4.1 Arte para plataformas sociales (FB, IG, TikTok, Telegram) / piezas gráficas
create table "Solicitudes"."FormularioArte"
(
    formulario_id         int            not null,
    titulo                varchar(200)   not null,
    fecha                 date,
    hora_inicio           time,
    hora_fin              time,
    lugar                 varchar(200),
    modalidad             varchar(15),
    aplica_articulo_140   boolean        not null default false,
    enlace_qr             varchar(500),
    alcance               varchar(30),
    informacion_adicional text,
    logotipos             varchar(100)[] not null default '{}',
    constraint "pkFormularioArte"             primary key (formulario_id),
    constraint "fkFormularioArte_Formulario"  foreign key (formulario_id)
        references "Solicitudes"."Formularios" (id) on delete cascade,
    constraint "chkFormularioArte_Modalidad"  check (modalidad in ('Presencial', 'No presencial')),
    constraint "chkFormularioArte_Alcance"    check (alcance in ('Todos los centros regionales', 'Solo Ciudad Universitaria')),
    constraint "chkFormularioArte_EnlaceQr"   check (enlace_qr ~* '^https?://'),
    constraint "chkFormularioArte_Horas"      check (hora_fin is null or hora_inicio is null or hora_fin >= hora_inicio)
);

-- 4.2 Video promocional
create table "Solicitudes"."FormularioVideo"
(
    formulario_id             int            not null,
    objetivo                  text           not null,
    fecha_entrega_publicacion date           not null,
    participacion_estudiantes varchar(20)    not null default 'No aplica',
    informacion_producto      text,
    encargado_actividad       varchar(150)   not null,
    logotipos                 varchar(100)[] not null default '{"Logo de VOAE","Logo de la UNAH"}',
    constraint "pkFormularioVideo"                          primary key (formulario_id),
    constraint "fkFormularioVideo_Formulario"               foreign key (formulario_id)
        references "Solicitudes"."Formularios" (id) on delete cascade,
    constraint "chkFormularioVideo_ParticipacionEstudiantes"
        check (participacion_estudiantes in ('No aplica', 'Artículo 140', 'Horas beca'))
);

-- 4.3 Solicitud de diseño a DIRCOM
create table "Solicitudes"."FormularioDircom"
(
    formulario_id      int            not null,
    tipo_material      varchar(150)   not null,
    fecha_necesaria    date           not null,
    informacion_valor  text           not null,
    necesita_dictamen  boolean        not null default false,
    logotipos          varchar(100)[] not null default '{"Logo de VOAE","Logo de la UNAH"}',
    constraint "pkFormularioDircom"             primary key (formulario_id),
    constraint "fkFormularioDircom_Formulario"  foreign key (formulario_id)
        references "Solicitudes"."Formularios" (id) on delete cascade
);

-- 4.4 Protocolo para eventos de VOAE
create table "Solicitudes"."FormularioProtocolo"
(
    formulario_id                int           not null,
    nombre_actividad             varchar(200)  not null,
    lugar_propuesto              varchar(300)  not null,
    cantidad_invitados           int,
    fecha                        date          not null,
    hora                         time          not null,
    elaborar_invitacion          boolean       not null default false,
    informacion_programa         text,
    necesita_maestro_ceremonia   boolean       not null default false,
    maestro_ceremonia_preferido  varchar(150),
    equipo_requerido             text,
    necesita_edecanes            boolean       not null default false,
    necesita_pumas               boolean       not null default false,
    constraint "pkFormularioProtocolo"                   primary key (formulario_id),
    constraint "fkFormularioProtocolo_Formulario"        foreign key (formulario_id)
        references "Solicitudes"."Formularios" (id) on delete cascade,
    constraint "chkFormularioProtocolo_CantidadInvitados" check (cantidad_invitados > 0)
);

-- 4.5 Genérico (para los tipos sin formulario propio)
create table "Solicitudes"."FormularioGenerico"
(
    formulario_id         int            not null,
    titulo                varchar(200)   not null,
    descripcion           text           not null,
    fecha_requerida       date,
    informacion_producto  text,
    logotipos             varchar(100)[] not null default '{}',
    observaciones         text,
    constraint "pkFormularioGenerico"             primary key (formulario_id),
    constraint "fkFormularioGenerico_Formulario"  foreign key (formulario_id)
        references "Solicitudes"."Formularios" (id) on delete cascade
);

-- RLS y políticas: visibles para quien puede ver el ticket
do $$
declare t text;
begin
  foreach t in array array['FormularioArte', 'FormularioVideo', 'FormularioDircom',
                           'FormularioProtocolo', 'FormularioGenerico']
  loop
    execute format('alter table "Solicitudes".%I enable row level security', t);
    execute format(
      'create policy %I on "Solicitudes".%I for select to authenticated
         using (exists (select 1 from "Solicitudes"."Ticket" k
                         where k.formulario_id = %I.formulario_id))',
      'pol' || t || 'Leer', t, t);
  end loop;
end $$;

-- ============================== PARTE 5 =====
create or replace function "Solicitudes"."fnSolicitudCrearEscalar"(
  p_tipo_solicitud_id int,
  p_detalle jsonb
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
  v_logos         varchar(100)[];
  v_hoy           date := (current_timestamp at time zone 'America/Tegucigalpa')::date;
  v_campo         text;
begin
  if v_usuario_id is null then
    raise exception 'Debe iniciar sesión con un usuario activo.';
  end if;

  select formulario into v_formulario
    from "Solicitudes"."TipoSolicitud"
   where id = p_tipo_solicitud_id and estado;

  if v_formulario is null then
    raise exception 'Tipo de solicitud inválido o inactivo.';
  end if;

  -- Ninguna fecha del formulario puede ser anterior a hoy (hora de Honduras)
  foreach v_campo in array array['fecha', 'fecha_entrega_publicacion', 'fecha_necesaria', 'fecha_requerida']
  loop
    if nullif(p_detalle->>v_campo, '') is not null
       and (p_detalle->>v_campo)::date < v_hoy then
      raise exception 'La fecha "%" (%) no puede ser anterior a hoy (%).',
            replace(v_campo, '_', ' '),
            to_char((p_detalle->>v_campo)::date, 'DD/MM/YYYY'),
            to_char(v_hoy, 'DD/MM/YYYY')
            using errcode = 'check_violation';
    end if;
  end loop;

  v_logos := array(select jsonb_array_elements_text(coalesce(p_detalle->'logotipos', '[]'::jsonb)));

  insert into "Solicitudes"."Formularios" (tipo_solicitud_id)
  values (p_tipo_solicitud_id)
  returning id into v_formulario_id;

  case v_formulario
    when 'ARTE' then
      insert into "Solicitudes"."FormularioArte"
             (formulario_id, titulo, fecha, hora_inicio, hora_fin, lugar, modalidad,
              aplica_articulo_140, enlace_qr, alcance, informacion_adicional, logotipos)
      values (v_formulario_id,
              p_detalle->>'titulo',
              nullif(p_detalle->>'fecha', '')::date,
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
             (formulario_id, tipo_material, fecha_necesaria, informacion_valor,
              necesita_dictamen, logotipos)
      values (v_formulario_id,
              p_detalle->>'tipo_material',
              (p_detalle->>'fecha_necesaria')::date,
              p_detalle->>'informacion_valor',
              coalesce((p_detalle->>'necesita_dictamen')::boolean, false),
              case when cardinality(v_logos) > 0 then v_logos
                   else '{"Logo de VOAE","Logo de la UNAH"}'::varchar(100)[] end);

    when 'PROTOCOLO' then
      insert into "Solicitudes"."FormularioProtocolo"
             (formulario_id, nombre_actividad, lugar_propuesto, cantidad_invitados, fecha, hora,
              elaborar_invitacion, informacion_programa, necesita_maestro_ceremonia,
              maestro_ceremonia_preferido, equipo_requerido, necesita_edecanes, necesita_pumas)
      values (v_formulario_id,
              p_detalle->>'nombre_actividad',
              p_detalle->>'lugar_propuesto',
              nullif(p_detalle->>'cantidad_invitados', '')::int,
              (p_detalle->>'fecha')::date,
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
             (formulario_id, titulo, descripcion, fecha_requerida,
              informacion_producto, logotipos, observaciones)
      values (v_formulario_id,
              p_detalle->>'titulo',
              p_detalle->>'descripcion',
              nullif(p_detalle->>'fecha_requerida', '')::date,
              nullif(p_detalle->>'informacion_producto', ''),
              v_logos,
              nullif(p_detalle->>'observaciones', ''));
  end case;

  insert into "Solicitudes"."Ticket" (tipo_solicitud_id, formulario_id, usuario_registro)
  values (p_tipo_solicitud_id, v_formulario_id, v_usuario_id)
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$;

grant execute on function "Solicitudes"."fnSolicitudCrearEscalar"(int, jsonb) to authenticated;

-- ============================== PARTE 6 =====
alter table "Solicitudes"."TicketLog"
  add column usuario_registro int,
  add constraint "fkTicketLog_UsuarioRegistro"
      foreign key (usuario_registro) references "Seguridad"."Usuarios" (id);

create index "ixTicketLog_UsuarioRegistro" on "Solicitudes"."TicketLog" (usuario_registro);

create or replace function "Solicitudes"."fnTicketRegistrarLogTrigger"()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cambios   text[] := array[]::text[];
    v_version   int;
    v_anterior  varchar(100);
    v_nuevo     varchar(100);
begin
    if tg_op = 'INSERT' then
        select nombre into v_nuevo from "Solicitudes"."Estado" where id = new.estado_id;
        v_cambios := array_append(v_cambios,
            format('Ticket creado con estado "%s"; fecha límite %s', v_nuevo,
                   to_char(new.fecha_limite, 'YYYY-MM-DD HH24:MI TZ')));
    else
        if new.estado_id is distinct from old.estado_id then
            select nombre into v_anterior from "Solicitudes"."Estado" where id = old.estado_id;
            select nombre into v_nuevo    from "Solicitudes"."Estado" where id = new.estado_id;
            v_cambios := array_append(v_cambios, format('Estado: "%s" -> "%s"%s', v_anterior, v_nuevo,
                         case when new.aprobado_automatico and not old.aprobado_automatico
                              then ' (automático, 24 h sin dictamen)' else '' end));
        end if;

        if new.disenador_id is distinct from old.disenador_id then
            select nombre into v_anterior from "Seguridad"."Usuarios" where id = old.disenador_id;
            select nombre into v_nuevo    from "Seguridad"."Usuarios" where id = new.disenador_id;
            v_cambios := array_append(v_cambios, format('Diseñador: %s -> %s',
                         coalesce(v_anterior, '(sin asignar)'), coalesce(v_nuevo, '(sin asignar)')));
        end if;

        if new.fecha_entrega_diseno is distinct from old.fecha_entrega_diseno then
            v_cambios := array_append(v_cambios, format('Entrega de diseño registrada: %s',
                         to_char(new.fecha_entrega_diseno, 'YYYY-MM-DD HH24:MI TZ')));
        end if;

        if new.tipo_solicitud_id is distinct from old.tipo_solicitud_id then
            v_cambios := array_append(v_cambios, format('Tipo de solicitud: %s -> %s', old.tipo_solicitud_id, new.tipo_solicitud_id));
        end if;

        if new.area_id is distinct from old.area_id then
            v_cambios := array_append(v_cambios, format('Área: %s -> %s', old.area_id, new.area_id));
        end if;

        if new.fecha_limite is distinct from old.fecha_limite then
            v_cambios := array_append(v_cambios, format('Fecha límite: %s -> %s',
                         to_char(old.fecha_limite, 'YYYY-MM-DD HH24:MI TZ'), to_char(new.fecha_limite, 'YYYY-MM-DD HH24:MI TZ')));
        end if;

        if cardinality(v_cambios) = 0 then
            return null;
        end if;
    end if;

    select coalesce(max(numero_version), 0) + 1 into v_version
      from "Solicitudes"."TicketLog" where ticket_id = new.id;

    -- usuario_registro = quien hizo el cambio; null = el sistema (tareas automáticas)
    insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, usuario_registro)
    values (new.id, v_version, array_to_string(v_cambios, '; '), "Seguridad"."fnUsuarioActualIdEscalar"());

    return null;
end;
$$;

-- ============================== PARTE 7 =====
alter table "Seguridad"."UsuariosRolesLog"
  add column usuario_registro int,
  add constraint "fkUsuarioRolLog_UsuarioRegistro"
      foreign key (usuario_registro) references "Seguridad"."Usuarios" (id);

create or replace function "Seguridad"."fnUsuarioRolRegistrarLogTrigger"()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Quién hizo el cambio: el usuario logueado, o el admin que creó la cuenta (Edge Function)
  v_quien int := coalesce("Seguridad"."fnUsuarioActualIdEscalar"(),
                          nullif(current_setting('app.usuario_id', true), '')::int);
begin
  if tg_op = 'INSERT' then
    insert into "Seguridad"."UsuariosRolesLog" (usuario_id, rol_id, accion, usuario_registro)
    values (new.usuario_id, new.rol_id, 'ASIGNADO', v_quien);
  else
    insert into "Seguridad"."UsuariosRolesLog" (usuario_id, rol_id, accion, usuario_registro)
    values (old.usuario_id, old.rol_id, 'REVOCADO', v_quien);
  end if;
  return null;
end;
$$;

create or replace function "Seguridad"."fnUsuarioCrearDesdeAuthTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_usuario_id   int;
  v_area_id      int;
  v_rol_id       int;
  v_area_texto   text := new.raw_app_meta_data ->> 'area_id';
  v_rol_texto    text := new.raw_app_meta_data ->> 'rol_id';
  v_creado_por   text := new.raw_app_meta_data ->> 'creado_por';
begin
  if v_area_texto ~ '^[0-9]+$' then
    select id into v_area_id from "Seguridad"."Areas"
     where id = v_area_texto::int and estado;
  end if;

  if v_rol_texto ~ '^[0-9]+$' then
    select id into v_rol_id from "Seguridad"."Roles"
     where id = v_rol_texto::int and estado;
  end if;
  if v_rol_id is null then
    select id into v_rol_id from "Seguridad"."Roles" where nombre = 'Empleado';
  end if;

  -- El admin que creó la cuenta queda como responsable de la asignación del rol
  if v_creado_por ~ '^[0-9]+$' then
    perform set_config('app.usuario_id', v_creado_por, true);
  end if;

  insert into "Seguridad"."Usuarios" (auth_id, area_id, nombre, correo)
  values (new.id,
          v_area_id,
          coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''),
                   split_part(new.email, '@', 1)),
          lower(btrim(new.email)))
  returning id into v_usuario_id;

  insert into "Seguridad"."UsuariosRoles" (usuario_id, rol_id)
  values (v_usuario_id, v_rol_id);

  return new;
end;
$$;

-- ============================== PARTE 8 =====
insert into "Seguridad"."Roles" (nombre, descripcion)
values ('Analista', 'Consulta estadísticas con filtros y puede enviar solicitudes')
on conflict on constraint "ukRol_Nombre" do nothing;

create or replace function "Solicitudes"."fnEstadisticasTicketsTabla"(
  p_desde             date default null,
  p_hasta             date default null,
  p_area_id           int  default null,
  p_tipo_solicitud_id int  default null
)
returns table (
  ticket_id            int,
  tipo_solicitud       text,
  area                 text,
  estado_real          text,
  disenador            text,
  fecha_registro       timestamptz,
  fecha_limite         timestamptz,
  fecha_entrega_diseno timestamptz,
  dias_resolucion      numeric,
  entregado_a_tiempo   boolean,
  correcciones_usadas  int,
  aprobado_automatico  boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Analista')
          or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')) then
    raise exception 'Solo un Analista o un Administrador puede ver las estadísticas.';
  end if;

  return query
  select v.ticket_id,
         v.tipo_solicitud::text,
         v.area::text,
         v.estado_real::text,
         v.disenador::text,
         v.fecha_registro,
         v.fecha_limite,
         v.fecha_entrega_diseno,
         round((extract(epoch from (v.fecha_entrega_diseno - v.fecha_registro)) / 86400.0)::numeric, 1),
         case when v.fecha_entrega_diseno is null then null
              else v.fecha_entrega_diseno <= v.fecha_limite end,
         v.correcciones_usadas::int,
         v.aprobado_automatico
    from "Solicitudes"."vw_TicketsEstadoReal" v
    join "Solicitudes"."Ticket" t on t.id = v.ticket_id
   where (p_desde is null or (v.fecha_registro at time zone 'America/Tegucigalpa')::date >= p_desde)
     and (p_hasta is null or (v.fecha_registro at time zone 'America/Tegucigalpa')::date <= p_hasta)
     and (p_area_id is null or t.area_id = p_area_id)
     and (p_tipo_solicitud_id is null or t.tipo_solicitud_id = p_tipo_solicitud_id)
   order by v.ticket_id desc;
end;
$$;

grant execute on function "Solicitudes"."fnEstadisticasTicketsTabla"(date, date, int, int) to authenticated;

-- ============================== PARTE 9 =====
insert into "Seguridad"."Areas" (nombre, descripcion)
values ('Comunicación', 'Subárea de Comunicación de VOAE'),
       ('Becas',        'Subárea de Becas de VOAE'),
       ('Salud',        'Subárea de Salud de VOAE')
on conflict on constraint "ukArea_Nombre" do update set estado = true;

-- ============================== PARTE 10 =====
-- 10.1 Bucket privado para los archivos que adjunta el solicitante
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adjuntos', 'adjuntos', false, 52428800, null)
on conflict (id) do nothing;

-- 10.2 Tabla de adjuntos de la solicitud (archivos o enlaces)
create table "Solicitudes"."Adjuntos"
(
    id                int           not null generated always as identity,
    ticket_id         int           not null,
    tipo              varchar(10)   not null default 'ARCHIVO',
    nombre_archivo    varchar(255)  not null,
    ruta_o_url        text          not null,
    tipo_mime         varchar(150),
    tamano_bytes      bigint,
    descripcion       text,
    usuario_registro  int           not null,
    fecha_registro    timestamptz   not null default current_timestamp,
    constraint "pkAdjunto"                  primary key (id),
    constraint "ukAdjunto_RutaOUrl"         unique (ruta_o_url),
    constraint "fkAdjunto_Ticket"           foreign key (ticket_id)
        references "Solicitudes"."Ticket" (id),
    constraint "fkAdjunto_UsuarioRegistro"  foreign key (usuario_registro)
        references "Seguridad"."Usuarios" (id),
    constraint "chkAdjunto_Tipo"            check (tipo in ('ARCHIVO', 'LINK')),
    constraint "chkAdjunto_RutaOUrl"        check (btrim(ruta_o_url) <> ''
                                                   and (tipo <> 'LINK' or ruta_o_url ~* '^https?://')),
    constraint "chkAdjunto_Tamano"          check (tamano_bytes is null or tamano_bytes > 0)
);
create index "ixAdjunto_Ticket" on "Solicitudes"."Adjuntos" (ticket_id);

-- Quién adjunta lo pone la base; máximo 10 adjuntos por ticket
create or replace function "Solicitudes"."fnAdjuntoValidarTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.usuario_registro := coalesce("Seguridad"."fnUsuarioActualIdEscalar"(), new.usuario_registro);
  new.fecha_registro   := current_timestamp;

  if (select count(*) from "Solicitudes"."Adjuntos" where ticket_id = new.ticket_id) >= 10 then
    raise exception 'El ticket % ya tiene el máximo de 10 adjuntos.', new.ticket_id
          using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger "tgrAdjuntosValidarInsertar"
before insert on "Solicitudes"."Adjuntos"
for each row execute function "Solicitudes"."fnAdjuntoValidarTrigger"();

-- Los adjuntos son evidencia de lo que pidió el solicitante: no se editan ni se borran
create trigger "tgrAdjuntosModificar"
before update or delete on "Solicitudes"."Adjuntos"
for each row execute function "Solicitudes"."fnBloquearModificacionTrigger"('Agregue un adjunto nuevo en lugar de modificar el existente.');

-- 10.3 RLS de la tabla
alter table "Solicitudes"."Adjuntos" enable row level security;

-- Ver: quien puede ver el ticket
create policy "polAdjuntosLeer" on "Solicitudes"."Adjuntos"
  for select to authenticated
  using (exists (select 1 from "Solicitudes"."Ticket" t where t.id = "Adjuntos".ticket_id));

-- Agregar: solo el solicitante de SU ticket, mientras no esté Aprobado;
-- si es archivo, debe estar en la carpeta del ticket
create policy "polAdjuntosAgregar" on "Solicitudes"."Adjuntos"
  for insert to authenticated
  with check (usuario_registro = "Seguridad"."fnUsuarioActualIdEscalar"()
              and exists (select 1
                            from "Solicitudes"."Ticket" t
                            join "Solicitudes"."Estado" e on e.id = t.estado_id
                           where t.id = "Adjuntos".ticket_id
                             and t.usuario_registro = "Seguridad"."fnUsuarioActualIdEscalar"()
                             and e.nombre <> 'Aprobado')
              and (tipo = 'LINK' or split_part(ruta_o_url, '/', 1) = ticket_id::text));

-- 10.4 Políticas del bucket "adjuntos"
create policy "polAdjuntosStorageSubir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'adjuntos'
              and exists (select 1 from "Solicitudes"."Ticket" t
                           where t.id = "Solicitudes"."fnTicketIdDesdeRutaEscalar"(name)
                             and t.usuario_registro = "Seguridad"."fnUsuarioActualIdEscalar"()));

create policy "polAdjuntosStorageLeer" on storage.objects
  for select to authenticated
  using (bucket_id = 'adjuntos'
         and exists (select 1 from "Solicitudes"."Ticket" t
                      where t.id = "Solicitudes"."fnTicketIdDesdeRutaEscalar"(name)));

create policy "polAdjuntosStorageBorrarHuerfano" on storage.objects
  for delete to authenticated
  using (bucket_id = 'adjuntos'
         and owner_id = (select auth.uid()::text)
         and not exists (select 1 from "Solicitudes"."Adjuntos" a where a.ruta_o_url = name));

-- ============================== PARTE 11 =====
notify pgrst, 'reload schema';


-- ============================== PARTE 12 (CORRECCIÓN) =====
-- Supabase agrega el app_metadata en un segundo paso al crear la cuenta.
-- Esta corrección aplica el área, el rol y "creado_por" en ese segundo paso.
-- (a) Al crear la cuenta: crear el perfil. Si ya viene área/rol, se aplican.
create or replace function "Seguridad"."fnUsuarioCrearDesdeAuthTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into "Seguridad"."Usuarios" (auth_id, nombre, correo)
  values (new.id,
          coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''),
                   split_part(new.email, '@', 1)),
          lower(btrim(new.email)));

  perform "Seguridad"."fnUsuarioAplicarConfiguracionInicial"(new.id, new.raw_app_meta_data);
  return new;
end;
$$;

-- (b) Cuando Supabase agrega el app_metadata (segundo paso): aplicar área y rol
create or replace function "Seguridad"."fnUsuarioActualizarDesdeAuthTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.raw_app_meta_data ? 'rol_id') and not (coalesce(old.raw_app_meta_data, '{}'::jsonb) ? 'rol_id') then
    perform "Seguridad"."fnUsuarioAplicarConfiguracionInicial"(new.id, new.raw_app_meta_data);
  end if;
  return null;
end;
$$;

-- (c) Lógica común: área, rol y quién lo hizo (creado_por)
create or replace function "Seguridad"."fnUsuarioAplicarConfiguracionInicial"(p_auth_id uuid, p_meta jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_usuario_id int;
  v_area_id    int;
  v_rol_id     int;
begin
  if p_meta is null or not (p_meta ? 'rol_id') then
    return;   -- sin configuración del admin (por ejemplo, creado desde el panel de Supabase)
  end if;

  select id into v_usuario_id from "Seguridad"."Usuarios" where auth_id = p_auth_id;
  if v_usuario_id is null then return; end if;

  if (p_meta ->> 'creado_por') ~ '^[0-9]+$' then
    perform set_config('app.usuario_id', p_meta ->> 'creado_por', true);
  end if;

  if (p_meta ->> 'area_id') ~ '^[0-9]+$' then
    select id into v_area_id from "Seguridad"."Areas"
     where id = (p_meta ->> 'area_id')::int and estado;
    update "Seguridad"."Usuarios" set area_id = v_area_id
     where id = v_usuario_id and area_id is null and v_area_id is not null;
  end if;

  if (p_meta ->> 'rol_id') ~ '^[0-9]+$' then
    select id into v_rol_id from "Seguridad"."Roles"
     where id = (p_meta ->> 'rol_id')::int and estado;
  end if;
  if v_rol_id is null then
    select id into v_rol_id from "Seguridad"."Roles" where nombre = 'Empleado';
  end if;

  insert into "Seguridad"."UsuariosRoles" (usuario_id, rol_id)
  values (v_usuario_id, v_rol_id)
  on conflict do nothing;
end;
$$;

drop trigger if exists "tgrAuthUsuariosActualizar" on auth.users;
create trigger "tgrAuthUsuariosActualizar"
after update of raw_app_meta_data on auth.users
for each row execute function "Seguridad"."fnUsuarioActualizarDesdeAuthTrigger"();
