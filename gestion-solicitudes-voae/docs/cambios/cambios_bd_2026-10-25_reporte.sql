-- =====================================================================
-- iTickets (VOAE/UNAH) · Correcciones del reporte de pruebas (25/10/2026) · Partes 44 a 50
-- Ejecuta en el SQL Editor de Supabase (proyecto "Gestion Tickets"), UNA PARTE A LA VEZ, en orden.
-- Copia desde este archivo .sql (no desde un PDF). Todo es repetible.
--
-- 44  E-01: los nombres de diseñadores solo se traducen para Diseñador/Asignador, Administrador y Analista
-- 45  E-01: la historia del ticket (TicketLog) ya no guarda el nombre del diseñador (y se limpian los registros viejos)
-- 46  E-02: un diseñador puede tomar una excepcional ACEPTADA que quedó sin diseñador (por ejemplo, liberada)
-- 47  E-17: sin punto doble en los avisos de rechazo con motivo
-- 48  E-06: descripción de "Cobertura de evento" sin nombrar el rol
-- 49  9.2: la aprobación automática también avisa al Jefe del área (y a quien tenga la jefatura)
-- 50  Recargar el esquema + verificación (todo en true)
-- =====================================================================

-- ===== PARTE 44 =====
-- Nombres de usuarios: quien no es del equipo de diseño no puede traducir el id de un diseñador a su nombre
create or replace function "Seguridad"."fnUsuariosNombresTabla"()
returns table (id int, nombre varchar)
language sql stable security definer set search_path = '' as $$
  select u.id, u.nombre_completo
    from "Seguridad"."Usuarios" u
   where auth.uid() is not null
     and (   "Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
          or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')
          or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Analista')
          or u.id = "Seguridad"."fnUsuarioActualIdEscalar"()
          or not "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, 'Diseñador'));
$$;

-- ===== PARTE 45 =====
-- Historia del ticket: "Diseñador: asignado / reasignado / liberado", sin nombres.
-- (Los nombres siguen en la Bitácora de asignaciones, que solo ve el Administrador.)
do $$
declare
  v_def   text;
  v_nuevo text;
begin
  v_def := pg_get_functiondef('"Solicitudes"."fnTicketRegistrarLogTrigger"()'::regprocedure);
  v_nuevo := replace(v_def,
$q$            v_cambios := array_append(v_cambios, format('Diseñador: %s -> %s',
                         coalesce(v_anterior, '(sin asignar)'), coalesce(v_nuevo, '(sin asignar)')));$q$,
$q$            v_cambios := array_append(v_cambios,
                         case when old.disenador_id is null then 'Diseñador: asignado'
                              when new.disenador_id is null then 'Diseñador: liberado (sin asignar)'
                              else 'Diseñador: reasignado' end);$q$);
  if v_nuevo = v_def then
    if v_def like '%Diseñador: reasignado%' then
      raise notice 'La función ya estaba actualizada.';
    else
      raise exception 'No se encontró el texto esperado en fnTicketRegistrarLogTrigger. Avísale a quien te dio el script.';
    end if;
  else
    execute v_nuevo;
  end if;
end $$;

-- Limpiar los registros que ya tenían nombres (la tabla es inmutable: se libera el bloqueo solo durante este cambio)
begin;
alter table "Solicitudes"."TicketLog" disable trigger "tgrTicketLogModificar";
update "Solicitudes"."TicketLog"
   set descripcion_cambio =
       regexp_replace(
         regexp_replace(
           regexp_replace(descripcion_cambio,
             'Diseñador: \(sin asignar\) -> [^;]+', 'Diseñador: asignado', 'g'),
           'Diseñador: [^;]+ -> \(sin asignar\)', 'Diseñador: liberado (sin asignar)', 'g'),
         'Diseñador: (?!asignado|liberado|reasignado)[^;]* -> [^;]*', 'Diseñador: reasignado', 'g')
 where descripcion_cambio like '%Diseñador: %->%';
alter table "Solicitudes"."TicketLog" enable trigger "tgrTicketLogModificar";
commit;

-- ===== PARTE 46 =====
-- Tomar tickets: además de los normales sin diseñador, las excepcionales ya ACEPTADAS que quedaron sin diseñador
alter policy "polTicketActualizarDisenador" on "Solicitudes"."Ticket"
  using (
    "Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
    and "Solicitudes"."fnTipoSolicitudFlujoEscalar"(tipo_solicitud_id) = 'DISENO'
    and (   (disenador_id is null and (not es_excepcional or excepcional_estado = 'ACEPTADA'))
         or disenador_id = "Seguridad"."fnUsuarioActualIdEscalar"())
  );

-- ===== PARTE 47 =====
-- Avisos de rechazo: si el motivo ya termina en punto, no se agrega otro
do $$
declare
  v_def text; v_nuevo text;
begin
  v_def := pg_get_functiondef('"Solicitudes"."fnRevisionIAAplicarTrigger"()'::regprocedure);
  v_nuevo := replace(v_def, 'NEW.comentario)', $q$rtrim(btrim(NEW.comentario), '.'))$q$);
  if v_nuevo <> v_def then execute v_nuevo; end if;

  v_def := pg_get_functiondef('"Solicitudes"."fnDecisionValidacionAplicarTrigger"()'::regprocedure);
  v_nuevo := replace(v_def, $q$Motivo: %s', v_codigo, v_tipo, new.comentario)$q$,
                            $q$Motivo: %s.', v_codigo, v_tipo, rtrim(btrim(new.comentario), '.'))$q$);
  if v_nuevo <> v_def then execute v_nuevo; end if;
end $$;

-- ===== PARTE 48 =====
update "Solicitudes"."TipoSolicitud"
   set descripcion = 'Solicitud de cobertura fotográfica o de video de un evento. Tu solicitud será aprobada o rechazada.'
 where nombre = 'Cobertura de evento' and descripcion like '%Validador%';

-- ===== PARTE 49 =====
-- Aprobación automática: avisa al solicitante, al diseñador y a los jefes del área (incluye jefaturas adicionales)
create or replace function "Solicitudes"."fnAprobarTicketsAutomaticamente"()
returns integer
language plpgsql
set search_path = ''
as $$
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
      returning t.id, t.codigo, t.usuario_registro, t.disenador_id, t.area_id
  ),
  destinatarios as (
      select a.id, a.codigo, x.usuario_id,
             format('El ticket %s fue aprobado automáticamente (24 horas hábiles sin dictamen del jefe).', a.codigo) as mensaje
        from aprobados a
        cross join lateral (values (a.usuario_registro), (a.disenador_id)) as x(usuario_id)
       where x.usuario_id is not null
      union
      select a.id, a.codigo, u.id,
             format('El ticket %s se aprobó automáticamente porque pasaron 24 horas hábiles sin tu dictamen.', a.codigo)
        from aprobados a
        join "Seguridad"."Usuarios" u
          on u.estado
         and (u.area_id = a.area_id
              or exists (select 1 from "Seguridad"."JefaturasArea" j where j.usuario_id = u.id and j.area_id = a.area_id))
       where "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, 'Jefe de Área')
         and u.id is distinct from a.usuario_registro
  ),
  notificadas as (
      insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
      select usuario_id, id, mensaje from destinatarios
      returning 1
  )
  select count(*) into v_total from aprobados;
  return v_total;
