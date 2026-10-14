-- Datos de prueba - Gestión de Solicitudes VOAE
-- Crea 100 tickets repartidos en los últimos 90 días, con su formulario, historial, entregables y
-- dictámenes, para poder ver las estadísticas, los dashboards y el detalle con datos variados.
--
-- Cómo usarlo: pegar TODO en el SQL Editor de Supabase y ejecutar una sola vez.
--   * No borra ni modifica nada de lo que ya existe; solo agrega.
--   * Cada ejecución agrega otros 100 tickets (no es idempotente).
--   * Si falla a la mitad no queda nada a medias: todo el bloque es una sola transacción.
--   * NO es para producción: limpiar la base antes del lanzamiento.
--
-- Usa los usuarios que ya existen. Solo crea usuarios ficticios (nombre terminado en "(semilla)",
-- correo @voae.test, sin cuenta de acceso: no pueden iniciar sesión) cuando a un área activa le
-- falta un solicitante o un jefe, o si hay menos de dos diseñadores.
--
-- Los tickets se insertan ya en su estado final y con fechas pasadas, cosa que los triggers no
-- permiten (todo ticket nace "Enviado" con fecha de hoy). Por eso se desactivan los triggers de
-- Ticket, Entregables y DictamenJefe mientras corre el bloque y se reactivan al final; las llaves
-- foráneas y los CHECK siguen validando. No se generan notificaciones.

do $semilla$
declare
  c_total  constant int := 100;   -- cuántos tickets crear
  c_dias   constant int := 90;    -- repartidos en los últimos N días
  c_zona   constant text := 'America/Tegucigalpa';
  c_formato constant text := 'YYYY-MM-DD HH24:MI TZ';

  v_ahora  timestamptz := current_timestamp;

  -- ids de estado
  e_enviado int; e_revision int; e_proceso int; e_finalizado int;
  e_correccion int; e_aprobado int; e_retrasado int;
  r_empleado int; r_jefe int; r_disenador int;

  v_area        record;
  v_tipo        record;
  v_sol         record;
  v_dis         record;
  v_jefe        record;
  v_usuario_id  int;
  v_n           int := 0;

  v_dia         date;
  v_registro    timestamptz;
  v_limite      timestamptz;
  v_plazo       interval;
  v_tomado      timestamptz;
  v_entrega1    timestamptz;
  v_entrega2    timestamptz;
  v_dictamen    timestamptz;
  v_evento      date;
  v_hora        time;
  v_tema        text;
  v_titulo      text;
  v_r           double precision;

  v_formulario_id int;
  v_ticket_id     int;
  v_estado        int;
  v_estado_subida int;
  v_entrega_final timestamptz;
  v_automatico    boolean;
  v_con_disenador boolean;
  v_ver           int;

  c_temas constant text[] := array[
    'Feria de Salud Estudiantil', 'Convocatoria de becas 2026', 'Semana del Bienestar Universitario',
    'Jornada de vacunación', 'Taller de primeros auxilios', 'Bienvenida a estudiantes de primer ingreso',
    'Galardón al Mérito Estudiantil', 'Día del Estudiante', 'Inicio de tutorías académicas',
    'Campaña de salud mental', 'Renovación de becas', 'Torneo deportivo interfacultades',
    'Charla de orientación vocacional', 'Feria de emprendimiento estudiantil', 'Jornada de donación de sangre',
    'Semana de la inclusión', 'Voluntariado universitario', 'Festival cultural VOAE',
    'Capacitación para becarios', 'Campaña de prevención del dengue'];
  c_lugares constant text[] := array[
    'Auditorio Central, Ciudad Universitaria', 'Plaza de las Cuatro Culturas', 'Edificio Alma Máter, planta baja',
    'Polideportivo universitario', 'Sala de usos múltiples de VOAE', 'Biblioteca central, salón 2'];
  c_comentarios constant text[] := array[
    'Cambiar la fecha del evento, quedó la del año pasado.', 'El logo de la UNAH debe ir a la izquierda y más grande.',
    'Corregir la ortografía del título y usar la paleta institucional.', 'Falta el código QR de inscripción.',
    'El texto no se lee sobre la fotografía; subir el contraste.', 'Agregar el horario y el lugar en la parte inferior.'];
  c_nombres constant text[] := array[
    'Karla Zelaya', 'Óscar Maldonado', 'Daniela Fúnez', 'Marvin Aguilar', 'Sofía Mejía',
    'Luis Banegas', 'Andrea Pineda', 'Kevin Ordóñez', 'Gabriela Rivas', 'José Lagos'];
