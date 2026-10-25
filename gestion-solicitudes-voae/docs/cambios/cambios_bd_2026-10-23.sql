-- =====================================================================
-- iTickets: cambios del 23 de octubre de 2026 (Partes 28 a 35)
-- Requiere todo lo aplicado hasta el 23/10 (formularios configurables y flujo de afiches con IA).
-- Ejecutar en el SQL Editor de Supabase, UNA PARTE A LA VEZ y en orden. Cada parte se ejecuta una sola vez.
-- Probado sobre una réplica de la base con los scripts del registro del 21-23 de octubre.
-- =====================================================================

-- ===== PARTE 28 =====
-- Rol "Aprobador IA" pasa a llamarse "Validador"
-- Se actualiza el nombre en el catálogo y en todas las funciones y políticas que lo usan.
do $$
declare
  r       record;
  v_def   text;
  v_using text;
  v_check text;
  v_funcs int := 0;
  v_pols  int := 0;
begin
  update "Seguridad"."Roles"
     set nombre = 'Validador',
         descripcion = 'Valida afiches elaborados con IA y aprueba o rechaza las solicitudes de Cobertura de evento'
   where nombre = 'Aprobador IA';

  -- Funciones que mencionan el nombre anterior
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('Seguridad', 'Solicitudes', 'public') and p.prosrc like '%Aprobador IA%'
  loop
    v_def := replace(pg_get_functiondef(r.oid), 'Aprobador IA', 'Validador');
    execute v_def;
    v_funcs := v_funcs + 1;
  end loop;

  -- Políticas (tablas y Storage) que mencionan el nombre anterior
  for r in select pol.polname, pol.polrelid, pol.polqual, pol.polwithcheck
             from pg_policy pol
            where coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') like '%Aprobador IA%'
               or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') like '%Aprobador IA%'
  loop
    v_using := replace(pg_get_expr(r.polqual, r.polrelid), 'Aprobador IA', 'Validador');
    v_check := replace(pg_get_expr(r.polwithcheck, r.polrelid), 'Aprobador IA', 'Validador');
    if v_using is not null then
      execute format('alter policy %I on %s using (%s)', r.polname, r.polrelid::regclass, v_using);
    end if;
    if v_check is not null then
      execute format('alter policy %I on %s with check (%s)', r.polname, r.polrelid::regclass, v_check);
    end if;
    v_pols := v_pols + 1;
  end loop;

  raise notice 'Rol renombrado a "Validador". Funciones actualizadas: %. Políticas actualizadas: %.', v_funcs, v_pols;
end $$;

-- ===== PARTE 29 =====
-- Catálogo de campus: se reemplaza por la lista oficial (24 campus)
-- La tabla no se borra (la usan las solicitudes y fnSolicitudCrearEscalar): los campus que no están en la lista se desactivan.
with lista(nombre, orden) as (values
  ('CIUDAD UNIVERSITARIA', 1), ('CRAED CHOLUTECA', 2), ('CRAED JUTICALPA', 3), ('CRAED SIGUATEPEQUE', 4),
  ('CRAED PROGRESO', 5), ('CRAED PARAISO', 6), ('CRAED TEGUCIGALPA', 7), ('CRAED LA ENTRADA', 8),
  ('CRAED TOCOA', 9), ('C.U.R.C.', 10), ('UNAH VALLE DE SULA', 11), ('C.U.R.O.C.', 12),
  ('C.U.R.N.O.', 13), ('C.U.R.L.P.', 14), ('UNAH-TEC-AGUAN', 15), ('UNAH TEC-DANLI', 16),
  ('I.T.S.T. -UNAH', 17), ('C.U.R.LA.', 18), ('UNAH-VS TELECENTRO CHOLOMA', 19), ('UNAH-VS TELECENTRO CORTES', 20),
  ('UNAH TELECENTRO GRACIAS', 21), ('UNAH TELECENTRO ROATAN', 22), ('UNAH TELECENTRO OCOTEPEQUE', 23),
  ('UNAH TELECENTRO MARCALA', 24)
),
desactivados as (
  update "Solicitudes"."Campus" c set estado = false
   where c.estado and upper(btrim(c.nombre)) not in (select nombre from lista)
  returning 1
),
actualizados as (
  update "Solicitudes"."Campus" c set nombre = l.nombre, orden = l.orden, estado = true
    from lista l
   where upper(btrim(c.nombre)) = l.nombre
  returning c.nombre
)
insert into "Solicitudes"."Campus" (nombre, orden, estado)
select l.nombre, l.orden, true
  from lista l
 where not exists (select 1 from "Solicitudes"."Campus" c where upper(btrim(c.nombre)) = l.nombre);

-- ===== PARTE 30 =====
-- Tipos de solicitud: categoría visual, nombres visibles de las generalidades y aviso destacado
alter table "Solicitudes"."TipoSolicitud"
  add column if not exists categoria           varchar(20) not null default 'OTROS',
  add column if not exists etiquetas_generales jsonb       not null default '{}'::jsonb,
  add column if not exists aviso               text;

alter table "Solicitudes"."TipoSolicitud" drop constraint if exists "chkTipoSolicitud_Categoria";
alter table "Solicitudes"."TipoSolicitud" add constraint "chkTipoSolicitud_Categoria"
  check (categoria in ('ARTE', 'VIDEO', 'DIRCOM', 'PROTOCOLO', 'OTROS'));

alter table "Solicitudes"."TipoSolicitud" drop constraint if exists "chkTipoSolicitud_EtiquetasGenerales";
alter table "Solicitudes"."TipoSolicitud" add constraint "chkTipoSolicitud_EtiquetasGenerales"
  check (jsonb_typeof(etiquetas_generales) = 'object'
         and etiquetas_generales - array['titulo', 'fecha_evento', 'dirigido_a', 'alcance'] = '{}'::jsonb);

