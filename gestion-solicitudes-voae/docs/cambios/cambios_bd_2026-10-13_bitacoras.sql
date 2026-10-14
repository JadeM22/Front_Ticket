-- =====================================================================
-- Gestión de Solicitudes VOAE: bitácoras de feriados y asignaciones (Partes 20 a 23)
-- Requiere las Partes 1 a 19 (archivos del 12 y 13 de octubre).
-- Ejecutar en el SQL Editor de Supabase, UNA PARTE A LA VEZ y en orden.
-- =====================================================================

-- ===== PARTE 20 =====
-- Bitácora de feriados: quién creó, editó, desactivó, reactivó o eliminó cada feriado
create table "Seguridad"."FeriadosLog" (
  id                    serial       not null,
  feriado_id            int          not null,          -- sin FK: el registro queda aunque se borre el feriado
  accion                varchar(20)  not null,
  nombre                varchar(150) not null,
  fecha_inicio_anterior date,
  fecha_fin_anterior    date,
  fecha_inicio_nueva    date,
  fecha_fin_nueva       date,
  usuario_registro      int,
  fecha_registro        timestamptz  not null default current_timestamp,
  constraint "pkFeriadoLog" primary key (id),
  constraint "chkFeriadoLog_Accion"
    check (accion in ('CREADO', 'EDITADO', 'DESACTIVADO', 'REACTIVADO', 'ELIMINADO')),
  constraint "fkFeriadoLog_UsuarioRegistro"
    foreign key (usuario_registro) references "Seguridad"."Usuarios" (id)
);

create index "ixFeriadoLog_Fecha"   on "Seguridad"."FeriadosLog" (fecha_registro desc);
create index "ixFeriadoLog_Feriado" on "Seguridad"."FeriadosLog" (feriado_id);

create or replace function "Seguridad"."fnFeriadoRegistrarLogTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_accion varchar(20);
begin
  if tg_op = 'INSERT' then
    v_accion := 'CREADO';
  elsif tg_op = 'DELETE' then
    v_accion := 'ELIMINADO';
  elsif old.estado and not new.estado then
    v_accion := 'DESACTIVADO';
  elsif not old.estado and new.estado then
    v_accion := 'REACTIVADO';
  elsif (old.nombre, old.fecha_inicio, old.fecha_fin) is distinct from (new.nombre, new.fecha_inicio, new.fecha_fin) then
    v_accion := 'EDITADO';
  else
    return null;   -- no cambió nada que interese
  end if;

  insert into "Seguridad"."FeriadosLog"
         (feriado_id, accion, nombre,
          fecha_inicio_anterior, fecha_fin_anterior, fecha_inicio_nueva, fecha_fin_nueva, usuario_registro)
  values (coalesce(new.id, old.id), v_accion, coalesce(new.nombre, old.nombre),
          case when tg_op <> 'INSERT' then old.fecha_inicio end,
          case when tg_op <> 'INSERT' then old.fecha_fin end,
          case when tg_op <> 'DELETE' then new.fecha_inicio end,
          case when tg_op <> 'DELETE' then new.fecha_fin end,
          "Seguridad"."fnUsuarioActualIdEscalar"());
  return null;
end;
$$;

create trigger "tgrFeriadosRegistrarLog"
after insert or update or delete on "Solicitudes"."Feriados"
for each row execute function "Seguridad"."fnFeriadoRegistrarLogTrigger"();

create trigger "tgrFeriadosLogModificar"
before update or delete on "Seguridad"."FeriadosLog"
for each row execute function "Solicitudes"."fnBloquearModificacionTrigger"();

-- Los feriados que ya existen entran como CREADO, con su autor y fecha originales
insert into "Seguridad"."FeriadosLog"
       (feriado_id, accion, nombre, fecha_inicio_nueva, fecha_fin_nueva, usuario_registro, fecha_registro)
