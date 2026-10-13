-- =====================================================================
-- Gestión de Solicitudes VOAE: ajustes del 13 de octubre de 2026 (Partes 13 a 19)
-- Requiere haber ejecutado antes cambios_bd_2026-10-12.sql (Partes 1 a 12).
-- Ejecutar en el SQL Editor de Supabase, UNA PARTE A LA VEZ y en orden.
-- =====================================================================

-- ===== PARTE 13 =====
-- Trifolio: se elimina por completo (también sus solicitudes de prueba)
do $$
declare
  v_tipo    int;
  v_tickets int[];
  v_forms   int[];
begin
  select id into v_tipo from "Solicitudes"."TipoSolicitud" where nombre = 'Trifolio';
  if v_tipo is null then
    raise notice 'Trifolio ya no existe. Nada que hacer.';
    return;
  end if;

  select coalesce(array_agg(id), '{}'), coalesce(array_agg(formulario_id), '{}')
    into v_tickets, v_forms
    from "Solicitudes"."Ticket" where tipo_solicitud_id = v_tipo;

  if cardinality(v_tickets) > 0 then
    -- Las tablas de evidencia no permiten borrar: se desbloquean solo durante esta limpieza
    alter table "Solicitudes"."TicketLog"    disable trigger "tgrTicketLogModificar";
    alter table "Solicitudes"."Entregables"  disable trigger "tgrEntregablesModificar";
    alter table "Solicitudes"."DictamenJefe" disable trigger "tgrDictamenJefeModificar";
    alter table "Solicitudes"."Adjuntos"     disable trigger "tgrAdjuntosModificar";

    delete from "Solicitudes"."Notificaciones" where ticket_id = any (v_tickets);
    delete from "Solicitudes"."TicketLog"      where ticket_id = any (v_tickets);
    delete from "Solicitudes"."Entregables"    where ticket_id = any (v_tickets);
    delete from "Solicitudes"."DictamenJefe"   where ticket_id = any (v_tickets);
    delete from "Solicitudes"."Adjuntos"       where ticket_id = any (v_tickets);
    delete from "Solicitudes"."Ticket"         where id        = any (v_tickets);

    alter table "Solicitudes"."TicketLog"    enable trigger "tgrTicketLogModificar";
    alter table "Solicitudes"."Entregables"  enable trigger "tgrEntregablesModificar";
    alter table "Solicitudes"."DictamenJefe" enable trigger "tgrDictamenJefeModificar";
    alter table "Solicitudes"."Adjuntos"     enable trigger "tgrAdjuntosModificar";

    raise notice 'Se borraron % solicitud(es) de Trifolio (tickets %). Borra en Storage sus carpetas con esos números.',
                 cardinality(v_tickets), v_tickets;
  end if;

  -- Formularios de Trifolio (sus detalles se borran en cascada)
  delete from "Solicitudes"."Formularios" where tipo_solicitud_id = v_tipo;
  delete from "Solicitudes"."TipoSolicitud" where id = v_tipo;
end $$;

-- ===== PARTE 14 =====
-- El solicitante solo ve el ESTADO: ni entregables ni comentarios de los dictámenes
drop policy "polDictamenJefeLeer" on "Solicitudes"."DictamenJefe";

create policy "polDictamenJefeLeer" on "Solicitudes"."DictamenJefe"
  for select to authenticated
  using (exists (select 1 from "Solicitudes"."Ticket" t
                  where t.id = "DictamenJefe".ticket_id
                    and ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')
                         or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
                         or ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Jefe de Área')
                             and t.area_id = "Seguridad"."fnUsuarioActualAreaEscalar"()))));

-- ===== PARTE 15 =====
-- Excepcionales: 2 días hábiles de anticipación (también es la base del calendario de la app)
drop function if exists "Solicitudes"."fnFechaEventoMinimaEscalar"(int);

create or replace function "Solicitudes"."fnFechaEventoMinimaEscalar"(
  p_tipo_solicitud_id int,
  p_excepcional       boolean default false
)
returns date language sql stable security definer set search_path = '' as $$
  -- Primer día permitido para el evento = el día siguiente al último día de producción
  select case
           when p_excepcional
             then ("Solicitudes"."fnSumarDiasHabilesEscalar"(current_timestamp, 2) at time zone 'America/Tegucigalpa')::date + 1
           else ("Solicitudes"."fnFechaLimiteCalcularEscalar"(p_tipo_solicitud_id) at time zone 'America/Tegucigalpa')::date + 1
         end;
$$;
grant execute on function "Solicitudes"."fnFechaEventoMinimaEscalar"(int, boolean) to authenticated;

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
    -- 2 días hábiles desde el envío, o el día del evento a las 8:00 a. m. (lo que sea más tarde)
    new.fecha_limite := greatest("Solicitudes"."fnSumarDiasHabilesEscalar"(new.fecha_registro, 2),
                                 (v_fecha_evento + time '08:00') at time zone 'America/Tegucigalpa');
  elsif v_habiles then
    new.fecha_limite := "Solicitudes"."fnSumarDiasHabilesEscalar"(new.fecha_registro, v_dias);
  else
    new.fecha_limite := new.fecha_registro + make_interval(days => v_dias);
  end if;

  return new;