-- Se corrige la contradicción "default 1" contra el mínimo de 10 días
alter table "Solicitudes"."TipoSolicitud" alter column dias_estimados set default 10;

-- Categoría de los tipos existentes, deducida de sus campos (vienen de su formulario original)
update "Solicitudes"."TipoSolicitud" ts
   set categoria = case
         when exists (select 1 from "Solicitudes"."CampoFormulario" c where c.tipo_solicitud_id = ts.id and c.clave = 'lugar_propuesto') then 'PROTOCOLO'
         when exists (select 1 from "Solicitudes"."CampoFormulario" c where c.tipo_solicitud_id = ts.id and c.clave = 'objetivo')        then 'VIDEO'
         when exists (select 1 from "Solicitudes"."CampoFormulario" c where c.tipo_solicitud_id = ts.id and c.clave = 'tipo_material')   then 'DIRCOM'
         when exists (select 1 from "Solicitudes"."CampoFormulario" c where c.tipo_solicitud_id = ts.id and c.clave in ('hora_inicio', 'aplica_articulo_140')) then 'ARTE'
         else 'OTROS' end;

-- Plantilla de PowerPoint: nombre nuevo y etiquetas visibles ("Temática", "Fecha de entrega")
update "Solicitudes"."TipoSolicitud"
   set nombre = 'Plantilla de Power Point / Credencial / Gafete',
       etiquetas_generales = etiquetas_generales || '{"titulo": "Temática", "fecha_evento": "Fecha de entrega"}'
 where nombre ilike 'Plantilla de Power%Point%';

-- Página web: la fecha del evento se muestra como "Fecha de actualización"
update "Solicitudes"."TipoSolicitud"
   set etiquetas_generales = etiquetas_generales || '{"fecha_evento": "Fecha de actualización"}'
 where nombre ilike '%p_gina%web%';

-- Video: aviso destacado
update "Solicitudes"."TipoSolicitud"
   set aviso = 'Toma en consideración el tiempo de promoción en los medios institucionales.'
 where nombre ilike 'Grabaci_n y edici_n de video%';

-- ===== PARTE 31 =====
-- Campos configurables: etiquetas libres (logotipos) y nunca números negativos
alter table "Solicitudes"."CampoFormulario" drop constraint if exists "chkCampoFormulario_TipoCampo";
alter table "Solicitudes"."CampoFormulario" add constraint "chkCampoFormulario_TipoCampo" check (tipo_campo in ('TEXTO','TEXTO_LARGO','NUMERO','FECHA','HORA','BOOLEANO','SELECCION','SELECCION_MULTIPLE','URL','ETIQUETAS'));

alter table "Solicitudes"."CampoFormulario" drop constraint if exists "chkCampoFormulario_ValidacionesNoNegativas";
alter table "Solicitudes"."CampoFormulario" add constraint "chkCampoFormulario_ValidacionesNoNegativas" check (
  validaciones is null or (
        coalesce((validaciones->>'max_longitud')::numeric, 1) > 0
    and coalesce((validaciones->>'min')::numeric, 0) >= 0
    and coalesce((validaciones->>'max')::numeric, 0) >= 0
    and (not (validaciones ? 'min' and validaciones ? 'max')
         or (validaciones->>'max')::numeric >= (validaciones->>'min')::numeric)));

-- Logotipos: de lista cerrada a etiquetas libres (las opciones quedan como sugerencias)
alter table "Solicitudes"."CampoFormulario" disable trigger "tgrCampoFormularioValidarActualizar";

update "Solicitudes"."CampoFormulario"
   set tipo_campo   = 'ETIQUETAS',
       opciones     = '["Logo de VOAE", "Logo de la UNAH", "Logo de la Facultad"]',
       placeholder  = 'Escribe un logotipo y presiona Enter',
       ayuda        = coalesce(ayuda, 'Agrega todos los logotipos que deben aparecer. Puedes escribir otros que no estén en la lista.'),
       validaciones = coalesce(validaciones, '{}'::jsonb) || '{"max_longitud": 100}'
 where clave = 'logotipos' and tipo_campo = 'SELECCION_MULTIPLE';

alter table "Solicitudes"."CampoFormulario" enable trigger "tgrCampoFormularioValidarActualizar";

-- Crear solicitud: etiquetas libres, nombres visibles de las generalidades, flujo de validación
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

-- ===== PARTE 32 =====
-- Afiches con IA: solo se sube el afiche (sin "Otros adjuntos")
create or replace function "Solicitudes"."fnAdjuntoFlujoValidarTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from "Solicitudes"."Ticket" t
               join "Solicitudes"."TipoSolicitud" ts on ts.id = t.tipo_solicitud_id
              where t.id = new.ticket_id and ts.flujo = 'APROBACION_IA') then
    raise exception 'Las solicitudes de aprobación de afiches con IA solo admiten el afiche a revisar; no se aceptan otros adjuntos.'
          using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists "tgrAdjuntosFlujoValidarInsertar" on "Solicitudes"."Adjuntos";
create trigger "tgrAdjuntosFlujoValidarInsertar"
before insert on "Solicitudes"."Adjuntos"
for each row execute function "Solicitudes"."fnAdjuntoFlujoValidarTrigger"();

-- ===== PARTE 33 =====
-- Trifolio: se elimina de forma permanente (con todo lo que dependa de él)
do $$
declare
  v_tipo    int;
  v_tickets int[];
  v_forms   int[];
  r         record;