end;
$$;

-- ===== PARTE 50 =====
notify pgrst, 'reload schema';

-- Verificación (todo debe salir en true)
select
  (select prosrc like '%fnUsuarioTieneRolEscalar"(u.id, ''Diseñador'')%' from pg_proc where proname = 'fnUsuariosNombresTabla')   as nombres_protegidos,
  not exists (select 1 from "Solicitudes"."TicketLog"
               where descripcion_cambio ~ 'Diseñador: (?!asignado|liberado|reasignado)')                                  as historial_sin_nombres,
  (select prosrc like '%Diseñador: reasignado%' from pg_proc where proname = 'fnTicketRegistrarLogTrigger')                  as log_nuevo,
  exists (select 1 from pg_policies where policyname = 'polTicketActualizarDisenador' and qual like '%ACEPTADA%')            as tomar_excepcional,
  (select prosrc like '%rtrim%' from pg_proc where proname = 'fnRevisionIAAplicarTrigger')                                   as sin_punto_doble,
  not exists (select 1 from "Solicitudes"."TipoSolicitud" where descripcion like '%Validador%')                              as descripciones_sin_roles,
  (select prosrc like '%JefaturasArea%' from pg_proc where proname = 'fnAprobarTicketsAutomaticamente')                       as aviso_jefe_automatico;