select id, 'CREADO', nombre, fecha_inicio, fecha_fin, usuario_registro, fecha_registro
  from "Solicitudes"."Feriados"
 order by fecha_registro;

alter table "Seguridad"."FeriadosLog" enable row level security;

create policy "polFeriadosLogLeer" on "Seguridad"."FeriadosLog"
  for select to authenticated
  using ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador'));

grant select on "Seguridad"."FeriadosLog" to authenticated;

-- ===== PARTE 21 =====
-- Bitácora de asignaciones: quién asignó qué ticket a quién
create table "Solicitudes"."AsignacionLog" (
  id                    serial      not null,
  ticket_id             int         not null,
  accion                varchar(20) not null,
  disenador_anterior_id int,
  disenador_nuevo_id    int,
  usuario_registro      int,
  fecha_registro        timestamptz not null default current_timestamp,
  constraint "pkAsignacionLog" primary key (id),
  constraint "chkAsignacionLog_Accion"
    check (accion in ('TOMADO', 'ASIGNADO', 'REASIGNADO', 'DESASIGNADO', 'EXCEPCIONAL ACEPTADA')),
  constraint "fkAsignacionLog_Ticket"
    foreign key (ticket_id) references "Solicitudes"."Ticket" (id),
  constraint "fkAsignacionLog_DisenadorAnterior"
    foreign key (disenador_anterior_id) references "Seguridad"."Usuarios" (id),
  constraint "fkAsignacionLog_DisenadorNuevo"
    foreign key (disenador_nuevo_id) references "Seguridad"."Usuarios" (id),
  constraint "fkAsignacionLog_UsuarioRegistro"
    foreign key (usuario_registro) references "Seguridad"."Usuarios" (id)
);

create index "ixAsignacionLog_Fecha"  on "Solicitudes"."AsignacionLog" (fecha_registro desc);
create index "ixAsignacionLog_Ticket" on "Solicitudes"."AsignacionLog" (ticket_id);

create or replace function "Solicitudes"."fnTicketRegistrarAsignacionTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_yo     int := "Seguridad"."fnUsuarioActualIdEscalar"();
  v_accion varchar(20);
begin
  if new.es_excepcional and old.excepcional_estado = 'PENDIENTE' and new.excepcional_estado = 'ACEPTADA' then
    v_accion := 'EXCEPCIONAL ACEPTADA';
  elsif new.disenador_id is null then
    v_accion := 'DESASIGNADO';
  elsif old.disenador_id is not null then
    v_accion := 'REASIGNADO';
  elsif new.disenador_id = v_yo then
    v_accion := 'TOMADO';
  else
    v_accion := 'ASIGNADO';
  end if;

  insert into "Solicitudes"."AsignacionLog"
         (ticket_id, accion, disenador_anterior_id, disenador_nuevo_id, usuario_registro)
  values (new.id, v_accion, old.disenador_id, new.disenador_id, v_yo);
  return null;
end;
$$;

create trigger "tgrTicketRegistrarAsignacionActualizar"
after update of disenador_id on "Solicitudes"."Ticket"
for each row
when (old.disenador_id is distinct from new.disenador_id)
execute function "Solicitudes"."fnTicketRegistrarAsignacionTrigger"();

create trigger "tgrAsignacionLogModificar"
before update or delete on "Solicitudes"."AsignacionLog"
for each row execute function "Solicitudes"."fnBloquearModificacionTrigger"();

-- Asignaciones anteriores: se reconstruyen del historial de tickets (TicketLog),
-- buscando a los diseñadores por el nombre con que quedaron escritos
with cambios as (
  select l.ticket_id, l.usuario_registro, l.fecha_registro,
         nullif(m[1], '(sin asignar)') as anterior,
         nullif(m[2], '(sin asignar)') as nuevo
    from "Solicitudes"."TicketLog" l,
         regexp_match(l.descripcion_cambio, 'Diseñador: (.*?) -> (.*?)(?:;|$)') as m
   where m is not null
),
con_ids as (
  select c.*,
         (select min(u.id) from "Seguridad"."Usuarios" u where c.anterior in (u.nombre, u.nombre_completo)) as anterior_id,
         (select min(u.id) from "Seguridad"."Usuarios" u where c.nuevo    in (u.nombre, u.nombre_completo)) as nuevo_id
    from cambios c
)
insert into "Solicitudes"."AsignacionLog"
       (ticket_id, accion, disenador_anterior_id, disenador_nuevo_id, usuario_registro, fecha_registro)