begin
  select id into v_tipo from "Solicitudes"."TipoSolicitud" where nombre ilike 'Trifolio';
  if v_tipo is null then
    raise notice 'Trifolio no existe. Nada que hacer.';
    return;
  end if;

  select coalesce(array_agg(id), '{}') into v_tickets from "Solicitudes"."Ticket" where tipo_solicitud_id = v_tipo;
  select coalesce(array_agg(id), '{}') into v_forms   from "Solicitudes"."Formularios" where tipo_solicitud_id = v_tipo;

  -- Todo lo que apunta a esos tickets (historial, entregables, dictámenes, adjuntos, bitácoras...),
  -- desbloqueando solo durante el borrado las tablas que impiden borrar
  for r in select c.conrelid::regclass as tabla, a.attname as columna
             from pg_constraint c
             join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
            where c.contype = 'f' and c.confrelid = '"Solicitudes"."Ticket"'::regclass
  loop
    execute format('alter table %s disable trigger user', r.tabla);
    execute format('delete from %s where %I = any ($1)', r.tabla, r.columna) using v_tickets;
    execute format('alter table %s enable trigger user', r.tabla);
  end loop;

  delete from "Solicitudes"."Ticket" where id = any (v_tickets);

  for r in select c.conrelid::regclass as tabla, a.attname as columna
             from pg_constraint c
             join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
            where c.contype = 'f' and c.confrelid = '"Solicitudes"."Formularios"'::regclass
              and c.conrelid <> '"Solicitudes"."Ticket"'::regclass
  loop
    execute format('delete from %s where %I = any ($1)', r.tabla, r.columna) using v_forms;
  end loop;
  delete from "Solicitudes"."Formularios" where id = any (v_forms);

  alter table "Solicitudes"."CampoFormulario" disable trigger user;
  delete from "Solicitudes"."CampoFormulario" where tipo_solicitud_id = v_tipo;
  alter table "Solicitudes"."CampoFormulario" enable trigger user;

  delete from "Solicitudes"."TipoSolicitud" where id = v_tipo;
  raise notice 'Trifolio eliminado (% solicitud(es)). Si tenían archivos, bórralos en Storage: carpetas %.', cardinality(v_tickets), v_tickets;
end $$;

-- ===== PARTE 34 =====
-- Flujo nuevo "VALIDACION" y tipo "Cobertura de evento": el Validador solo aprueba o rechaza
do $$
declare r record;
begin
  -- Se reemplaza la restricción de valores de "flujo", tenga el nombre que tenga
  for r in select conname from pg_constraint
            where conrelid = '"Solicitudes"."TipoSolicitud"'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ilike '%flujo%'
  loop
    execute format('alter table "Solicitudes"."TipoSolicitud" drop constraint %I', r.conname);
  end loop;
end $$;

alter table "Solicitudes"."TipoSolicitud" add constraint "chkTipoSolicitud_Flujo"
  check (flujo in ('DISENO', 'APROBACION_IA', 'VALIDACION'));

-- Decisión del Validador (una por solicitud, no se modifica ni se borra)
create table "Solicitudes"."DecisionValidacion" (
  id             int generated always as identity constraint "pkDecisionValidacion" primary key,
  ticket_id      int not null constraint "fkDecisionValidacion_Ticket" references "Solicitudes"."Ticket" (id),
  validador_id   int not null constraint "fkDecisionValidacion_Validador" references "Seguridad"."Usuarios" (id),
  decision       varchar(10) not null,
  comentario     text,
  fecha_decision timestamptz not null default current_timestamp,
  constraint "ukDecisionValidacion_Ticket" unique (ticket_id),
  constraint "chkDecisionValidacion_Decision" check (decision in ('APROBADO', 'RECHAZADO')),
  constraint "chkDecisionValidacion_Comentario" check (decision <> 'RECHAZADO' or btrim(coalesce(comentario, '')) <> '')
);
create index "ixDecisionValidacion_Validador" on "Solicitudes"."DecisionValidacion" (validador_id);

create or replace function "Solicitudes"."fnDecisionValidacionValidarTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_estado varchar(50);
  v_flujo  varchar(20);
begin
  new.validador_id := coalesce(new.validador_id, "Seguridad"."fnUsuarioActualIdEscalar"());
  if new.validador_id is distinct from "Seguridad"."fnUsuarioActualIdEscalar"() then
    raise exception 'La decisión debe registrarse con su propio usuario.' using errcode = 'check_violation';
  end if;
  if not "Seguridad"."fnUsuarioTieneRolEscalar"(new.validador_id, 'Validador') then
    raise exception 'Solo un Validador puede aprobar o rechazar esta solicitud.' using errcode = 'check_violation';
  end if;

  select e.nombre, ts.flujo into v_estado, v_flujo
    from "Solicitudes"."Ticket" t
    join "Solicitudes"."Estado" e         on e.id = t.estado_id
    join "Solicitudes"."TipoSolicitud" ts on ts.id = t.tipo_solicitud_id
   where t.id = new.ticket_id
     for update of t;

  if not found then
    raise exception 'El ticket % no existe.', new.ticket_id;
  end if;
  if v_flujo <> 'VALIDACION' then
    raise exception 'Este tipo de solicitud no se aprueba con una decisión de validación.' using errcode = 'check_violation';
  end if;
  if v_estado not in ('Enviado', 'Retrasado') then
    raise exception 'Esta solicitud ya fue respondida.' using errcode = 'check_violation';
  end if;

  new.decision       := upper(btrim(new.decision));
  new.comentario     := nullif(btrim(new.comentario), '');
  new.fecha_decision := current_timestamp;
  return new;