end;
$$;

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
  v_codigo        varchar(20);
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

  -- Anticipación: normal = días hábiles del tipo; excepcional = 2 días hábiles
  v_evento_minimo := "Solicitudes"."fnFechaEventoMinimaEscalar"(p_tipo_solicitud_id, coalesce(p_excepcional, false));
  if v_fecha_evento < v_evento_minimo then
    if p_excepcional then
      raise exception 'Las solicitudes excepcionales necesitan 2 días hábiles de anticipación: la fecha del evento debe ser a partir del %.',
            to_char(v_evento_minimo, 'DD/MM/YYYY')
            using errcode = 'check_violation';
    else
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
  returning id, codigo into v_ticket_id, v_codigo;

  -- Excepcional: avisar a los Asignadores, que son quienes la aceptan o rechazan
  if p_excepcional then
    insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
    select u.id, v_ticket_id,
           format('Nueva solicitud excepcional %s (%s): evento el %s. Acéptala o recházala.',
                  v_codigo, v_tipo_nombre, to_char(v_fecha_evento, 'DD/MM/YYYY'))
      from "Seguridad"."Usuarios" u
     where u.estado and "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, 'Asignador');
  end if;

  return v_ticket_id;
end;
$$;

-- ===== PARTE 16 =====
-- Solo el Asignador acepta o rechaza excepcionales; al aceptar, la toma o la asigna a un diseñador
drop function if exists "Solicitudes"."fnSolicitudExcepcionalResponderEscalar"(int, boolean, text);

create or replace function "Solicitudes"."fnSolicitudExcepcionalResponderEscalar"(
  p_ticket_id    int,
  p_aceptar      boolean,
  p_motivo       text default null,
  p_disenador_id int  default null   -- null = el Asignador se la queda
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_yo        int := "Seguridad"."fnUsuarioActualIdEscalar"();
  v_disenador int := coalesce(p_disenador_id, "Seguridad"."fnUsuarioActualIdEscalar"());
  v_ticket    "Solicitudes"."Ticket"%rowtype;
  v_nombre    varchar;
begin
  if not "Seguridad"."fnUsuarioActualTieneRolEscalar"('Asignador') then
    raise exception 'Solo el Asignador puede aceptar o rechazar solicitudes excepcionales.' using errcode = 'check_violation';
  end if;

  select * into v_ticket from "Solicitudes"."Ticket" where id = p_ticket_id for update;
  if not found or not v_ticket.es_excepcional or v_ticket.excepcional_estado <> 'PENDIENTE' then
    raise exception 'El ticket no es una solicitud excepcional pendiente.' using errcode = 'check_violation';
  end if;

  if p_aceptar then
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
    select nombre_completo into v_nombre from "Seguridad"."Usuarios" where id = v_disenador;
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
               then format('Tu solicitud excepcional %s fue ACEPTADA y la trabaja %s.', v_ticket.codigo, v_nombre)
               else format('Tu solicitud excepcional %s fue RECHAZADA: %s', v_ticket.codigo, p_motivo) end);
end;
$$;

revoke execute on function "Solicitudes"."fnSolicitudExcepcionalResponderEscalar"(int, boolean, text, int) from public, anon;
grant  execute on function "Solicitudes"."fnSolicitudExcepcionalResponderEscalar"(int, boolean, text, int) to authenticated;

-- ===== PARTE 17 =====
-- Diseñadores: no pueden tomar excepcionales (las reparte el Asignador)
drop policy "polTicketActualizarDisenador" on "Solicitudes"."Ticket";

create policy "polTicketActualizarDisenador" on "Solicitudes"."Ticket"
  for update to authenticated
  using ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
         and ((disenador_id is null and not es_excepcional)
              or disenador_id = "Seguridad"."fnUsuarioActualIdEscalar"()))
  with check ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
              and disenador_id = "Seguridad"."fnUsuarioActualIdEscalar"());

-- Nadie asigna una excepcional pendiente: primero el Asignador la acepta
create or replace function "Solicitudes"."fnTicketExcepcionalAsignarValidarTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.es_excepcional and new.excepcional_estado = 'PENDIENTE' and new.disenador_id is not null then
    raise exception 'La solicitud excepcional % primero debe ser aceptada por el Asignador.', new.codigo
          using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger "tgrTicketExcepcionalAsignarValidarActualizar"
before update of disenador_id on "Solicitudes"."Ticket"
for each row execute function "Solicitudes"."fnTicketExcepcionalAsignarValidarTrigger"();

-- ===== PARTE 18 =====
-- Excepcional sin respuesta después de la fecha del evento: se rechaza sola
create or replace function "Solicitudes"."fnRechazarExcepcionalesVencidas"()
returns int language plpgsql set search_path = '' as $$
declare
  v_total int;
begin
  with vencidas as (
      update "Solicitudes"."Ticket" t
         set excepcional_estado          = 'RECHAZADA',
             excepcional_fecha_respuesta = current_timestamp,
             excepcional_motivo_rechazo  = 'Rechazada automáticamente: no fue atendida antes de la fecha del evento.',
             estado_id                   = "Solicitudes"."fnObtenerEstadoIdEscalar"('Rechazado')
        from "Solicitudes"."Formularios" f
       where f.id = t.formulario_id
         and t.es_excepcional
         and t.excepcional_estado = 'PENDIENTE'
         and f.fecha_evento < (current_timestamp at time zone 'America/Tegucigalpa')::date
      returning t.id, t.codigo, t.usuario_registro
  ),
  avisos as (
      insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
      select v.usuario_registro, v.id,
             format('Tu solicitud excepcional %s se rechazó automáticamente porque pasó la fecha del evento sin respuesta.', v.codigo)
        from vencidas v
      returning 1
  )
  select count(*) into v_total from vencidas;
  return v_total;
end;
$$;

create or replace function "Solicitudes"."fnVerificarTicketsRetrasados"()
returns int language plpgsql set search_path = '' as $$
declare
  v_total int;
begin
  -- Primero: excepcionales que nadie atendió antes de su evento
  perform "Solicitudes"."fnRechazarExcepcionalesVencidas"();

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

-- ===== PARTE 19 =====
notify pgrst, 'reload schema';
