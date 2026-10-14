-- =====================================================================
-- Gestión de Solicitudes VOAE / iTickets: etiqueta "Asignado" (Parte 24)
-- Requiere las Partes 1 a 23. Ejecutar en el SQL Editor de Supabase.
-- =====================================================================

-- ===== PARTE 24 =====
-- Quién asignó el ticket actual (para la etiqueta "Asignado" en el tablero)
alter table "Solicitudes"."Ticket"
  add column asignado_por     int,
  add column fecha_asignacion timestamptz,
  add constraint "fkTicket_AsignadoPor" foreign key (asignado_por) references "Seguridad"."Usuarios" (id);

create or replace function "Solicitudes"."fnTicketAsignacionDatosTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.disenador_id is null then
    new.asignado_por     := null;
    new.fecha_asignacion := null;
  else
    new.asignado_por     := "Seguridad"."fnUsuarioActualIdEscalar"();   -- quien hizo el cambio (null = sistema)
    new.fecha_asignacion := current_timestamp;
  end if;
  return new;
end;
$$;

create trigger "tgrTicketAsignacionDatosActualizar"
before update of disenador_id on "Solicitudes"."Ticket"
for each row
when (old.disenador_id is distinct from new.disenador_id)
execute function "Solicitudes"."fnTicketAsignacionDatosTrigger"();

-- Tickets que ya tienen diseñador: se toma la última asignación de la bitácora
update "Solicitudes"."Ticket" t
   set asignado_por     = l.usuario_registro,
       fecha_asignacion = l.fecha_registro
  from (select distinct on (ticket_id) ticket_id, disenador_nuevo_id, usuario_registro, fecha_registro
          from "Solicitudes"."AsignacionLog"
         order by ticket_id, fecha_registro desc, id desc) l
 where l.ticket_id = t.id
   and l.disenador_nuevo_id = t.disenador_id;

-- La vista agrega: asignado_por, asignado_por_nombre, fecha_asignacion y asignado_por_asignador
create or replace view "Solicitudes"."vw_TicketsEstadoReal"
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
    t.excepcional_motivo_rechazo,
    t.asignado_por,
    (select n.nombre from "Seguridad"."fnUsuariosNombresTabla"() n where n.id = t.asignado_por) as asignado_por_nombre,
    t.fecha_asignacion,
    coalesce(t.disenador_id is not null and t.asignado_por is not null
             and t.asignado_por <> t.disenador_id, false)  as asignado_por_asignador
from "Solicitudes"."Ticket" t
join "Solicitudes"."TipoSolicitud" ts on ts.id = t.tipo_solicitud_id
join "Solicitudes"."Formularios"   f  on f.id  = t.formulario_id
join "Solicitudes"."Estado"        e  on e.id  = t.estado_id
join "Seguridad"."Areas"           a  on a.id  = t.area_id;

notify pgrst, 'reload schema';