end;
$$;

create or replace function "Solicitudes"."fnDecisionValidacionAplicarTrigger"()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante int;
  v_codigo      varchar(20);
  v_tipo        varchar(100);
begin
  update "Solicitudes"."Ticket"
     set estado_id = "Solicitudes"."fnObtenerEstadoIdEscalar"(case new.decision when 'APROBADO' then 'Aprobado' else 'Rechazado' end)
   where id = new.ticket_id
  returning usuario_registro, codigo into v_solicitante, v_codigo;

  select ts.nombre into v_tipo
    from "Solicitudes"."Ticket" t join "Solicitudes"."TipoSolicitud" ts on ts.id = t.tipo_solicitud_id
   where t.id = new.ticket_id;

  insert into "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
  values (v_solicitante, new.ticket_id,
          case new.decision
            when 'APROBADO' then format('Tu solicitud %s (%s) fue APROBADA.', v_codigo, v_tipo)
            else format('Tu solicitud %s (%s) fue RECHAZADA. Motivo: %s', v_codigo, v_tipo, new.comentario)
          end);
  return null;
end;
$$;

create trigger "tgrDecisionValidacionValidarInsertar"
before insert on "Solicitudes"."DecisionValidacion"
for each row execute function "Solicitudes"."fnDecisionValidacionValidarTrigger"();

create trigger "tgrDecisionValidacionAplicarInsertar"
after insert on "Solicitudes"."DecisionValidacion"
for each row execute function "Solicitudes"."fnDecisionValidacionAplicarTrigger"();

create trigger "tgrDecisionValidacionModificar"
before update or delete on "Solicitudes"."DecisionValidacion"
for each row execute function "Solicitudes"."fnBloquearModificacionTrigger"('Una decisión de validación no se puede modificar ni borrar.');

alter table "Solicitudes"."DecisionValidacion" enable row level security;

create policy "polDecisionValidacionLeer" on "Solicitudes"."DecisionValidacion"
  for select to authenticated
  using (exists (select 1 from "Solicitudes"."Ticket" t where t.id = "DecisionValidacion".ticket_id));

create policy "polDecisionValidacionRegistrar" on "Solicitudes"."DecisionValidacion"
  for insert to authenticated
  with check (validador_id = "Seguridad"."fnUsuarioActualIdEscalar"()
              and "Seguridad"."fnUsuarioActualTieneRolEscalar"('Validador'::character varying));

grant select, insert on "Solicitudes"."DecisionValidacion" to authenticated;

-- Reglas del sistema que deben conocer el flujo nuevo
CREATE OR REPLACE FUNCTION "Solicitudes"."fnTicketValidarTransicionTrigger"()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_anterior     varchar(50);
  v_nuevo        varchar(50);
  v_permitido    boolean;
  v_flujo        varchar(20);
  v_ult_envio    int;
  v_ult_intento  int;
  v_ult_decision varchar(10);
begin
  select nombre into v_anterior from "Solicitudes"."Estado" where id = old.estado_id;
  select nombre into v_nuevo    from "Solicitudes"."Estado" where id = new.estado_id;
  v_flujo := "Solicitudes"."fnTipoSolicitudFlujoEscalar"(new.tipo_solicitud_id);

  -- ---------------- Flujo de validación (Cobertura de evento): solo Aprobado o Rechazado ----------------
  if v_flujo = 'VALIDACION' then
    v_permitido := case v_anterior
        when 'Enviado'   then v_nuevo in ('Aprobado', 'Rechazado', 'Retrasado')
        when 'Retrasado' then v_nuevo in ('Aprobado', 'Rechazado')
        else false                                      -- Aprobado y Rechazado son finales
    end;

    if not v_permitido then
      raise exception 'Transición de estado no permitida para el ticket %: "%" -> "%".', new.codigo, v_anterior, v_nuevo
            using errcode = 'check_violation';
    end if;

    if v_nuevo = 'Retrasado' then
      if new.fecha_limite >= current_timestamp then
        raise exception 'El ticket % aún no supera su fecha límite.', new.codigo using errcode = 'check_violation';
      end if;
      return new;
    end if;

    if not exists (select 1 from "Solicitudes"."DecisionValidacion" d
                    where d.ticket_id = new.id
                      and d.decision = case v_nuevo when 'Aprobado' then 'APROBADO' else 'RECHAZADO' end) then
      raise exception 'El ticket % solo pasa a "%" mediante la decisión de un Validador.', new.codigo, v_nuevo
            using errcode = 'check_violation';
    end if;

    return new;
  end if;

  -- ---------------- Flujo de aprobación de afiches con IA ----------------
  if v_flujo = 'APROBACION_IA' then
    v_permitido := case v_anterior
        when 'Enviado'    then v_nuevo in ('Aprobado', 'Corrección', 'Rechazado', 'Retrasado')
        when 'Retrasado'  then v_nuevo in ('Aprobado', 'Corrección', 'Rechazado')
        when 'Corrección' then v_nuevo in ('Enviado')
        else false                                      -- Aprobado y Rechazado son finales
    end;

    if not v_permitido then
      raise exception 'Transición de estado no permitida para el ticket %: "%" -> "%".', new.codigo, v_anterior, v_nuevo
            using errcode = 'check_violation';
    end if;

    if v_nuevo = 'Retrasado' then
      if new.fecha_limite >= current_timestamp then
        raise exception 'El ticket % aún no supera su fecha límite.', new.codigo using errcode = 'check_violation';
      end if;
      return new;
    end if;

    -- Último envío y su revisión (si la tiene)
    select e.id, e.intento into v_ult_envio, v_ult_intento
      from "Solicitudes"."EnvioIA" e
     where e.ticket_id = new.id
     order by e.intento desc
     limit 1;

    select r.decision into v_ult_decision
      from "Solicitudes"."RevisionIA" r
     where r.envio_id = v_ult_envio;

    if v_nuevo = 'Enviado' then
      if v_ult_envio is null or v_ult_decision is not null then
        raise exception 'El ticket % solo vuelve a "Enviado" cuando se reenvía el afiche.', new.codigo
              using errcode = 'check_violation';
      end if;
    elsif v_nuevo = 'Aprobado' then
      if v_ult_decision is distinct from 'APROBADO' then
        raise exception 'El ticket % solo pasa a "Aprobado" mediante la revisión de un Validador.', new.codigo
              using errcode = 'check_violation';
      end if;
    elsif v_nuevo = 'Corrección' then
      if v_ult_decision is distinct from 'RECHAZADO' or v_ult_intento >= 5 then
        raise exception 'El ticket % solo pasa a "Corrección" con un rechazo y si le quedan intentos.', new.codigo
              using errcode = 'check_violation';
      end if;
    elsif v_nuevo = 'Rechazado' then
      if v_ult_decision is distinct from 'RECHAZADO' or v_ult_intento < 5 then
        raise exception 'El ticket % solo pasa a "Rechazado" con el rechazo del quinto intento.', new.codigo
              using errcode = 'check_violation';
      end if;
    end if;

    return new;
  end if;

  -- ---------------- Flujo de diseño (sin cambios) ----------------
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
$function$;

