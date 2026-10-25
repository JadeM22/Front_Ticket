-- =====================================================================
-- iTickets (VOAE/UNAH) · Cambios en la base del 25/10/2026 · Partes 36 a 42
-- Ejecuta en el SQL Editor de Supabase, UNA PARTE A LA VEZ, en orden.
-- Copia desde este archivo .sql (no desde un PDF: se dañan las tildes).
-- Si Supabase muestra "Potential issue detected", pulsa "Run this query".
-- Todo es repetible: si una parte se corta, puedes volver a correrla.
--
-- 36  Mensajes sin nombres de roles ni nombre del diseñador
-- 37  Empleados y Jefes de Área ya no ven qué diseñador trabaja su ticket
-- 38  Campus de solo lectura (no se modifica desde la app)
-- 39  Coordinaciones (UROE, UCCR, Unidad de Planificación) y jefaturas adicionales
-- 40  Fechas: solo días hábiles (lunes a viernes, sin feriados)
-- 41  Nuevo tipo "Trifolio" (Otros; "Fecha de entrega")
-- 42  Recargar el esquema + verificación (las 7 columnas deben salir en true)
-- =====================================================================

-- ===== PARTE 36 =====
-- Mensajes del sistema sin nombres de roles (ni "Validador" ni "Asignador") y sin el nombre del diseñador
do $$
declare
  r       record;
  v_def   text;
  v_nuevo text;
  v_par   text[];
  v_funcs int := 0;
  v_cambios text[][] := array[
    ['Solo el Asignador puede aceptar o rechazar solicitudes excepcionales.',
     'No tienes permiso para aceptar o rechazar solicitudes excepcionales.'],
    ['primero debe ser aceptada por el Asignador.',
     'primero debe ser aceptada.'],
    ['debe ser aceptada o rechazada por un diseñador antes de trabajarse.',
     'debe ser aceptada o rechazada antes de trabajarse.'],
    ['Solo una solicitud excepcional rechazada por un diseñador pasa a "Rechazado".',
     'Solo una solicitud excepcional rechazada pasa a "Rechazado".'],
    ['mediante la revisión de un Validador.',
     'mediante un dictamen.'],
    ['mediante la revisión de un Aprobador IA.',
     'mediante un dictamen.'],
    ['mediante la decisión de un Validador.',
     'mediante un dictamen de aprobación o rechazo.'],
    ['Solo un Validador puede revisar afiches con IA.',
     'No tienes permiso para dictaminar afiches con IA.'],
    ['Solo un Aprobador IA puede revisar afiches con IA.',
     'No tienes permiso para dictaminar afiches con IA.'],
    ['Solo un Validador puede aprobar o rechazar esta solicitud.',
     'No tienes permiso para dictaminar esta solicitud.'],
    [$q$format('Tu solicitud excepcional %s fue ACEPTADA y la trabaja %s.', v_ticket.codigo, v_nombre)$q$,
     $q$format('Tu solicitud excepcional %s fue ACEPTADA y ya está en proceso.', v_ticket.codigo)$q$]
  ];
  i int;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('Seguridad', 'Solicitudes')
  loop
    v_def := pg_get_functiondef(r.oid);
    v_nuevo := v_def;
    for i in 1 .. array_length(v_cambios, 1) loop
      v_nuevo := replace(v_nuevo, v_cambios[i][1], v_cambios[i][2]);
    end loop;
    if v_nuevo <> v_def then
      execute v_nuevo;
      v_funcs := v_funcs + 1;
    end if;
  end loop;
  raise notice 'Funciones con mensajes actualizados: %.', v_funcs;
end $$;

-- Notificaciones ya enviadas que decían quién trabaja la solicitud
update "Solicitudes"."Notificaciones"
   set mensaje = regexp_replace(mensaje, 'fue ACEPTADA y la trabaja .*$', 'fue ACEPTADA y ya está en proceso.')
 where mensaje ~ 'fue ACEPTADA y la trabaja ';

-- ===== PARTE 37 =====
-- Nadie fuera del equipo de diseño ve quién trabaja un ticket (ni Empleados ni Jefes de Área)
create or replace function "Solicitudes"."fnPuedeVerAsignacionEscalar"(p_area_id int)
returns boolean language sql stable security definer set search_path = '' as $$
  -- El Asignador también tiene el rol Diseñador
  select "Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador')
      or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador');