select c.ticket_id,
       case when c.nuevo is null                then 'DESASIGNADO'
            when c.anterior is not null         then 'REASIGNADO'
            -- primera asignación de una excepcional = cuando el Asignador la aceptó
            when t.es_excepcional and not exists (
                   select 1 from con_ids x
                    where x.ticket_id = c.ticket_id and x.fecha_registro < c.fecha_registro)
                                                then 'EXCEPCIONAL ACEPTADA'
            when c.nuevo_id = c.usuario_registro then 'TOMADO'
            else 'ASIGNADO' end,
       c.anterior_id, c.nuevo_id, c.usuario_registro, c.fecha_registro
  from con_ids c
  join "Solicitudes"."Ticket" t on t.id = c.ticket_id
 order by c.fecha_registro;

alter table "Solicitudes"."AsignacionLog" enable row level security;

create policy "polAsignacionLogLeer" on "Solicitudes"."AsignacionLog"
  for select to authenticated
  using ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador'));

grant select on "Solicitudes"."AsignacionLog" to authenticated;

-- ===== PARTE 22 =====
-- Vistas listas para las pestañas de Bitácoras (con nombres y código de ticket)
create view "Seguridad"."vw_FeriadosLog"
with (security_invoker = true)
as
select l.id,
       l.feriado_id,
       l.accion,
       l.nombre,
       l.fecha_inicio_anterior,
       l.fecha_fin_anterior,
       l.fecha_inicio_nueva,
       l.fecha_fin_nueva,
       l.usuario_registro,
       coalesce(u.nombre_completo, '(Sistema)') as realizado_por,
       l.fecha_registro
  from "Seguridad"."FeriadosLog" l
  left join "Seguridad"."Usuarios" u on u.id = l.usuario_registro;

create view "Solicitudes"."vw_AsignacionLog"
with (security_invoker = true)
as
select l.id,
       l.ticket_id,
       t.codigo,
       ts.nombre                                 as tipo_solicitud,
       a.nombre                                  as area,
       l.accion,
       l.disenador_anterior_id,
       da.nombre_completo                        as disenador_anterior,
       l.disenador_nuevo_id,
       dn.nombre_completo                        as disenador_nuevo,
       l.usuario_registro,
       coalesce(u.nombre_completo, '(Sistema)')  as realizado_por,
       l.fecha_registro
  from "Solicitudes"."AsignacionLog" l
  join "Solicitudes"."Ticket"        t  on t.id  = l.ticket_id
  join "Solicitudes"."TipoSolicitud" ts on ts.id = t.tipo_solicitud_id
  join "Seguridad"."Areas"           a  on a.id  = t.area_id
  left join "Seguridad"."Usuarios"   da on da.id = l.disenador_anterior_id
  left join "Seguridad"."Usuarios"   dn on dn.id = l.disenador_nuevo_id
  left join "Seguridad"."Usuarios"   u  on u.id  = l.usuario_registro;

grant select on "Seguridad"."vw_FeriadosLog"     to authenticated;
grant select on "Solicitudes"."vw_AsignacionLog" to authenticated;

-- ===== PARTE 23 =====
-- "Promociones (Licitaciones)" con L mayúscula
update "Solicitudes"."TipoSolicitud"
   set nombre = 'Promociones (Licitaciones)'
 where nombre in ('Promociones (licitaciones)', 'Promocionales');

notify pgrst, 'reload schema';