CREATE OR REPLACE FUNCTION "Solicitudes"."fnTicketValidarTrigger"()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_tipo_formulario   INT;
    v_tipo_activo       BOOLEAN;
    v_tipo_nombre       VARCHAR(100);
    v_usuario_activo    BOOLEAN;
    v_usuario_area      INT;
BEGIN
    -- Tipo de solicitud
    IF TG_OP = 'INSERT'
       OR NEW.tipo_solicitud_id IS DISTINCT FROM OLD.tipo_solicitud_id
       OR NEW.formulario_id     IS DISTINCT FROM OLD.formulario_id THEN

        SELECT f.tipo_solicitud_id INTO v_tipo_formulario
          FROM "Solicitudes"."Formularios" f WHERE f.id = NEW.formulario_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El formulario % no existe.', NEW.formulario_id USING ERRCODE = 'foreign_key_violation';
        END IF;
        IF v_tipo_formulario IS DISTINCT FROM NEW.tipo_solicitud_id THEN
            RAISE EXCEPTION 'Tipo de solicitud inconsistente: el ticket indica % pero el formulario % es de tipo %.',
                  NEW.tipo_solicitud_id, NEW.formulario_id, v_tipo_formulario
                  USING ERRCODE = 'check_violation';
        END IF;

        SELECT ts.estado, ts.nombre INTO v_tipo_activo, v_tipo_nombre
          FROM "Solicitudes"."TipoSolicitud" ts WHERE ts.id = NEW.tipo_solicitud_id;
        IF v_tipo_activo IS NOT TRUE THEN
            RAISE EXCEPTION 'El tipo de solicitud "%" está inactivo o no existe.', v_tipo_nombre
                  USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    -- Solicitante, área y estado inicial
    IF TG_OP = 'INSERT' THEN
        SELECT u.estado, u.area_id INTO v_usuario_activo, v_usuario_area
          FROM "Seguridad"."Usuarios" u WHERE u.id = NEW.usuario_registro;
        IF v_usuario_activo IS NOT TRUE THEN
            RAISE EXCEPTION 'El usuario solicitante % no existe o está desactivado.', NEW.usuario_registro
                  USING ERRCODE = 'check_violation';
        END IF;

        NEW.area_id := COALESCE(NEW.area_id, v_usuario_area);
        IF NEW.area_id IS NULL THEN
            RAISE EXCEPTION 'El solicitante % no tiene área asignada; indique area_id.', NEW.usuario_registro
                  USING ERRCODE = 'not_null_violation';
        END IF;

        NEW.estado_id := COALESCE(NEW.estado_id, "Solicitudes"."fnObtenerEstadoIdEscalar"('Enviado'));
        IF NEW.estado_id <> "Solicitudes"."fnObtenerEstadoIdEscalar"('Enviado') THEN
            RAISE EXCEPTION 'Todo ticket nuevo debe iniciar en estado "Enviado".' USING ERRCODE = 'check_violation';
        END IF;

        NEW.fecha_entrega_diseno := NULL;
        NEW.aprobado_automatico  := false;
    END IF;

    -- Solo las solicitudes de diseño se asignan a un diseñador (IA y validación no)
    IF NEW.disenador_id IS NOT NULL
       AND "Solicitudes"."fnTipoSolicitudFlujoEscalar"(NEW.tipo_solicitud_id) <> 'DISENO' THEN
        RAISE EXCEPTION 'Este tipo de solicitud no se asigna a un diseñador.'
              USING ERRCODE = 'check_violation';
    END IF;

    -- Diseñador asignado
    IF NEW.disenador_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.disenador_id IS DISTINCT FROM OLD.disenador_id)
       AND NOT "Seguridad"."fnUsuarioTieneRolEscalar"(NEW.disenador_id, 'Diseñador') THEN
        RAISE EXCEPTION 'El usuario % no está activo o no tiene el rol "Diseñador".', NEW.disenador_id
              USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION "Solicitudes"."fnEntregableValidarTrigger"()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_ticket        "Solicitudes"."Ticket"%ROWTYPE;
    v_estado        VARCHAR(50);
    v_ronda         INT;        -- 1 = propuesta original, 2 = diseño corregido
    v_vencido       BOOLEAN;