$$;

-- ===== PARTE 38 =====
-- Campus: catálogo fijo. Nadie lo modifica desde la app (solo lectura)
drop policy if exists "polCampusAdministrar" on "Solicitudes"."Campus";
revoke insert, update, delete on "Solicitudes"."Campus" from authenticated;

-- ===== PARTE 39 =====
-- Coordinaciones: se registran en Areas con tipo = 'COORDINACION'.
-- Cada usuario tiene UNA sola area_id, así que pertenece a un área o a una coordinación, nunca a ambas.
alter table "Seguridad"."Areas" add column if not exists tipo varchar(15) not null default 'AREA';
alter table "Seguridad"."Areas" drop constraint if exists "chkArea_Tipo";
alter table "Seguridad"."Areas" add constraint "chkArea_Tipo" check (tipo in ('AREA', 'COORDINACION'));

insert into "Seguridad"."Areas" (nombre, prefijo, tipo, estado)
select v.nombre, v.prefijo, 'COORDINACION', true
  from (values ('UROE', 'UROE'),
               ('Unidad Coordinadora de Centros Regionales', 'UCCR'),
               ('Unidad de Planificación', 'UPLAN')) as v(nombre, prefijo)
 where not exists (select 1 from "Seguridad"."Areas" a where a.nombre = v.nombre or a.prefijo = v.prefijo);

-- Jefaturas adicionales: un Jefe de Área puede dirigir otras coordinaciones además de la suya
create table if not exists "Seguridad"."JefaturasArea" (
  usuario_id       int not null constraint "fkJefaturaArea_Usuario" references "Seguridad"."Usuarios" (id),
  area_id          int not null constraint "fkJefaturaArea_Area" references "Seguridad"."Areas" (id),
  usuario_registro int constraint "fkJefaturaArea_UsuarioRegistro" references "Seguridad"."Usuarios" (id),
  fecha_registro   timestamptz not null default current_timestamp,
  constraint "pkJefaturaArea" primary key (usuario_id, area_id)
);
create index if not exists "ixJefaturaArea_Area" on "Seguridad"."JefaturasArea" (area_id);

create or replace function "Seguridad"."fnJefaturaAreaValidarTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select tipo from "Seguridad"."Areas" where id = new.area_id) is distinct from 'COORDINACION' then
    raise exception 'Solo se pueden agregar jefaturas adicionales de coordinaciones.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from "Seguridad"."Usuarios" where id = new.usuario_id and area_id = new.area_id) then
    raise exception 'Esa ya es la coordinación del usuario.' using errcode = 'check_violation';
  end if;
  if (select a.tipo from "Seguridad"."Usuarios" u join "Seguridad"."Areas" a on a.id = u.area_id where u.id = new.usuario_id)
     is distinct from 'COORDINACION' then
    raise exception 'Solo un usuario de una coordinación puede dirigir otras coordinaciones.' using errcode = 'check_violation';
  end if;
  new.usuario_registro := "Seguridad"."fnUsuarioActualIdEscalar"();
  new.fecha_registro   := current_timestamp;
  return new;
end;
$$;

drop trigger if exists "tgrJefaturasAreaValidarInsertar" on "Seguridad"."JefaturasArea";
create trigger "tgrJefaturasAreaValidarInsertar"
before insert on "Seguridad"."JefaturasArea"
for each row execute function "Seguridad"."fnJefaturaAreaValidarTrigger"();

