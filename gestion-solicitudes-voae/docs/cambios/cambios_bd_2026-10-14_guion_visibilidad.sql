-- =====================================================================
-- iTickets: códigos con guion y visibilidad de la asignación (Partes 26 y 27)
-- Requiere las Partes 1 a 25. Ejecutar en el SQL Editor de Supabase, una parte a la vez.
-- =====================================================================

-- ===== PARTE 26 =====
-- Códigos con guion: ADH-0001, AOAA-0001, ADS-0001
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

  new.codigo := coalesce(v_prefijo, 'TKT') || '-' || lpad(v_numero::text, greatest(4, length(v_numero::text)), '0');
  return new;
end;
$$;

-- Tickets existentes: ADH0001 -> ADH-0001
update "Solicitudes"."Ticket"
   set codigo = regexp_replace(codigo, '^([A-Z]+)([0-9]+)$', '\1-\2')
 where codigo ~ '^[A-Z]+[0-9]+$';

-- Notificaciones ya enviadas: también con guion, para que coincidan al buscar
update "Solicitudes"."Notificaciones"
   set mensaje = regexp_replace(mensaje, '\m(ADH|AOAA|ADS|TKT)([0-9]{4,})\M', '\1-\2', 'g')
 where mensaje ~ '\m(ADH|AOAA|ADS|TKT)[0-9]{4,}\M';

-- ===== PARTE 27 =====
-- La asignación (diseñador, quién asignó y cuándo) solo la ven Diseñadores/Asignador, Admin y el Jefe del área
create or replace function "Solicitudes"."fnPuedeVerAsignacionEscalar"(p_area_id int)
returns boolean language sql stable security definer set search_path = '' as $$
  select "Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
      or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')
      or ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Jefe de Área')
          and p_area_id = "Seguridad"."fnUsuarioActualAreaEscalar"());
$$;
grant execute on function "Solicitudes"."fnPuedeVerAsignacionEscalar"(int) to authenticated;

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
    case when "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id) then t.disenador_id end as disenador_id,
    case when "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id)
         then (select n.nombre from "Seguridad"."fnUsuariosNombresTabla"() n where n.id = t.disenador_id) end as disenador,
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
    case when "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id) then t.asignado_por end as asignado_por,
    case when "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id)
         then (select n.nombre from "Seguridad"."fnUsuariosNombresTabla"() n where n.id = t.asignado_por) end as asignado_por_nombre,
    case when "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id) then t.fecha_asignacion end as fecha_asignacion,
    coalesce("Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id)
             and t.disenador_id is not null and t.asignado_por is not null
             and t.asignado_por <> t.disenador_id, false)  as asignado_por_asignador
from "Solicitudes"."Ticket" t
join "Solicitudes"."TipoSolicitud" ts on ts.id = t.tipo_solicitud_id
join "Solicitudes"."Formularios"   f  on f.id  = t.formulario_id
join "Solicitudes"."Estado"        e  on e.id  = t.estado_id
join "Seguridad"."Areas"           a  on a.id  = t.area_id;

-- El solicitante ya no recibe avisos sobre cambios de diseñador
create or replace function "Solicitudes"."fnLiberarTicketsDisenadorEscalar"(
  p_usuario_id int,
  p_motivo     text
)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_nombre   varchar;
  v_codigos  text;
  v_total    int;
begin
  select nombre_completo into v_nombre from "Seguridad"."Usuarios" where id = p_usuario_id;

  with liberados as (
      update "Solicitudes"."Ticket" t
         set disenador_id = null
        from "Solicitudes"."Estado" e
       where e.id = t.estado_id
         and t.disenador_id = p_usuario_id
         and e.nombre in ('En revisión', 'En proceso', 'Corrección', 'Retrasado')
      returning t.id, t.codigo, t.usuario_registro
  )
  select count(*), string_agg(codigo, ', ' order by codigo) into v_total, v_codigos from liberados;

  if v_total > 0 then
    insert into "Solicitudes"."Notificaciones" (usuario_id, mensaje)
    select u.id,
           format('%s %s: %s ticket(s) volvieron a "Sin asignar" (%s).', p_motivo, v_nombre, v_total, v_codigos)
      from "Seguridad"."Usuarios" u
     where u.estado
       and u.id <> p_usuario_id
       and "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, 'Asignador');
  end if;

  return v_total;
end;
$$;

notify pgrst, 'reload schema';