BEGIN
    SELECT * INTO v_ticket FROM "Solicitudes"."Ticket" WHERE id = NEW.ticket_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El ticket % no existe.', NEW.ticket_id USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- Nuevo
    IF "Solicitudes"."fnTipoSolicitudFlujoEscalar"(v_ticket.tipo_solicitud_id) <> 'DISENO' THEN
        RAISE EXCEPTION 'Este tipo de solicitud no lleva entregables de diseño.'
              USING ERRCODE = 'check_violation';
    END IF;

    SELECT nombre INTO v_estado FROM "Solicitudes"."Estado" WHERE id = v_ticket.estado_id;

    IF NOT "Seguridad"."fnUsuarioTieneRolEscalar"(NEW.disenador_id, 'Diseñador') THEN
        RAISE EXCEPTION 'El usuario % no está activo o no tiene el rol "Diseñador".', NEW.disenador_id
              USING ERRCODE = 'check_violation';
    END IF;

    v_ronda := 1 + (SELECT count(*) FROM "Solicitudes"."DictamenJefe"
                     WHERE ticket_id = NEW.ticket_id AND decision = 'CORRECCION');
    v_vencido := v_estado = 'Finalizado'
                 AND "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(v_ticket.fecha_entrega_diseno);

    -- Ticket aprobado (o con 24 h vencidas): el archivo es evidencia de la publicación.
    -- En cualquier otro estado: es un diseño (propuesta en ronda 1, corregido en ronda 2).
    IF v_estado = 'Aprobado' OR v_vencido THEN
        NEW.estado_id := "Solicitudes"."fnObtenerEstadoIdEscalar"('Aprobado');
    ELSE
        NEW.estado_id := v_ticket.estado_id;
    END IF;

    NEW.version      := v_ronda;
    NEW.fecha_subida := COALESCE(NEW.fecha_subida, CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION "Solicitudes"."fnVerificarTicketsRetrasados"()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_total int;
begin
  -- Primero: excepcionales que nadie atendió antes de su evento
  perform "Solicitudes"."fnRechazarExcepcionalesVencidas"();

  with retrasados as (
      update "Solicitudes"."Ticket" t
         set estado_id = "Solicitudes"."fnObtenerEstadoIdEscalar"('Retrasado')
        from "Solicitudes"."Estado" e, "Solicitudes"."TipoSolicitud" ts
       where e.id = t.estado_id
         and ts.id = t.tipo_solicitud_id
         and t.fecha_limite < current_timestamp
         and not (t.es_excepcional and t.excepcional_estado = 'PENDIENTE')
         and (   (ts.flujo = 'DISENO'
                  and ((e.nombre in ('Enviado', 'En revisión', 'En proceso') and t.fecha_entrega_diseno is null)
                       or e.nombre = 'Corrección'))
              or (ts.flujo in ('APROBACION_IA', 'VALIDACION') and e.nombre = 'Enviado'))
      returning t.id, t.codigo, t.disenador_id, t.tipo_solicitud_id, t.fecha_limite, ts.flujo
  ),
  destinatarios as (
      -- Diseño con diseñador asignado
      select r.id as ticket_id, r.codigo, r.disenador_id as usuario_id, r.tipo_solicitud_id, r.fecha_limite
        from retrasados r
       where r.flujo = 'DISENO' and r.disenador_id is not null
      union
      -- Diseño sin diseñador: todos los diseñadores activos
      select r.id, r.codigo, ur.usuario_id, r.tipo_solicitud_id, r.fecha_limite
        from retrasados r
        join "Seguridad"."UsuariosRoles" ur on true
        join "Seguridad"."Roles"    ro on ro.id = ur.rol_id and ro.nombre = 'Diseñador' and ro.estado
        join "Seguridad"."Usuarios" u  on u.id  = ur.usuario_id and u.estado
       where r.flujo = 'DISENO' and r.disenador_id is null
      union
      -- Afiches con IA: todos los Aprobadores IA activos
      select r.id, r.codigo, ur.usuario_id, r.tipo_solicitud_id, r.fecha_limite
        from retrasados r
        join "Seguridad"."UsuariosRoles" ur on true
        join "Seguridad"."Roles"    ro on ro.id = ur.rol_id and ro.nombre = 'Validador' and ro.estado
        join "Seguridad"."Usuarios" u  on u.id  = ur.usuario_id and u.estado
       where r.flujo in ('APROBACION_IA', 'VALIDACION')
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
$function$;

DROP POLICY IF EXISTS "polTicketLeer" ON "Solicitudes"."Ticket";

CREATE POLICY "polTicketLeer" ON "Solicitudes"."Ticket"
FOR SELECT TO authenticated
USING (
     usuario_registro = "Seguridad"."fnUsuarioActualIdEscalar"()
  OR "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador'::character varying)
  OR ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Jefe de Área'::character varying)
      AND area_id = "Seguridad"."fnUsuarioActualAreaEscalar"())
  OR ("Solicitudes"."fnTipoSolicitudFlujoEscalar"(tipo_solicitud_id) = 'DISENO' AND (
         "Seguridad"."fnUsuarioActualTieneRolEscalar"('Asignador'::character varying)
      OR ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Diseñador'::character varying)
          AND (disenador_id IS NULL OR disenador_id = "Seguridad"."fnUsuarioActualIdEscalar"()))))
  OR ("Solicitudes"."fnTipoSolicitudFlujoEscalar"(tipo_solicitud_id) IN ('APROBACION_IA', 'VALIDACION')
      AND "Seguridad"."fnUsuarioActualTieneRolEscalar"('Validador'::character varying))
);