alter table "Seguridad"."JefaturasArea" enable row level security;
drop policy if exists "polJefaturasAreaLeer" on "Seguridad"."JefaturasArea";
create policy "polJefaturasAreaLeer" on "Seguridad"."JefaturasArea"
  for select to authenticated
  using (usuario_id = "Seguridad"."fnUsuarioActualIdEscalar"()
         or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador'));
drop policy if exists "polJefaturasAreaAdministrar" on "Seguridad"."JefaturasArea";
create policy "polJefaturasAreaAdministrar" on "Seguridad"."JefaturasArea"
  for all to authenticated
  using ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador'))
  with check ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador'));
grant select, insert, delete on "Seguridad"."JefaturasArea" to authenticated;

-- ¿El usuario actual es Jefe de esta área o coordinación (la suya o una jefatura adicional)?
create or replace function "Seguridad"."fnUsuarioActualEsJefeDeAreaEscalar"(p_area_id int)
returns boolean language sql stable security definer set search_path = '' as $$
  select "Seguridad"."fnUsuarioActualTieneRolEscalar"('Jefe de Área')
     and (p_area_id = "Seguridad"."fnUsuarioActualAreaEscalar"()
          or exists (select 1 from "Seguridad"."JefaturasArea" j
                      where j.usuario_id = "Seguridad"."fnUsuarioActualIdEscalar"() and j.area_id = p_area_id));
$$;
grant execute on function "Seguridad"."fnUsuarioActualEsJefeDeAreaEscalar"(int) to authenticated;

-- Políticas que usaban "el área del jefe": ahora aceptan también sus jefaturas adicionales
do $$
declare
  r       record;
  v_using text;
  v_check text;
  v_patron text := '([a-z_."]*area_id) = "Seguridad"\."fnUsuarioActualAreaEscalar"\(\)';
  v_nuevo  text := '"Seguridad"."fnUsuarioActualEsJefeDeAreaEscalar"(\1)';
  v_pols  int := 0;
begin
  for r in select pol.polname, pol.polrelid, pol.polqual, pol.polwithcheck
             from pg_policy pol
            where coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
                  like '%fnUsuarioActualAreaEscalar%'
  loop
    v_using := regexp_replace(pg_get_expr(r.polqual, r.polrelid), v_patron, v_nuevo, 'g');
    v_check := regexp_replace(pg_get_expr(r.polwithcheck, r.polrelid), v_patron, v_nuevo, 'g');
    if v_using is not null then
      execute format('alter policy %I on %s using (%s)', r.polname, r.polrelid::regclass, v_using);
    end if;
    if v_check is not null then
      execute format('alter policy %I on %s with check (%s)', r.polname, r.polrelid::regclass, v_check);
    end if;
    v_pols := v_pols + 1;
  end loop;
  raise notice 'Políticas actualizadas para jefaturas: %.', v_pols;
end $$;

-- Funciones que comparaban el área del jefe con la del ticket
do $$
declare
  v_oid oid;
  v_def text;
  v_nuevo text;
begin
  -- Dictamen: el jefe puede dictaminar en su área o en sus jefaturas adicionales
  v_oid := '"Solicitudes"."fnDictamenJefeValidarTrigger"()'::regprocedure;
  v_def := pg_get_functiondef(v_oid);
  v_nuevo := replace(v_def,
    'if v_jefe_area is distinct from v_ticket.area_id then',
    'if v_jefe_area is distinct from v_ticket.area_id
     and not exists (select 1 from "Seguridad"."JefaturasArea" j
                      where j.usuario_id = new.jefe_id and j.area_id = v_ticket.area_id) then');
  if v_nuevo = v_def and v_def not like '%JefaturasArea%' then
    raise exception 'No se encontró el texto esperado en fnDictamenJefeValidarTrigger. Avísale a quien te dio el script.';
  end if;
  execute v_nuevo;

  -- Aviso de diseño entregado: también a los jefes con jefatura adicional
  v_oid := '"Solicitudes"."fnTicketNotificarFinalizadoTrigger"()'::regprocedure;
  v_def := pg_get_functiondef(v_oid);
  v_nuevo := replace(v_def,
    'where u.area_id = new.area_id',
    'where (u.area_id = new.area_id
          or exists (select 1 from "Seguridad"."JefaturasArea" j where j.usuario_id = u.id and j.area_id = new.area_id))');
  if v_nuevo = v_def and v_def not like '%JefaturasArea%' then
    raise exception 'No se encontró el texto esperado en fnTicketNotificarFinalizadoTrigger. Avísale a quien te dio el script.';
  end if;
  execute v_nuevo;
end $$;

-- ===== PARTE 40 =====
-- Fechas: solo días hábiles (lunes a viernes, sin feriados)
-- Primer día permitido = el primer día HÁBIL después del último día de producción
create or replace function "Solicitudes"."fnFechaEventoMinimaEscalar"(
  p_tipo_solicitud_id int,
  p_excepcional       boolean default false
)
returns date language plpgsql stable security definer set search_path = '' as $$
declare
  v_dia date;
begin
  v_dia := case
             when p_excepcional
               then ("Solicitudes"."fnSumarDiasHabilesEscalar"(current_timestamp, 2) at time zone 'America/Tegucigalpa')::date + 1
             else ("Solicitudes"."fnFechaLimiteCalcularEscalar"(p_tipo_solicitud_id) at time zone 'America/Tegucigalpa')::date + 1
           end;
  while not "Solicitudes"."fnEsDiaHabilEscalar"(v_dia) loop
    v_dia := v_dia + 1;
  end loop;
  return v_dia;
end;
$$;

-- Crear solicitud: la fecha del evento y los campos de fecha deben ser días hábiles
CREATE OR REPLACE FUNCTION "Solicitudes"."fnSolicitudCrearEscalar"(p_tipo_solicitud_id integer, p_detalle jsonb, p_excepcional boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_usuario_id    int := "Seguridad"."fnUsuarioActualIdEscalar"();
  v_es_admin      boolean := "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador');
  v_hoy           date := (current_timestamp at time zone 'America/Tegucigalpa')::date;
  v_formulario_id int;
  v_ticket_id     int;
  v_codigo        varchar(20);
  v_flujo         varchar(20);
  v_tipo_nombre   varchar(100);
  v_dias          int;
  v_fecha_evento  date;
  v_evento_minimo date;
  v_titulo        text := nullif(btrim(p_detalle->>'titulo'), '');
  v_dirigido_a    text := nullif(btrim(p_detalle->>'dirigido_a'), '');
  v_campus        int[];
  v_respuestas    jsonb := coalesce(p_detalle->'respuestas', '{}'::jsonb);
  v_snapshot      jsonb;
  v_desconocidas  text;
  v_campo         jsonb;
  v_clave         text;
  v_etiqueta      text;
  v_tipo_campo    text;
  v_valor         jsonb;
  v_texto         text;
  v_num           numeric;
  v_fecha         date;
  v_hora          time;
  v_max_longitud  int;
  v_etiquetas     jsonb;
  v_et_titulo     text;
  v_et_fecha      text;
  v_et_dirigido   text;
  v_lista         jsonb;
begin
  p_excepcional := coalesce(p_excepcional, false);

  if v_usuario_id is null then
    raise exception 'Debe iniciar sesión con un usuario activo.';
  end if;

  select flujo, nombre, dias_estimados, coalesce(etiquetas_generales, '{}'::jsonb)
    into v_flujo, v_tipo_nombre, v_dias, v_etiquetas
    from "Solicitudes"."TipoSolicitud"
   where id = p_tipo_solicitud_id and estado;

  if v_flujo is null then
    raise exception 'Tipo de solicitud inválido o inactivo.';
  end if;

  -- Nombres visibles de las generalidades para este tipo (por ejemplo "Fecha de actualización")
  v_et_titulo   := coalesce(v_etiquetas->>'titulo', 'título');
  v_et_fecha    := coalesce(v_etiquetas->>'fecha_evento', 'fecha del evento');
  v_et_dirigido := coalesce(v_etiquetas->>'dirigido_a', 'Dirigido a');

  -- Solicitud excepcional: solo Jefe de Área o Administrador, y nunca en el flujo de IA
  if p_excepcional and not (v_es_admin or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Jefe de Área')) then
    raise exception 'Solo un Jefe de Área puede enviar solicitudes excepcionales.' using errcode = 'check_violation';
  end if;

  if p_excepcional and v_flujo <> 'DISENO' then
    raise exception 'Las solicitudes de tipo "%" no pueden ser excepcionales.', v_tipo_nombre using errcode = 'check_violation';
  end if;

  -- Horario hábil: L-V 8:00 a. m. a 4:00 p. m. (salvo excepcionales y Administrador)
  if not p_excepcional and not v_es_admin and not "Solicitudes"."fnEsHorarioHabilEscalar"() then
    raise exception 'Las solicitudes solo se pueden enviar en días hábiles, de lunes a viernes de 8:00 a. m. a 4:00 p. m.'
          using errcode = 'check_violation';
  end if;

  ---------------------------------------------------------------------------
  -- Generalidades
  ---------------------------------------------------------------------------
  if v_titulo is null then
    raise exception 'El campo "%" es obligatorio.', initcap(v_et_titulo) using errcode = 'check_violation';
  end if;
  if length(v_titulo) > 200 then
    raise exception 'El campo "%" no puede tener más de 200 caracteres.', initcap(v_et_titulo) using errcode = 'check_violation';
  end if;

  if v_dirigido_a is null then
    raise exception 'Indique a quién va dirigido.' using errcode = 'check_violation';
  end if;
  if length(v_dirigido_a) > 200 then
    raise exception 'El campo "%" no puede tener más de 200 caracteres.', v_et_dirigido using errcode = 'check_violation';
  end if;

  -- Fecha del evento: obligatoria y nunca en el pasado
  begin
    v_fecha_evento := nullif(p_detalle->>'fecha_evento', '')::date;
  exception when others then
    raise exception 'La % no tiene un formato válido.', lower(v_et_fecha) using errcode = 'check_violation';
  end;

  if v_fecha_evento is null then
    raise exception 'La % es obligatoria.', lower(v_et_fecha) using errcode = 'check_violation';
  end if;

  if v_fecha_evento < v_hoy then
    raise exception 'La % (%) no puede ser anterior a hoy (%).',
          lower(v_et_fecha), to_char(v_fecha_evento, 'DD/MM/YYYY'), to_char(v_hoy, 'DD/MM/YYYY')
          using errcode = 'check_violation';
  end if;

  -- Solo días hábiles: lunes a viernes, sin feriados
  if not "Solicitudes"."fnEsDiaHabilEscalar"(v_fecha_evento) then
    raise exception 'La % (%) debe ser un día hábil: de lunes a viernes y que no sea feriado.',
          lower(v_et_fecha), to_char(v_fecha_evento, 'DD/MM/YYYY')
          using errcode = 'check_violation';
  end if;

  -- Anticipación: normal = días hábiles del tipo; excepcional = 2 días hábiles
  v_evento_minimo := "Solicitudes"."fnFechaEventoMinimaEscalar"(p_tipo_solicitud_id, p_excepcional);
  if v_fecha_evento < v_evento_minimo then
    if p_excepcional then
      raise exception 'Las solicitudes excepcionales necesitan 2 días hábiles de anticipación: la % debe ser a partir del %.',
            lower(v_et_fecha), to_char(v_evento_minimo, 'DD/MM/YYYY')
            using errcode = 'check_violation';
    else
      raise exception 'Para "%" se necesitan % días hábiles de anticipación: la % debe ser a partir del %.',
            v_tipo_nombre, v_dias, lower(v_et_fecha), to_char(v_evento_minimo, 'DD/MM/YYYY')
            using errcode = 'check_violation';
    end if;
  end if;

  -- Alcance: al menos un campus existente y activo
  if jsonb_typeof(p_detalle->'campus_ids') is distinct from 'array' then
    raise exception 'Seleccione al menos un campus en el alcance.' using errcode = 'check_violation';
  end if;

  begin
    v_campus := array(select distinct x::int from jsonb_array_elements_text(p_detalle->'campus_ids') x);
  exception when others then
    raise exception 'La lista de campus no es válida.' using errcode = 'check_violation';
  end;

  if cardinality(v_campus) = 0 then
    raise exception 'Seleccione al menos un campus en el alcance.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from unnest(v_campus) c(id)
              where not exists (select 1 from "Solicitudes"."Campus" k where k.id = c.id and k.estado)) then
    raise exception 'Uno o más campus seleccionados no existen o están inactivos.' using errcode = 'check_violation';
  end if;

  ---------------------------------------------------------------------------
  -- Campos configurables
  ---------------------------------------------------------------------------
  if jsonb_typeof(v_respuestas) <> 'object' then
    raise exception 'Las respuestas del formulario no tienen un formato válido.' using errcode = 'check_violation';
  end if;

  -- Copia de los campos activos tal como están al enviar
  select coalesce(jsonb_agg(to_jsonb(c) - 'usuario_registro' - 'fecha_registro' order by c.orden), '[]'::jsonb)
    into v_snapshot
    from "Solicitudes"."CampoFormulario" c
   where c.tipo_solicitud_id = p_tipo_solicitud_id and c.estado;

  -- Claves que no corresponden a ningún campo activo
  select string_agg(k, ', ') into v_desconocidas
    from jsonb_object_keys(v_respuestas) as k
   where not exists (select 1 from jsonb_array_elements(v_snapshot) e where e ->> 'clave' = k);

  if v_desconocidas is not null then
    raise exception 'Campos no válidos para este tipo de solicitud: %', v_desconocidas using errcode = 'check_violation';
  end if;

  -- Validar y normalizar cada campo
  for v_campo in select e from jsonb_array_elements(v_snapshot) e
  loop
    v_clave      := v_campo->>'clave';
    v_etiqueta   := v_campo->>'etiqueta';
    v_tipo_campo := v_campo->>'tipo_campo';
    v_valor      := v_respuestas->v_clave;

    -- Valores vacíos cuentan como no enviados
    if v_valor is not null and (
         jsonb_typeof(v_valor) = 'null'
      or (jsonb_typeof(v_valor) = 'string' and btrim(v_valor #>> '{}') = '')
      or (jsonb_typeof(v_valor) = 'array'  and jsonb_array_length(v_valor) = 0)) then
      v_valor := null;
    end if;

    -- Valor por defecto para lo que no se envió
    if v_valor is null and jsonb_typeof(v_campo->'valor_defecto') is not null
       and jsonb_typeof(v_campo->'valor_defecto') <> 'null' then
      v_valor := v_campo->'valor_defecto';
    end if;

    -- Obligatorios (una lista vacía no cuenta como respuesta)
    if (v_valor is null or (jsonb_typeof(v_valor) = 'array' and jsonb_array_length(v_valor) = 0))
       and coalesce((v_campo->>'obligatorio')::boolean, false) then
      raise exception 'El campo "%" es obligatorio.', v_etiqueta using errcode = 'check_violation';
    end if;

    if v_valor is null then
      v_respuestas := v_respuestas - v_clave;
      continue;
    end if;

    case v_tipo_campo
      when 'TEXTO', 'TEXTO_LARGO', 'URL' then
        if jsonb_typeof(v_valor) <> 'string' then
          raise exception 'El campo "%" debe ser texto.', v_etiqueta using errcode = 'check_violation';
        end if;
        v_texto := btrim(v_valor #>> '{}');
        if v_tipo_campo = 'URL' and v_texto !~* '^https?://' then
          raise exception 'El campo "%" debe ser un enlace que empiece con http:// o https://.', v_etiqueta
                using errcode = 'check_violation';
        end if;
        v_max_longitud := (v_campo->'validaciones'->>'max_longitud')::int;
        if v_max_longitud is not null and length(v_texto) > v_max_longitud then
          raise exception 'El campo "%" no puede tener más de % caracteres.', v_etiqueta, v_max_longitud
                using errcode = 'check_violation';
        end if;
        v_valor := to_jsonb(v_texto);

      when 'NUMERO' then
        begin
          v_num := (v_valor #>> '{}')::numeric;
        exception when others then
          raise exception 'El campo "%" debe ser un número.', v_etiqueta using errcode = 'check_violation';
        end;
        if v_campo->'validaciones' ? 'min' and v_num < (v_campo->'validaciones'->>'min')::numeric then
          raise exception 'El campo "%" debe ser mayor o igual a %.', v_etiqueta, v_campo->'validaciones'->>'min'
                using errcode = 'check_violation';
        end if;
        if v_campo->'validaciones' ? 'max' and v_num > (v_campo->'validaciones'->>'max')::numeric then
          raise exception 'El campo "%" debe ser menor o igual a %.', v_etiqueta, v_campo->'validaciones'->>'max'
                using errcode = 'check_violation';
        end if;
        v_valor := to_jsonb(v_num);

      when 'FECHA' then
        begin
          v_fecha := (v_valor #>> '{}')::date;
        exception when others then
          raise exception 'El campo "%" debe ser una fecha válida.', v_etiqueta using errcode = 'check_violation';
        end;
        if v_fecha < v_hoy then
          raise exception 'La fecha "%" (%) no puede ser anterior a hoy (%).',
                v_etiqueta, to_char(v_fecha, 'DD/MM/YYYY'), to_char(v_hoy, 'DD/MM/YYYY')
                using errcode = 'check_violation';
        end if;
        if not "Solicitudes"."fnEsDiaHabilEscalar"(v_fecha) then
          raise exception 'La fecha "%" (%) debe ser un día hábil: de lunes a viernes y que no sea feriado.',
                v_etiqueta, to_char(v_fecha, 'DD/MM/YYYY')
                using errcode = 'check_violation';
        end if;
        v_valor := to_jsonb(to_char(v_fecha, 'YYYY-MM-DD'));

      when 'HORA' then
        begin
          v_hora := (v_valor #>> '{}')::time;
        exception when others then
          raise exception 'El campo "%" debe ser una hora válida.', v_etiqueta using errcode = 'check_violation';
        end;
        v_valor := to_jsonb(to_char(v_hora, 'HH24:MI'));

      when 'BOOLEANO' then
        if jsonb_typeof(v_valor) <> 'boolean' then
          raise exception 'El campo "%" debe ser sí o no.', v_etiqueta using errcode = 'check_violation';
        end if;

      when 'SELECCION' then
        if jsonb_typeof(v_valor) <> 'string' or not ((v_campo->'opciones') @> jsonb_build_array(v_valor)) then
          raise exception 'El valor de "%" no es una opción válida.', v_etiqueta using errcode = 'check_violation';
        end if;

      when 'ETIQUETAS' then
        -- Lista libre de etiquetas (por ejemplo, logotipos): las opciones son solo sugerencias
        if jsonb_typeof(v_valor) <> 'array'
           or exists (select 1 from jsonb_array_elements(v_valor) x where jsonb_typeof(x) <> 'string') then
          raise exception 'El campo "%" debe ser una lista de textos.', v_etiqueta using errcode = 'check_violation';
        end if;
        select coalesce(jsonb_agg(to_jsonb(s.t) order by s.o), '[]'::jsonb) into v_lista
          from (select min(btrim(e.x)) as t, min(e.n) as o
                  from jsonb_array_elements_text(v_valor) with ordinality as e(x, n)
                 where btrim(e.x) <> ''
                 group by lower(btrim(e.x))) s;
        v_max_longitud := coalesce((v_campo->'validaciones'->>'max_longitud')::int, 100);
        if exists (select 1 from jsonb_array_elements_text(v_lista) x where length(x) > v_max_longitud) then
          raise exception 'Cada elemento de "%" puede tener como máximo % caracteres.', v_etiqueta, v_max_longitud
                using errcode = 'check_violation';
        end if;
        if v_campo->'validaciones' ? 'max' and jsonb_array_length(v_lista) > (v_campo->'validaciones'->>'max')::int then
          raise exception 'El campo "%" admite como máximo % elementos.', v_etiqueta, v_campo->'validaciones'->>'max'
                using errcode = 'check_violation';
        end if;
        if jsonb_array_length(v_lista) = 0 then
          if coalesce((v_campo->>'obligatorio')::boolean, false) then
            raise exception 'El campo "%" es obligatorio.', v_etiqueta using errcode = 'check_violation';
          end if;
          v_respuestas := v_respuestas - v_clave;
          continue;
        end if;
        v_valor := v_lista;

      when 'SELECCION_MULTIPLE' then
        if jsonb_typeof(v_valor) <> 'array'
           or exists (select 1 from jsonb_array_elements(v_valor) x where jsonb_typeof(x) <> 'string')
           or not ((v_campo->'opciones') @> v_valor) then
          raise exception 'Alguna de las opciones de "%" no es válida.', v_etiqueta using errcode = 'check_violation';
        end if;

      else
        raise exception 'El campo "%" tiene un tipo desconocido (%).', v_etiqueta, v_tipo_campo;
    end case;

    v_respuestas := jsonb_set(v_respuestas, array[v_clave], v_valor, true);
  end loop;

  -- Regla entre campos que antes era un CHECK de FormularioArte
  if v_snapshot @> '[{"clave":"hora_inicio","tipo_campo":"HORA"}]'::jsonb
     and v_snapshot @> '[{"clave":"hora_fin","tipo_campo":"HORA"}]'::jsonb
     and v_respuestas ? 'hora_inicio' and v_respuestas ? 'hora_fin'
     and (v_respuestas->>'hora_fin')::time < (v_respuestas->>'hora_inicio')::time then
    raise exception 'La hora de finalización no puede ser anterior a la hora de inicio.' using errcode = 'check_violation';
  end if;

  ---------------------------------------------------------------------------
  -- Guardar
  ---------------------------------------------------------------------------
  insert into "Solicitudes"."Formularios"
         (tipo_solicitud_id, fecha_evento, titulo, dirigido_a, respuestas, campos_snapshot)
  values (p_tipo_solicitud_id, v_fecha_evento, v_titulo, v_dirigido_a, v_respuestas, v_snapshot)
  returning id into v_formulario_id;

  insert into "Solicitudes"."FormularioCampus" (formulario_id, campus_id)
  select v_formulario_id, c from unnest(v_campus) c;

  insert into "Solicitudes"."Ticket"
         (tipo_solicitud_id, formulario_id, usuario_registro, es_excepcional, excepcional_estado)
  values (p_tipo_solicitud_id, v_formulario_id, v_usuario_id,
          p_excepcional,
          case when p_excepcional then 'PENDIENTE' end)
  returning id, codigo into v_ticket_id, v_codigo;

  -- Validación (Cobertura de evento): avisar a los Validadores
  if v_flujo = 'VALIDACION' then
    insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
    select u.id, v_ticket_id,
           format('Nueva solicitud para validar: %s (%s), para el %s.', v_codigo, v_tipo_nombre, to_char(v_fecha_evento, 'DD/MM/YYYY'))
      from "Seguridad"."Usuarios" u
     where u.estado and "Seguridad"."fnUsuarioTieneRolEscalar"(u.id, 'Validador');
  end if;

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
$function$;

-- ===== PARTE 41 =====
-- Nuevo tipo "Trifolio" (categoría Otros; la fecha se llama "Fecha de entrega")
insert into "Solicitudes"."TipoSolicitud" (nombre, dias_estimados, dias_habiles, flujo, categoria, descripcion, etiquetas_generales)
select 'Trifolio', 10, true, 'DISENO', 'OTROS', 'Diseño de trifolio informativo.', '{"fecha_evento": "Fecha de entrega"}'
 where not exists (select 1 from "Solicitudes"."TipoSolicitud" where nombre ilike 'Trifolio');

insert into "Solicitudes"."CampoFormulario"
       (tipo_solicitud_id, clave, etiqueta, tipo_campo, placeholder, ayuda, opciones, validaciones, obligatorio, orden)
select ts.id, v.clave, v.etiqueta, v.tipo_campo, v.placeholder, v.ayuda, v.opciones::jsonb, v.validaciones::jsonb, v.obligatorio, v.orden
  from "Solicitudes"."TipoSolicitud" ts
  cross join (values
    ('descripcion', 'Descripción', 'TEXTO_LARGO',
     'Escribe aquí las instrucciones e información completa que deseas incluir...',
     'Incluye los textos, secciones y datos de contacto que debe llevar el trifolio.', null, '{"max_longitud": 2000}', true, 10),
    ('logotipos', 'Logotipos', 'ETIQUETAS', 'Escribe un logotipo y presiona Enter',
     'Agrega todos los logotipos que deben aparecer.', '["Logo de VOAE", "Logo de la UNAH", "Logo de la Facultad"]', '{"max_longitud": 100}', false, 20),
    ('observaciones', 'Observaciones', 'TEXTO_LARGO', null, null, null, '{"max_longitud": 1000}', false, 30)
  ) as v(clave, etiqueta, tipo_campo, placeholder, ayuda, opciones, validaciones, obligatorio, orden)
 where ts.nombre = 'Trifolio'
on conflict do nothing;

-- ===== PARTE 42 =====
notify pgrst, 'reload schema';

-- Verificación (todo debe salir en true)
select
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname in ('Seguridad', 'Solicitudes')
                 and (p.prosrc like '%por el Asignador%' or p.prosrc like '%un Validador%' or p.prosrc like '%la trabaja %'))    as mensajes_sin_roles,
  (select prosrc not like '%Jefe de%' from pg_proc where proname = 'fnPuedeVerAsignacionEscalar')                           as jefe_no_ve_disenador,
  not exists (select 1 from pg_policies where tablename = 'Campus' and cmd <> 'SELECT')                                    as campus_solo_lectura,
  (select count(*) = 3 from "Seguridad"."Areas" where tipo = 'COORDINACION')                                               as tres_coordinaciones,
  not exists (select 1 from pg_policy where coalesce(pg_get_expr(polqual, polrelid), '') like '%fnUsuarioActualAreaEscalar%') as politicas_con_jefaturas,
  (select prosrc like '%fnEsDiaHabilEscalar"(v_fecha_evento)%' from pg_proc where proname = 'fnSolicitudCrearEscalar')      as fechas_habiles,
  exists (select 1 from "Solicitudes"."TipoSolicitud" where nombre = 'Trifolio' and categoria = 'OTROS')                    as trifolio;