begin
  select id into e_enviado    from "Solicitudes"."Estado" where nombre = 'Enviado';
  select id into e_revision   from "Solicitudes"."Estado" where nombre = 'En revisión';
  select id into e_proceso    from "Solicitudes"."Estado" where nombre = 'En proceso';
  select id into e_finalizado from "Solicitudes"."Estado" where nombre = 'Finalizado';
  select id into e_correccion from "Solicitudes"."Estado" where nombre = 'Corrección';
  select id into e_aprobado   from "Solicitudes"."Estado" where nombre = 'Aprobado';
  select id into e_retrasado  from "Solicitudes"."Estado" where nombre = 'Retrasado';
  select id into r_empleado   from "Seguridad"."Roles" where nombre = 'Empleado';
  select id into r_jefe       from "Seguridad"."Roles" where nombre = 'Jefe de Área';
  select id into r_disenador  from "Seguridad"."Roles" where nombre = 'Diseñador';

  if e_enviado is null or e_revision is null or e_proceso is null or e_finalizado is null
     or e_correccion is null or e_aprobado is null or e_retrasado is null
     or r_empleado is null or r_jefe is null or r_disenador is null then
    raise exception 'Faltan estados o roles en los catálogos; no se creó nada.';
  end if;
  if not exists (select 1 from "Solicitudes"."TipoSolicitud" where estado) then
    raise exception 'No hay tipos de solicitud activos; no se creó nada.';
  end if;
  if not exists (select 1 from "Seguridad"."Areas" where estado) then
    raise exception 'No hay áreas activas; no se creó nada.';
  end if;

  ---------------------------------------------------------------------------------------------
  -- 1. Usuarios que hagan falta
  ---------------------------------------------------------------------------------------------
  for v_area in select id, nombre from "Seguridad"."Areas" where estado order by id loop
    -- Un solicitante (Empleado o Analista) por área
    if not exists (select 1 from "Seguridad"."Usuarios" u
                     join "Seguridad"."UsuariosRoles" ur on ur.usuario_id = u.id
                     join "Seguridad"."Roles" r on r.id = ur.rol_id
                    where u.estado and u.area_id = v_area.id and r.nombre in ('Empleado', 'Analista')) then
      v_n := v_n + 1;
      insert into "Seguridad"."Usuarios" (area_id, nombre, correo)
      values (v_area.id, c_nombres[1 + (v_n - 1) % 10] || ' (semilla)',
              format('semilla.empleado.%s.%s@voae.test', v_area.id, floor(extract(epoch from clock_timestamp()) * 1000)::bigint))
      returning id into v_usuario_id;
      insert into "Seguridad"."UsuariosRoles" (usuario_id, rol_id) values (v_usuario_id, r_empleado);
    end if;

    -- Un jefe por área (sin jefe nadie podría dictaminar los tickets de esa área)
    if not exists (select 1 from "Seguridad"."Usuarios" u
                     join "Seguridad"."UsuariosRoles" ur on ur.usuario_id = u.id
                    where u.estado and u.area_id = v_area.id and ur.rol_id = r_jefe) then
      v_n := v_n + 1;
      insert into "Seguridad"."Usuarios" (area_id, nombre, correo)
      values (v_area.id, c_nombres[1 + (v_n - 1) % 10] || ' (semilla)',
              format('semilla.jefe.%s.%s@voae.test', v_area.id, floor(extract(epoch from clock_timestamp()) * 1000)::bigint))
      returning id into v_usuario_id;
      insert into "Seguridad"."UsuariosRoles" (usuario_id, rol_id) values (v_usuario_id, r_jefe);
    end if;
  end loop;

  -- Al menos dos diseñadores, para que la comparación por diseñador tenga sentido
  while (select count(*) from "Seguridad"."Usuarios" u
           join "Seguridad"."UsuariosRoles" ur on ur.usuario_id = u.id
          where u.estado and ur.rol_id = r_disenador) < 2 loop
    v_n := v_n + 1;
    insert into "Seguridad"."Usuarios" (area_id, nombre, correo)
    values ((select min(id) from "Seguridad"."Areas" where estado),
            c_nombres[1 + (v_n - 1) % 10] || ' (semilla)',
            format('semilla.disenador.%s.%s@voae.test', v_n, floor(extract(epoch from clock_timestamp()) * 1000)::bigint))
    returning id into v_usuario_id;
    insert into "Seguridad"."UsuariosRoles" (usuario_id, rol_id) values (v_usuario_id, r_disenador);
  end loop;

  ---------------------------------------------------------------------------------------------
  -- 2. Tickets
  ---------------------------------------------------------------------------------------------
  alter table "Solicitudes"."Ticket"       disable trigger user;
  alter table "Solicitudes"."Entregables"  disable trigger user;
  alter table "Solicitudes"."DictamenJefe" disable trigger user;

  for v_i in 1..c_total loop
    -- Cuándo se pidió: un día hábil al azar, en horario de oficina (hora de Honduras). Uno de cada
    -- tres cae en las últimas dos semanas, para que haya tickets abiertos en todos los estados y
    -- no solo historia ya cerrada.
    v_dia := (v_ahora at time zone c_zona)::date
             - floor(random() * case when random() < 0.33 then least(14, c_dias) else c_dias end)::int;
    v_dia := v_dia - case extract(isodow from v_dia)::int when 6 then 1 when 7 then 2 else 0 end;
    v_registro := (v_dia + make_interval(mins => 8 * 60 + floor(random() * 9 * 60)::int)) at time zone c_zona;
    if v_registro >= v_ahora then
      v_registro := v_ahora - make_interval(mins => 10 + floor(random() * 180)::int);
    end if;

    -- Qué, quién y de qué área
    select id, nombre, formulario, dias_estimados, dias_habiles into v_tipo
      from "Solicitudes"."TipoSolicitud" where estado order by random() limit 1;

    select id, nombre into v_area from "Seguridad"."Areas" where estado order by random() limit 1;

    select u.id, u.nombre into v_sol
      from "Seguridad"."Usuarios" u
     where u.estado and u.area_id = v_area.id
       and exists (select 1 from "Seguridad"."UsuariosRoles" ur
                     join "Seguridad"."Roles" r on r.id = ur.rol_id
                    where ur.usuario_id = u.id and r.nombre in ('Empleado', 'Analista'))
     order by random() limit 1;

    select u.id, u.nombre into v_dis
      from "Seguridad"."Usuarios" u
      join "Seguridad"."UsuariosRoles" ur on ur.usuario_id = u.id
     where u.estado and ur.rol_id = r_disenador
     order by random() limit 1;

    select u.id, u.nombre into v_jefe
      from "Seguridad"."Usuarios" u
      join "Seguridad"."UsuariosRoles" ur on ur.usuario_id = u.id
     where u.estado and u.area_id = v_area.id and ur.rol_id = r_jefe
     order by random() limit 1;

    -- Plazo, con la misma regla que usa la base (días hábiles y feriados)
    if v_tipo.dias_habiles then
      v_limite := "Solicitudes"."fnSumarDiasHabilesEscalar"(v_registro, v_tipo.dias_estimados);
    else
      v_limite := v_registro + make_interval(days => v_tipo.dias_estimados);
    end if;
    v_plazo  := v_limite - v_registro;
    v_tomado := v_registro + v_plazo * (0.02 + random() * 0.15);

    -- Cuándo se entrega el primer diseño: 12 % nunca, 12 % tarde, el resto dentro del plazo.
    -- Si esa fecha todavía no llega, el ticket simplemente sigue abierto.
    v_r := random();
    if v_r < 0.12 then
      v_entrega1 := null;
    elsif v_r < 0.24 then
      v_entrega1 := v_limite + make_interval(hours => 4 + floor(random() * 96)::int);
    else
      v_entrega1 := v_registro + v_plazo * (0.30 + random() * 0.65);
    end if;
    if v_entrega1 > v_ahora then
      v_entrega1 := null;
    end if;

    -- Formulario y su detalle según el código del tipo
    v_tema   := c_temas[1 + floor(random() * array_length(c_temas, 1))::int];
    v_titulo := left(v_tipo.nombre || ' - ' || v_tema, 200);
    v_evento := (v_limite at time zone c_zona)::date + (2 + floor(random() * 12)::int);
    v_hora   := make_time(8 + floor(random() * 9)::int, 30 * floor(random() * 2)::int, 0);

    insert into "Solicitudes"."Formularios" (tipo_solicitud_id, fecha_creacion)
    values (v_tipo.id, v_registro)
    returning id into v_formulario_id;

    case v_tipo.formulario
      when 'ARTE' then
        insert into "Solicitudes"."FormularioArte"
               (formulario_id, titulo, fecha, hora_inicio, hora_fin, lugar, modalidad,
                aplica_articulo_140, alcance, informacion_adicional, logotipos)
        values (v_formulario_id, v_titulo, v_evento, v_hora, v_hora + interval '2 hours',
                c_lugares[1 + floor(random() * array_length(c_lugares, 1))::int],
                case when random() < 0.75 then 'Presencial' else 'No presencial' end,
                random() < 0.3,
                case when random() < 0.5 then 'Todos los centros regionales' else 'Solo Ciudad Universitaria' end,
                'Dato de prueba generado por la semilla.',
                array['Logo de VOAE', 'Logo de la UNAH']::varchar(100)[]);
      when 'VIDEO' then
        insert into "Solicitudes"."FormularioVideo"
               (formulario_id, objetivo, fecha_entrega_publicacion, participacion_estudiantes,
                informacion_producto, encargado_actividad)
        values (v_formulario_id, 'Promocionar: ' || v_tema, v_evento,
                (array['No aplica', 'Artículo 140', 'Horas beca'])[1 + floor(random() * 3)::int],
                'Dato de prueba generado por la semilla.', v_sol.nombre);
      when 'DIRCOM' then
        insert into "Solicitudes"."FormularioDircom"
               (formulario_id, tipo_material, fecha_necesaria, informacion_valor, necesita_dictamen)
        values (v_formulario_id, v_tipo.nombre, v_evento,
                'Material para: ' || v_tema || '. Dato de prueba generado por la semilla.', random() < 0.25);
      when 'PROTOCOLO' then
        insert into "Solicitudes"."FormularioProtocolo"
               (formulario_id, nombre_actividad, lugar_propuesto, cantidad_invitados, fecha, hora,
                elaborar_invitacion, informacion_programa, necesita_maestro_ceremonia,
                necesita_edecanes, necesita_pumas)
        values (v_formulario_id, v_tema,
                c_lugares[1 + floor(random() * array_length(c_lugares, 1))::int],
                20 + floor(random() * 280)::int, v_evento, v_hora,
                random() < 0.5, 'Dato de prueba generado por la semilla.', false,
                random() < 0.3, random() < 0.3);
      else
        insert into "Solicitudes"."FormularioGenerico"
               (formulario_id, titulo, descripcion, fecha_requerida, observaciones)
        values (v_formulario_id, v_titulo, 'Se necesita para: ' || v_tema || '.', v_evento,
                'Dato de prueba generado por la semilla.');
    end case;

    -- Estado final del ticket
    v_automatico    := false;
    v_entrega_final := v_entrega1;
    v_entrega2      := null;
    v_dictamen      := null;
    v_con_disenador := true;

    if v_entrega1 is null then
      if v_limite < v_ahora then
        v_estado        := e_retrasado;
        v_con_disenador := random() < 0.75;
      else
        v_r := random();
        if v_r < 0.35 then
          v_estado := e_enviado;  v_con_disenador := false;
        elsif v_r < 0.45 then
          v_estado := e_revision; v_con_disenador := false;
        else
          v_estado := e_proceso;
        end if;
      end if;
      if v_tomado > v_ahora then
        v_tomado := v_registro + (v_ahora - v_registro) * 0.5;
      end if;
    else
      v_estado := e_finalizado;   -- se ajusta más abajo, al registrar los dictámenes
    end if;

    insert into "Solicitudes"."Ticket"
           (tipo_solicitud_id, formulario_id, estado_id, usuario_registro, area_id, disenador_id,
            fecha_registro, fecha_limite, fecha_entrega_diseno, aprobado_automatico)
    values (v_tipo.id, v_formulario_id, v_estado, v_sol.id, v_area.id,
            case when v_con_disenador then v_dis.id end,
            v_registro, v_limite, v_entrega1, false)
    returning id into v_ticket_id;

    -- Historial, con el mismo texto que escribe el trigger real
    v_ver := 1;
    insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, fecha_registro, usuario_registro)
    values (v_ticket_id, v_ver,
            format('Ticket creado con estado "Enviado"; fecha límite %s', to_char(v_limite, c_formato)),
            v_registro, v_sol.id);

    if v_estado = e_revision then
      v_ver := v_ver + 1;
      insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, fecha_registro, usuario_registro)
      values (v_ticket_id, v_ver, 'Estado: "Enviado" -> "En revisión"', v_tomado, v_dis.id);
    end if;

    if v_con_disenador then
      v_ver := v_ver + 1;
      insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, fecha_registro, usuario_registro)
      values (v_ticket_id, v_ver,
              format('Estado: "Enviado" -> "En proceso"; Diseñador: (sin asignar) -> %s', v_dis.nombre),
              v_tomado, v_dis.id);
    end if;

    -- Venció el plazo sin entrega (lo hace la tarea programada: autor nulo = "Sistema")
    if (v_entrega1 is null and v_estado = e_retrasado) or v_entrega1 > v_limite then
      v_ver := v_ver + 1;
      insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, fecha_registro, usuario_registro)
      values (v_ticket_id, v_ver,
              format('Estado: "%s" -> "Retrasado"', case when v_con_disenador then 'En proceso' else 'Enviado' end),
              v_limite + interval '10 minutes', null);
    end if;

    if v_entrega1 is not null then
      -- Primera entrega
      v_estado_subida := case when v_entrega1 > v_limite then e_retrasado else e_proceso end;
      insert into "Solicitudes"."Entregables"
             (ticket_id, disenador_id, version, estado_id, tipo_entregable, url_o_ruta, descripcion, fecha_subida)
      values (v_ticket_id, v_dis.id, 1, v_estado_subida, 'LINK',
              format('https://example.com/semilla/ticket-%s-v1', v_ticket_id),
              'Propuesta de diseño (dato de prueba).', v_entrega1);

      v_ver := v_ver + 1;
      insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, fecha_registro, usuario_registro)
      values (v_ticket_id, v_ver,
              format('Estado: "%s" -> "Finalizado"; Entrega de diseño registrada: %s',
                     case when v_entrega1 > v_limite then 'Retrasado' else 'En proceso' end,
                     to_char(v_entrega1, c_formato)),
              v_entrega1, v_dis.id);

      if v_entrega1 + interval '24 hours' <= v_ahora then
        v_r := random();

        if v_jefe.id is not null and v_r >= 0.15 and v_r < 0.35 then
          -- El jefe pide la única corrección permitida
          v_dictamen := v_entrega1 + make_interval(mins => 60 + floor(random() * 21 * 60)::int);
          insert into "Solicitudes"."DictamenJefe" (ticket_id, jefe_id, decision, comentario, fecha_dictamen)
          values (v_ticket_id, v_jefe.id, 'CORRECCION',
                  c_comentarios[1 + floor(random() * array_length(c_comentarios, 1))::int], v_dictamen);

          v_ver := v_ver + 1;
          insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, fecha_registro, usuario_registro)
          values (v_ticket_id, v_ver, 'Estado: "Finalizado" -> "Corrección"', v_dictamen, v_jefe.id);

          v_estado   := e_correccion;
          v_entrega2 := v_dictamen + make_interval(hours => 6 + floor(random() * 66)::int);

          if v_entrega2 <= v_ahora then
            -- Diseño corregido
            insert into "Solicitudes"."Entregables"
                   (ticket_id, disenador_id, version, estado_id, tipo_entregable, url_o_ruta, descripcion, fecha_subida)
            values (v_ticket_id, v_dis.id, 2, e_correccion, 'LINK',
                    format('https://example.com/semilla/ticket-%s-v2', v_ticket_id),
                    'Diseño corregido (dato de prueba).', v_entrega2);

            v_ver := v_ver + 1;
            insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, fecha_registro, usuario_registro)
            values (v_ticket_id, v_ver,
                    format('Estado: "Corrección" -> "Finalizado"; Entrega de diseño registrada: %s', to_char(v_entrega2, c_formato)),
                    v_entrega2, v_dis.id);

            v_estado        := e_finalizado;
            v_entrega_final := v_entrega2;
          end if;
        end if;

        -- Cierre de la última entrega, si ya pasaron sus 24 h
        if v_estado = e_finalizado and v_entrega_final + interval '24 hours' <= v_ahora then
          if v_jefe.id is null or random() < 0.18 then
            -- Nadie dictaminó: aprobación automática
            v_automatico := true;
            v_ver := v_ver + 1;
            insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, fecha_registro, usuario_registro)
            values (v_ticket_id, v_ver, 'Estado: "Finalizado" -> "Aprobado" (automático, 24 h sin dictamen)',
                    v_entrega_final + interval '24 hours 5 minutes', null);
          else
            v_dictamen := v_entrega_final + make_interval(mins => 60 + floor(random() * 21 * 60)::int);
            insert into "Solicitudes"."DictamenJefe" (ticket_id, jefe_id, decision, comentario, fecha_dictamen)
            values (v_ticket_id, v_jefe.id, 'APROBADO',
                    case when random() < 0.4 then 'Aprobado, buen trabajo.' end, v_dictamen);

            v_ver := v_ver + 1;
            insert into "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio, fecha_registro, usuario_registro)
            values (v_ticket_id, v_ver, 'Estado: "Finalizado" -> "Aprobado"', v_dictamen, v_jefe.id);
          end if;
          v_estado := e_aprobado;
        end if;
      end if;

      update "Solicitudes"."Ticket"
         set estado_id            = v_estado,
             fecha_entrega_diseno = v_entrega_final,
             aprobado_automatico  = v_automatico
       where id = v_ticket_id;
    end if;
  end loop;

  alter table "Solicitudes"."Ticket"       enable trigger user;
  alter table "Solicitudes"."Entregables"  enable trigger user;
  alter table "Solicitudes"."DictamenJefe" enable trigger user;
end
$semilla$;

-- Resumen de cómo quedó la base (todos los tickets, no solo los de la semilla)
select estado_real, count(*) as tickets
  from "Solicitudes"."vw_TicketsEstadoReal"
 group by estado_real
 order by tickets desc;