CREATE OR REPLACE VIEW "Solicitudes"."vw_TicketsEstadoReal"
WITH (security_invoker = true) AS
SELECT
  t.id AS ticket_id,
  t.codigo,
  f.titulo,
  f.dirigido_a,
  t.tipo_solicitud_id,
  ts.nombre AS tipo_solicitud,
  ts.flujo,
  t.area_id,
  a.nombre AS area,
  t.usuario_registro,
  (SELECT n.nombre FROM "Seguridad"."fnUsuariosNombresTabla"() n(id, nombre) WHERE n.id = t.usuario_registro) AS solicitante,
  CASE WHEN "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id) THEN t.disenador_id ELSE NULL::integer END AS disenador_id,
  CASE WHEN "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id)
       THEN (SELECT n.nombre FROM "Seguridad"."fnUsuariosNombresTabla"() n(id, nombre) WHERE n.id = t.disenador_id)
       ELSE NULL::character varying END AS disenador,
  e.nombre AS estado_registrado,
  CASE
    -- Flujos IA y de validación: vencido mientras espera al Validador
    WHEN ts.flujo IN ('APROBACION_IA', 'VALIDACION') THEN
      CASE WHEN e.nombre::text = 'Enviado'::text AND t.fecha_limite < CURRENT_TIMESTAMP
           THEN 'Retrasado'::character varying
           ELSE e.nombre END
    -- Flujo de diseño (sin cambios)
    WHEN e.nombre::text = 'Aprobado'::text AND t.aprobado_automatico THEN 'Aprobado (Automático)'::character varying
    WHEN e.nombre::text = 'Finalizado'::text AND "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(t.fecha_entrega_diseno) THEN 'Aprobado (Automático)'::character varying
    WHEN t.fecha_limite < CURRENT_TIMESTAMP
         AND NOT (t.es_excepcional AND t.excepcional_estado::text = 'PENDIENTE'::text)
         AND ((e.nombre::text = ANY (ARRAY['Enviado'::character varying, 'En revisión'::character varying, 'En proceso'::character varying]::text[])) AND t.fecha_entrega_diseno IS NULL
              OR e.nombre::text = 'Corrección'::text)
      THEN 'Retrasado'::character varying
    ELSE e.nombre
  END AS estado_real,
  f.fecha_evento,
  t.fecha_registro,
  t.fecha_limite,
  t.fecha_entrega_diseno,
  CASE WHEN t.fecha_entrega_diseno IS NOT NULL
       THEN "Solicitudes"."fnSumarHorasHabilesEscalar"(t.fecha_entrega_diseno, 24)
       ELSE NULL::timestamp with time zone END AS fecha_aprobacion_automatica,
  CASE WHEN e.nombre::text = 'Finalizado'::text AND NOT "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(t.fecha_entrega_diseno)
       THEN "Solicitudes"."fnMinutosHabilesEntreEscalar"(CURRENT_TIMESTAMP, "Solicitudes"."fnSumarHorasHabilesEscalar"(t.fecha_entrega_diseno, 24))
       ELSE NULL::integer END AS minutos_habiles_restantes_dictamen,
  CASE WHEN ts.flujo IN ('APROBACION_IA', 'VALIDACION')
       THEN e.nombre::text = ANY (ARRAY['Enviado', 'Retrasado']) AND t.fecha_limite < CURRENT_TIMESTAMP
       ELSE t.fecha_entrega_diseno IS NULL AND t.fecha_limite < CURRENT_TIMESTAMP
  END AS fuera_de_plazo,
  (CASE WHEN ts.flujo = 'VALIDACION' THEN 0
        WHEN ts.flujo = 'APROBACION_IA'
        THEN (SELECT count(*) FROM "Solicitudes"."RevisionIA" r WHERE r.ticket_id = t.id AND r.decision::text = 'RECHAZADO'::text)
        ELSE (SELECT count(*) FROM "Solicitudes"."DictamenJefe" d WHERE d.ticket_id = t.id AND d.decision::text = 'CORRECCION'::text)
   END)::integer AS correcciones_usadas,
  CASE WHEN ts.flujo = 'VALIDACION' THEN 0 ELSE 5 END AS correcciones_maximas,
  t.aprobado_automatico,
  t.es_excepcional,
  t.excepcional_estado,
  t.excepcional_motivo_rechazo,
  CASE WHEN "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id) THEN t.asignado_por ELSE NULL::integer END AS asignado_por,
  CASE WHEN "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id)
       THEN (SELECT n.nombre FROM "Seguridad"."fnUsuariosNombresTabla"() n(id, nombre) WHERE n.id = t.asignado_por)
       ELSE NULL::character varying END AS asignado_por_nombre,
  CASE WHEN "Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id) THEN t.fecha_asignacion ELSE NULL::timestamp with time zone END AS fecha_asignacion,
  COALESCE("Solicitudes"."fnPuedeVerAsignacionEscalar"(t.area_id) AND t.disenador_id IS NOT NULL AND t.asignado_por IS NOT NULL AND t.asignado_por <> t.disenador_id, false) AS asignado_por_asignador,
  -- Nuevo: envíos hechos en un ticket IA (NULL en tickets de diseño)
  CASE WHEN ts.flujo = 'APROBACION_IA'
       THEN (SELECT count(*) FROM "Solicitudes"."EnvioIA" x WHERE x.ticket_id = t.id)::integer
       ELSE NULL::integer END AS intentos_usados
FROM "Solicitudes"."Ticket" t
JOIN "Solicitudes"."TipoSolicitud" ts ON ts.id = t.tipo_solicitud_id
JOIN "Solicitudes"."Formularios" f ON f.id = t.formulario_id
JOIN "Solicitudes"."Estado" e ON e.id = t.estado_id
JOIN "Seguridad"."Areas" a ON a.id = t.area_id;

grant select on "Solicitudes"."vw_TicketsEstadoReal" to authenticated;

CREATE OR REPLACE FUNCTION "Solicitudes"."fnEstadisticasTicketsTabla"(p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date, p_area_id integer DEFAULT NULL::integer, p_tipo_solicitud_id integer DEFAULT NULL::integer)
 RETURNS TABLE(ticket_id integer, codigo text, tipo_solicitud text, area text, estado_real text, disenador text, fecha_registro timestamp with time zone, fecha_limite timestamp with time zone, fecha_entrega_diseno timestamp with time zone, fecha_evento date, dias_resolucion numeric, entregado_a_tiempo boolean, correcciones_usadas integer, aprobado_automatico boolean, es_excepcional boolean, flujo text, intentos_usados integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Analista')
          or "Seguridad"."fnUsuarioActualTieneRolEscalar"('Administrador')) then
    raise exception 'Solo un Analista o un Administrador puede ver las estadísticas.';
  end if;

  return query
  select v.ticket_id, v.codigo::text, v.tipo_solicitud::text, v.area::text, v.estado_real::text,
         (select u.nombre_completo from "Seguridad"."Usuarios" u where u.id = v.disenador_id)::text,
         v.fecha_registro, v.fecha_limite, v.fecha_entrega_diseno, v.fecha_evento,
         round((extract(epoch from (x.fecha_fin - v.fecha_registro)) / 86400.0)::numeric, 1),
         case when x.fecha_fin is null then null else x.fecha_fin <= v.fecha_limite end,
         v.correcciones_usadas, v.aprobado_automatico, v.es_excepcional,
         v.flujo::text, v.intentos_usados
    from "Solicitudes"."vw_TicketsEstadoReal" v
    cross join lateral (
      select case when v.flujo = 'APROBACION_IA'
                  then (select max(r.fecha_revision) from "Solicitudes"."RevisionIA" r where r.ticket_id = v.ticket_id)
                  when v.flujo = 'VALIDACION'
                  then (select d.fecha_decision from "Solicitudes"."DecisionValidacion" d where d.ticket_id = v.ticket_id)
                  else v.fecha_entrega_diseno
             end as fecha_fin
    ) x
   where (p_desde is null or (v.fecha_registro at time zone 'America/Tegucigalpa')::date >= p_desde)
     and (p_hasta is null or (v.fecha_registro at time zone 'America/Tegucigalpa')::date <= p_hasta)
     and (p_area_id is null or v.area_id = p_area_id)
     and (p_tipo_solicitud_id is null or v.tipo_solicitud_id = p_tipo_solicitud_id)
   order by v.ticket_id desc;
end;
$function$;

-- Tipo "Cobertura de evento" y sus campos (Fecha = fecha del evento; Hora, Lugar y Descripción)
insert into "Solicitudes"."TipoSolicitud" (nombre, dias_estimados, dias_habiles, flujo, categoria, descripcion, etiquetas_generales)
values ('Cobertura de evento', 10, true, 'VALIDACION', 'OTROS',
        'Solicitud de cobertura fotográfica o de video de un evento. El Validador la aprueba o la rechaza.',
        '{"fecha_evento": "Fecha"}')
on conflict (nombre) do nothing;

insert into "Solicitudes"."CampoFormulario"
       (tipo_solicitud_id, clave, etiqueta, tipo_campo, placeholder, ayuda, validaciones, obligatorio, orden)
select ts.id, v.clave, v.etiqueta, v.tipo_campo, v.placeholder, v.ayuda, v.validaciones::jsonb, v.obligatorio, v.orden
  from "Solicitudes"."TipoSolicitud" ts
  cross join (values
    ('hora', 'Hora', 'HORA', null, null, null, true, 10),
    ('lugar', 'Lugar', 'TEXTO', 'Ej.: Auditorio de la Facultad', null, '{"max_longitud": 200}', true, 20),
    ('descripcion', 'Descripción', 'TEXTO_LARGO',
     'Describe el evento y especifica si requieres fotografías, video o ambos.',
     'Indica qué momentos deben cubrirse y para qué se usará el material.', '{"max_longitud": 1000}', true, 30)
  ) as v(clave, etiqueta, tipo_campo, placeholder, ayuda, validaciones, obligatorio, orden)
 where ts.nombre = 'Cobertura de evento'
on conflict do nothing;

-- ===== PARTE 35 =====
notify pgrst, 'reload schema';

-- ===== VERIFICACIÓN (solo lectura) =====
select
  (select count(*) from "Seguridad"."Roles" where nombre = 'Validador')                         as rol_validador_1,
  (select count(*) from pg_proc where prosrc like '%Aprobador IA%')                                          as funciones_viejas_0,
  (select count(*) from "Solicitudes"."Campus" where estado)                                                 as campus_activos_24,
  (select count(*) from "Solicitudes"."TipoSolicitud" where nombre ilike 'Trifolio')                         as trifolio_0,
  (select count(*) from "Solicitudes"."TipoSolicitud" where nombre = 'Cobertura de evento' and flujo = 'VALIDACION') as cobertura_1,
  (select count(*) from "Solicitudes"."CampoFormulario" where clave = 'logotipos' and tipo_campo <> 'ETIQUETAS') as logotipos_sin_convertir_0,
  (select count(*) from "Solicitudes"."TipoSolicitud" where categoria = 'OTROS')                             as tipos_en_otros;
