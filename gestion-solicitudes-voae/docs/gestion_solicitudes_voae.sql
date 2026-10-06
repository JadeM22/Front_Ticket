/* =====================================================================================
   Sistema de Gestión de Solicitudes / Tickets — VOAE
   (Vicerrectoría de Orientación y Asuntos Estudiantiles)

   Motor: PostgreSQL 15+ / Supabase           (probado en PostgreSQL 16 + pg_cron)

   Nomenclatura
     - Esquemas:   "Seguridad" y "Solicitudes"
     - Tablas:     PascalCase entre comillas            -> "Solicitudes"."Ticket"
     - Columnas:   snake_case (sin comillas)            -> area_id, fecha_registro
     - Objetos:    pk, uk, fk, chk, ix, fn, tgr          -> "fkTicket_Area", "tgrTicketCalcularFechaLimite"
     Las tablas, funciones y triggers SIEMPRE se escriben con comillas dobles:
         SELECT id, nombre FROM "Seguridad"."Usuarios";
         SELECT "Solicitudes"."fnVerificarTicketsRetrasados"();

   Flujo del ticket (validado por trigger; transiciones no listadas se rechazan)
     Enviado      -> En revisión | En proceso | Finalizado | Retrasado
     En revisión  -> En proceso  | Finalizado | Retrasado
     En proceso   -> Finalizado  | Retrasado
     Retrasado    -> Finalizado
     Finalizado   -> Corrección (dictamen del jefe, máx. 1) | Aprobado (jefe o 24 h)
     Corrección   -> Finalizado
     Aprobado     -> (estado final)

   Automatizaciones
     - Al crear un ticket: estado 'Enviado', área del solicitante y fecha_limite
       (fecha_registro + dias_estimados del tipo).
     - Subir un entregable de diseño -> ticket 'Finalizado' + fecha_entrega_diseno.
     - Dictamen del jefe            -> ticket 'Aprobado' o 'Corrección'.
     - pg_cron cada hora            -> tickets vencidos pasan a 'Retrasado' + notificación.
     - pg_cron cada 15 min          -> 'Finalizado' con más de 24 h sin dictamen pasa a
                                       'Aprobado' (aprobado_automatico = true).
     - Vista "vw_TicketsEstadoReal" -> muestra el estado real al instante, sin esperar al cron.

   CÓMO EJECUTAR EN SUPABASE (desde cero)
     En Supabase NO se crea la base de datos con SQL: cada proyecto YA ES una base de
     datos PostgreSQL (llamada "postgres"). Este script crea dentro de ella todo lo demás:
     esquemas, tablas, triggers, funciones, vista, datos iniciales y tareas pg_cron.
     1. supabase.com -> New project (nombre sugerido: gestion-solicitudes-voae).
     2. En el proyecto: SQL Editor -> New query -> pegar este script completo -> Run.
     3. Si la sección 9 (pg_cron) falla, activar pg_cron en Database > Extensions y
        volver a ejecutar solo la sección 9.

   CÓMO EJECUTAR EN UN POSTGRESQL LOCAL (pgAdmin / psql)
     1. Conectado a la BD "postgres", ejecutar SOLO la sentencia de la sección 0-A.
     2. Abrir el Query Tool sobre "gestion_solicitudes_db" y ejecutar el script completo.
        (pg_cron, sección 9, solo funciona si la extensión está instalada en el servidor.)
   ===================================================================================== */


/* -------------------------------------------------------------------------------------
   0-A. CREAR LA BASE DE DATOS — SOLO PARA POSTGRESQL LOCAL, NO EN SUPABASE
   CREATE DATABASE no puede ir en la misma ejecución que el resto del script; por eso
   está comentada. Ejecutarla sola, luego conectarse a la nueva base.
   ------------------------------------------------------------------------------------- */
-- CREATE DATABASE gestion_solicitudes_db WITH ENCODING 'UTF8' TEMPLATE template0;


/* -------------------------------------------------------------------------------------
   0-B. REINSTALACIÓN LIMPIA (OPCIONAL) — ¡BORRA TODAS LAS TABLAS Y DATOS!
   Descomentar solo si los esquemas ya existen de una versión anterior y se quiere
   recrear todo desde cero.
   ------------------------------------------------------------------------------------- */
-- DROP SCHEMA IF EXISTS "Solicitudes" CASCADE;
-- DROP SCHEMA IF EXISTS "Seguridad"  CASCADE;


BEGIN;

CREATE SCHEMA IF NOT EXISTS "Seguridad";     -- áreas, usuarios, roles y bitácora de roles
CREATE SCHEMA IF NOT EXISTS "Solicitudes";   -- catálogos, formularios, tickets, entregables, dictámenes y notificaciones


/* =====================================================================================
   1. SEGURIDAD
   ===================================================================================== */

-- 1.1 Areas ----------------------------------------------------------------------------
CREATE TABLE "Seguridad"."Areas"
(
    id              SERIAL        NOT NULL,
    nombre          VARCHAR(100)  NOT NULL,
    descripcion     TEXT,
    estado          BOOLEAN       NOT NULL DEFAULT true,
    CONSTRAINT "pkArea"         PRIMARY KEY (id),
    CONSTRAINT "ukArea_Nombre"  UNIQUE (nombre)
);

-- 1.2 Usuarios (1 área : N usuarios) ---------------------------------------------------
CREATE TABLE "Seguridad"."Usuarios"
(
    id              SERIAL        NOT NULL,
    area_id         INT,
    nombre          VARCHAR(100)  NOT NULL,
    correo          VARCHAR(150)  NOT NULL,
    password        VARCHAR(255)  NOT NULL,             -- almacenar SOLO el hash (bcrypt / argon2)
    estado          BOOLEAN       NOT NULL DEFAULT true, -- desactivación lógica
    CONSTRAINT "pkUsuario"          PRIMARY KEY (id),
    CONSTRAINT "ukUsuario_Correo"   UNIQUE (correo),
    CONSTRAINT "fkUsuario_Area"     FOREIGN KEY (area_id)
        REFERENCES "Seguridad"."Areas" (id) ON DELETE SET NULL,
    CONSTRAINT "chkUsuario_Correo"  CHECK (correo = lower(btrim(correo)) AND correo LIKE '%_@_%')
);
CREATE INDEX "ixUsuario_Area" ON "Seguridad"."Usuarios" (area_id);

-- 1.3 Roles ----------------------------------------------------------------------------
CREATE TABLE "Seguridad"."Roles"
(
    id              SERIAL        NOT NULL,
    nombre          VARCHAR(50)   NOT NULL,
    descripcion     TEXT,
    estado          BOOLEAN       NOT NULL DEFAULT true, -- desactivación lógica
    CONSTRAINT "pkRol"         PRIMARY KEY (id),
    CONSTRAINT "ukRol_Nombre"  UNIQUE (nombre)
);

-- 1.4 UsuariosRoles (N:M). Revocar = DELETE de la fila; queda registrado en el log ------
CREATE TABLE "Seguridad"."UsuariosRoles"
(
    usuario_id      INT           NOT NULL,
    rol_id          INT           NOT NULL,
    CONSTRAINT "pkUsuarioRol"          PRIMARY KEY (usuario_id, rol_id),
    CONSTRAINT "fkUsuarioRol_Usuario"  FOREIGN KEY (usuario_id) REFERENCES "Seguridad"."Usuarios" (id),
    CONSTRAINT "fkUsuarioRol_Rol"      FOREIGN KEY (rol_id)     REFERENCES "Seguridad"."Roles" (id)
);
CREATE INDEX "ixUsuarioRol_Rol" ON "Seguridad"."UsuariosRoles" (rol_id);

-- 1.5 UsuariosRolesLog -----------------------------------------------------------------
CREATE TABLE "Seguridad"."UsuariosRolesLog"
(
    id              SERIAL        NOT NULL,
    usuario_id      INT           NOT NULL,
    rol_id          INT           NOT NULL,
    accion          VARCHAR(20)   NOT NULL,
    fecha_registro  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pkUsuarioRolLog"          PRIMARY KEY (id),
    CONSTRAINT "fkUsuarioRolLog_Usuario"  FOREIGN KEY (usuario_id) REFERENCES "Seguridad"."Usuarios" (id),
    CONSTRAINT "fkUsuarioRolLog_Rol"      FOREIGN KEY (rol_id)     REFERENCES "Seguridad"."Roles" (id),
    CONSTRAINT "chkUsuarioRolLog_Accion"  CHECK (accion IN ('ASIGNADO', 'REVOCADO'))
);
CREATE INDEX "ixUsuarioRolLog_Usuario" ON "Seguridad"."UsuariosRolesLog" (usuario_id);
CREATE INDEX "ixUsuarioRolLog_Rol"     ON "Seguridad"."UsuariosRolesLog" (rol_id);


/* =====================================================================================
   2. CATÁLOGOS
   ===================================================================================== */

-- 2.1 TipoSolicitud --------------------------------------------------------------------
CREATE TABLE "Solicitudes"."TipoSolicitud"
(
    id              SERIAL        NOT NULL,
    nombre          VARCHAR(100)  NOT NULL,
    dias_estimados  INT           NOT NULL DEFAULT 1,   -- días calendario para resolver
    estado          BOOLEAN       NOT NULL DEFAULT true,
    CONSTRAINT "pkTipoSolicitud"                PRIMARY KEY (id),
    CONSTRAINT "ukTipoSolicitud_Nombre"         UNIQUE (nombre),
    CONSTRAINT "chkTipoSolicitud_DiasEstimados" CHECK (dias_estimados > 0)
);

-- 2.2 Estado (estados del ticket) ------------------------------------------------------
CREATE TABLE "Solicitudes"."Estado"
(
    id              SERIAL        NOT NULL,
    nombre          VARCHAR(50)   NOT NULL,
    CONSTRAINT "pkEstado"         PRIMARY KEY (id),
    CONSTRAINT "ukEstado_Nombre"  UNIQUE (nombre)
);


/* =====================================================================================
   3. FORMULARIOS
   ===================================================================================== */

-- 3.1 Formularios (tabla padre) --------------------------------------------------------
CREATE TABLE "Solicitudes"."Formularios"
(
    id                  SERIAL        NOT NULL,
    tipo_solicitud_id   INT           NOT NULL,
    fecha_creacion      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pkFormulario"                PRIMARY KEY (id),
    CONSTRAINT "fkFormulario_TipoSolicitud"  FOREIGN KEY (tipo_solicitud_id)
        REFERENCES "Solicitudes"."TipoSolicitud" (id)
);
CREATE INDEX "ixFormulario_TipoSolicitud" ON "Solicitudes"."Formularios" (tipo_solicitud_id);

-- 3.2 Formularios específicos (1:1 con Formularios, PK = FK) ---------------------------
CREATE TABLE "Solicitudes"."FormularioAfiche"
(
    formulario_id       INT           NOT NULL,
    dimensiones         VARCHAR(50)   NOT NULL,         -- ej. '60x90 cm', 'A3'
    orientacion         VARCHAR(10)   NOT NULL,
    texto_principal     TEXT          NOT NULL,
    CONSTRAINT "pkFormularioAfiche"              PRIMARY KEY (formulario_id),
    CONSTRAINT "fkFormularioAfiche_Formulario"   FOREIGN KEY (formulario_id)
        REFERENCES "Solicitudes"."Formularios" (id) ON DELETE CASCADE,
    CONSTRAINT "chkFormularioAfiche_Orientacion" CHECK (orientacion IN ('Vertical', 'Horizontal'))
);

CREATE TABLE "Solicitudes"."FormularioComunicado"
(
    formulario_id        INT           NOT NULL,
    titulo               VARCHAR(200)  NOT NULL,
    contenido_comunicado TEXT          NOT NULL,
    dirigido_a           VARCHAR(200)  NOT NULL,        -- ej. 'Estudiantes', 'Docentes'
    CONSTRAINT "pkFormularioComunicado"             PRIMARY KEY (formulario_id),
    CONSTRAINT "fkFormularioComunicado_Formulario"  FOREIGN KEY (formulario_id)
        REFERENCES "Solicitudes"."Formularios" (id) ON DELETE CASCADE
);

CREATE TABLE "Solicitudes"."FormularioAviso"
(
    formulario_id       INT           NOT NULL,
    titulo_aviso        VARCHAR(200)  NOT NULL,
    urgencia            VARCHAR(10)   NOT NULL DEFAULT 'Media',
    medio_difusion      VARCHAR(100)  NOT NULL,         -- ej. 'Correo', 'Pantallas', 'Web'
    CONSTRAINT "pkFormularioAviso"             PRIMARY KEY (formulario_id),
    CONSTRAINT "fkFormularioAviso_Formulario"  FOREIGN KEY (formulario_id)
        REFERENCES "Solicitudes"."Formularios" (id) ON DELETE CASCADE,
    CONSTRAINT "chkFormularioAviso_Urgencia"   CHECK (urgencia IN ('Baja', 'Media', 'Alta'))
);

CREATE TABLE "Solicitudes"."FormularioCoberturaEventos"
(
    formulario_id       INT           NOT NULL,
    nombre_evento       VARCHAR(200)  NOT NULL,
    lugar               VARCHAR(200)  NOT NULL,
    fecha_inicio        TIMESTAMPTZ   NOT NULL,
    fecha_fin           TIMESTAMPTZ   NOT NULL,
    CONSTRAINT "pkFormularioCoberturaEventos"             PRIMARY KEY (formulario_id),
    CONSTRAINT "fkFormularioCoberturaEventos_Formulario"  FOREIGN KEY (formulario_id)
        REFERENCES "Solicitudes"."Formularios" (id) ON DELETE CASCADE,
    CONSTRAINT "chkFormularioCoberturaEventos_Fechas"     CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE "Solicitudes"."FormularioEdicionFotografica"
(
    formulario_id       INT           NOT NULL,
    cantidad_fotos      SMALLINT      NOT NULL,
    estilo_edicion      VARCHAR(100)  NOT NULL,         -- ej. 'Natural', 'Blanco y negro'
    enlace_drive        VARCHAR(500)  NOT NULL,
    CONSTRAINT "pkFormularioEdicionFotografica"               PRIMARY KEY (formulario_id),
    CONSTRAINT "fkFormularioEdicionFotografica_Formulario"    FOREIGN KEY (formulario_id)
        REFERENCES "Solicitudes"."Formularios" (id) ON DELETE CASCADE,
    CONSTRAINT "chkFormularioEdicionFotografica_CantidadFotos" CHECK (cantidad_fotos > 0),
    CONSTRAINT "chkFormularioEdicionFotografica_EnlaceDrive"   CHECK (enlace_drive ~* '^https?://')
);

CREATE TABLE "Solicitudes"."FormularioPublicacionRedesSociales"
(
    formulario_id       INT             NOT NULL,
    plataformas         VARCHAR(50)[]   NOT NULL,       -- ej. '{Facebook,Instagram}'
    texto_copy          TEXT            NOT NULL,
    hora_sugerida       TIME,
    CONSTRAINT "pkFormularioPublicacionRedesSociales"              PRIMARY KEY (formulario_id),
    CONSTRAINT "fkFormularioPublicacionRedesSociales_Formulario"   FOREIGN KEY (formulario_id)
        REFERENCES "Solicitudes"."Formularios" (id) ON DELETE CASCADE,
    CONSTRAINT "chkFormularioPublicacionRedesSociales_Plataformas" CHECK (cardinality(plataformas) > 0)
);


/* =====================================================================================
   4. TICKETS, ENTREGABLES, DICTÁMENES Y NOTIFICACIONES
   ===================================================================================== */

-- 4.1 Ticket (un formulario genera un único ticket) ------------------------------------
CREATE TABLE "Solicitudes"."Ticket"
(
    id                    SERIAL        NOT NULL,
    tipo_solicitud_id     INT           NOT NULL,
    formulario_id         INT           NOT NULL,
    estado_id             INT           NOT NULL,       -- si se omite: 'Enviado' (trigger)
    usuario_registro      INT           NOT NULL,       -- empleado que solicita
    area_id               INT           NOT NULL,       -- si se omite: área del solicitante (trigger)
    disenador_id          INT,                          -- diseñador asignado
    fecha_registro        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_limite          TIMESTAMPTZ   NOT NULL,       -- calculada por trigger
    fecha_entrega_diseno  TIMESTAMPTZ,                  -- última entrega de diseño (inicia las 24 h)
    aprobado_automatico   BOOLEAN       NOT NULL DEFAULT false,
    CONSTRAINT "pkTicket"                 PRIMARY KEY (id),
    CONSTRAINT "ukTicket_Formulario"      UNIQUE (formulario_id),
    CONSTRAINT "fkTicket_TipoSolicitud"   FOREIGN KEY (tipo_solicitud_id) REFERENCES "Solicitudes"."TipoSolicitud" (id),
    CONSTRAINT "fkTicket_Formulario"      FOREIGN KEY (formulario_id)     REFERENCES "Solicitudes"."Formularios" (id),
    CONSTRAINT "fkTicket_Estado"          FOREIGN KEY (estado_id)         REFERENCES "Solicitudes"."Estado" (id),
    CONSTRAINT "fkTicket_UsuarioRegistro" FOREIGN KEY (usuario_registro)  REFERENCES "Seguridad"."Usuarios" (id),
    CONSTRAINT "fkTicket_Area"            FOREIGN KEY (area_id)           REFERENCES "Seguridad"."Areas" (id),
    CONSTRAINT "fkTicket_Disenador"       FOREIGN KEY (disenador_id)      REFERENCES "Seguridad"."Usuarios" (id),
    CONSTRAINT "chkTicket_FechaLimite"    CHECK (fecha_limite > fecha_registro)
);
CREATE INDEX "ixTicket_TipoSolicitud"   ON "Solicitudes"."Ticket" (tipo_solicitud_id);
CREATE INDEX "ixTicket_Estado"          ON "Solicitudes"."Ticket" (estado_id);
CREATE INDEX "ixTicket_UsuarioRegistro" ON "Solicitudes"."Ticket" (usuario_registro);
CREATE INDEX "ixTicket_Area"            ON "Solicitudes"."Ticket" (area_id);
CREATE INDEX "ixTicket_Disenador"       ON "Solicitudes"."Ticket" (disenador_id);
-- Apoyo a las tareas programadas
CREATE INDEX "ixTicket_FechaLimitePendiente" ON "Solicitudes"."Ticket" (fecha_limite)         WHERE fecha_entrega_diseno IS NULL;
CREATE INDEX "ixTicket_FechaEntregaDiseno"   ON "Solicitudes"."Ticket" (fecha_entrega_diseno) WHERE fecha_entrega_diseno IS NOT NULL;

-- 4.2 TicketLog (historial) ------------------------------------------------------------
CREATE TABLE "Solicitudes"."TicketLog"
(
    id                  SERIAL        NOT NULL,
    ticket_id           INT           NOT NULL,
    numero_version      INT           NOT NULL,
    descripcion_cambio  TEXT          NOT NULL,
    fecha_registro      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pkTicketLog"                PRIMARY KEY (id),
    CONSTRAINT "ukTicketLog_Version"        UNIQUE (ticket_id, numero_version),
    CONSTRAINT "fkTicketLog_Ticket"         FOREIGN KEY (ticket_id) REFERENCES "Solicitudes"."Ticket" (id),
    CONSTRAINT "chkTicketLog_NumeroVersion" CHECK (numero_version > 0)
);

-- 4.3 Entregables (evidencia por versión; nunca se sobrescribe) -------------------------
--   estado_id y version los asigna el trigger según el estado del ticket al subir:
--     estado_id = estado del ticket al subir    -> propuesta de diseño       (version 1)
--     estado_id = 'Corrección' (o 'Finalizado'
--                 tras la corrección)           -> diseño corregido          (version 2)
--     estado_id = 'Aprobado'                    -> evidencia de publicación  (versión aprobada)
--   Varios archivos pueden compartir la misma versión.
CREATE TABLE "Solicitudes"."Entregables"
(
    id                  SERIAL        NOT NULL,
    ticket_id           INT           NOT NULL,
    disenador_id        INT           NOT NULL,
    version             INT           NOT NULL,
    estado_id           INT           NOT NULL,
    tipo_entregable     VARCHAR(10)   NOT NULL,
    url_o_ruta          TEXT          NOT NULL,         -- link externo o URL pública de Supabase Storage
    descripcion         TEXT,
    fecha_subida        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pkEntregable"                PRIMARY KEY (id),
    CONSTRAINT "fkEntregable_Ticket"         FOREIGN KEY (ticket_id)    REFERENCES "Solicitudes"."Ticket" (id),
    CONSTRAINT "fkEntregable_Disenador"      FOREIGN KEY (disenador_id) REFERENCES "Seguridad"."Usuarios" (id),
    CONSTRAINT "fkEntregable_Estado"         FOREIGN KEY (estado_id)    REFERENCES "Solicitudes"."Estado" (id),
    CONSTRAINT "chkEntregable_Version"       CHECK (version IN (1, 2)),   -- máx. 1 corrección
    CONSTRAINT "chkEntregable_TipoEntregable" CHECK (tipo_entregable IN ('LINK', 'PDF', 'IMAGEN', 'VIDEO', 'OTRO')),
    CONSTRAINT "chkEntregable_UrlORuta"      CHECK (btrim(url_o_ruta) <> ''
                                                    AND (tipo_entregable <> 'LINK' OR url_o_ruta ~* '^https?://'))
);
CREATE INDEX "ixEntregable_TicketVersion" ON "Solicitudes"."Entregables" (ticket_id, version);
CREATE INDEX "ixEntregable_Disenador"     ON "Solicitudes"."Entregables" (disenador_id);
CREATE INDEX "ixEntregable_Estado"        ON "Solicitudes"."Entregables" (estado_id);

-- 4.4 DictamenJefe ---------------------------------------------------------------------
CREATE TABLE "Solicitudes"."DictamenJefe"
(
    id                  SERIAL        NOT NULL,
    ticket_id           INT           NOT NULL,
    jefe_id             INT           NOT NULL,
    decision            VARCHAR(10)   NOT NULL,
    comentario          TEXT,
    fecha_dictamen      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pkDictamenJefe"            PRIMARY KEY (id),
    CONSTRAINT "fkDictamenJefe_Ticket"     FOREIGN KEY (ticket_id) REFERENCES "Solicitudes"."Ticket" (id),
    CONSTRAINT "fkDictamenJefe_Jefe"       FOREIGN KEY (jefe_id)   REFERENCES "Seguridad"."Usuarios" (id),
    CONSTRAINT "chkDictamenJefe_Decision"  CHECK (decision IN ('APROBADO', 'CORRECCION')),
    CONSTRAINT "chkDictamenJefe_Comentario" CHECK (decision <> 'CORRECCION' OR btrim(COALESCE(comentario, '')) <> '')
);
CREATE INDEX "ixDictamenJefe_Ticket" ON "Solicitudes"."DictamenJefe" (ticket_id);
CREATE INDEX "ixDictamenJefe_Jefe"   ON "Solicitudes"."DictamenJefe" (jefe_id);
-- Regla de negocio: máximo 1 corrección y 1 aprobación por ticket.
CREATE UNIQUE INDEX "ukDictamenJefe_Correccion" ON "Solicitudes"."DictamenJefe" (ticket_id) WHERE decision = 'CORRECCION';
CREATE UNIQUE INDEX "ukDictamenJefe_Aprobado"   ON "Solicitudes"."DictamenJefe" (ticket_id) WHERE decision = 'APROBADO';

-- 4.5 Notificaciones -------------------------------------------------------------------
CREATE TABLE "Solicitudes"."Notificaciones"
(
    id                  SERIAL        NOT NULL,
    usuario_id          INT           NOT NULL,         -- destinatario
    ticket_id           INT,                            -- ticket que la origina (opcional)
    visto               BOOLEAN       NOT NULL DEFAULT false,
    mensaje             TEXT          NOT NULL,
    fecha               TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pkNotificacion"          PRIMARY KEY (id),
    CONSTRAINT "fkNotificacion_Usuario"  FOREIGN KEY (usuario_id) REFERENCES "Seguridad"."Usuarios" (id),
    CONSTRAINT "fkNotificacion_Ticket"   FOREIGN KEY (ticket_id)  REFERENCES "Solicitudes"."Ticket" (id)
);
CREATE INDEX "ixNotificacion_Ticket"         ON "Solicitudes"."Notificaciones" (ticket_id);
CREATE INDEX "ixNotificacion_UsuarioNoVisto" ON "Solicitudes"."Notificaciones" (usuario_id, fecha DESC) WHERE visto = false;
CREATE INDEX "ixNotificacion_Usuario"        ON "Solicitudes"."Notificaciones" (usuario_id);


/* =====================================================================================
   5. FUNCIONES AUXILIARES
   ===================================================================================== */

-- Id de un estado por nombre (falla si el catálogo no lo tiene).
CREATE OR REPLACE FUNCTION "Solicitudes"."fnObtenerEstadoIdEscalar"(p_nombre VARCHAR)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_id INT;
BEGIN
    SELECT e.id INTO v_id FROM "Solicitudes"."Estado" e WHERE e.nombre = p_nombre;
    IF v_id IS NULL THEN
        RAISE EXCEPTION 'El estado "%" no existe en "Solicitudes"."Estado".', p_nombre;
    END IF;
    RETURN v_id;
END;
$$;

-- ¿El usuario está activo y tiene asignado el rol (activo) indicado?
CREATE OR REPLACE FUNCTION "Seguridad"."fnUsuarioTieneRolEscalar"(p_usuario_id INT, p_rol VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM "Seguridad"."UsuariosRoles" ur
          JOIN "Seguridad"."Usuarios" u ON u.id = ur.usuario_id
          JOIN "Seguridad"."Roles"    r ON r.id = ur.rol_id
         WHERE ur.usuario_id = p_usuario_id
           AND r.nombre = p_rol
           AND u.estado AND r.estado
    );
$$;

-- ¿Ya transcurrieron las 24 h desde la entrega del diseño? (única fuente de la regla)
CREATE OR REPLACE FUNCTION "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(p_fecha_entrega_diseno TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT p_fecha_entrega_diseno IS NOT NULL
       AND p_fecha_entrega_diseno <= CURRENT_TIMESTAMP - INTERVAL '24 hours';
$$;

-- Registros inmutables / desactivación lógica: bloquea UPDATE o DELETE.
CREATE OR REPLACE FUNCTION "Solicitudes"."fnBloquearModificacionTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'No se permite % en %.%.', TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME
          USING ERRCODE = 'restrict_violation',
                HINT    = COALESCE(TG_ARGV[0], 'Los registros de esta tabla son de solo inserción.');
END;
$$;


/* =====================================================================================
   6. TRIGGERS
   ===================================================================================== */

-- 6.1 Desactivación lógica: Usuarios y Roles no se eliminan -----------------------------
CREATE TRIGGER "tgrUsuariosEliminar"
BEFORE DELETE ON "Seguridad"."Usuarios"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnBloquearModificacionTrigger"('Desactive el usuario con estado = false.');

CREATE TRIGGER "tgrRolesEliminar"
BEFORE DELETE ON "Seguridad"."Roles"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnBloquearModificacionTrigger"('Desactive el rol con estado = false.');

-- 6.2 Bitácora de roles: ASIGNADO / REVOCADO -------------------------------------------
CREATE OR REPLACE FUNCTION "Seguridad"."fnUsuarioRolRegistrarLogTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "Seguridad"."UsuariosRolesLog" (usuario_id, rol_id, accion)
        VALUES (NEW.usuario_id, NEW.rol_id, 'ASIGNADO');
    ELSE
        INSERT INTO "Seguridad"."UsuariosRolesLog" (usuario_id, rol_id, accion)
        VALUES (OLD.usuario_id, OLD.rol_id, 'REVOCADO');
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER "tgrUsuariosRolesInsertarEliminar"
AFTER INSERT OR DELETE ON "Seguridad"."UsuariosRoles"
FOR EACH ROW EXECUTE FUNCTION "Seguridad"."fnUsuarioRolRegistrarLogTrigger"();

-- 6.3 Logs, entregables y dictámenes son evidencia: solo inserción ---------------------
CREATE TRIGGER "tgrUsuariosRolesLogModificar"
BEFORE UPDATE OR DELETE ON "Seguridad"."UsuariosRolesLog"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnBloquearModificacionTrigger"();

CREATE TRIGGER "tgrTicketLogModificar"
BEFORE UPDATE OR DELETE ON "Solicitudes"."TicketLog"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnBloquearModificacionTrigger"();

CREATE TRIGGER "tgrEntregablesModificar"
BEFORE UPDATE OR DELETE ON "Solicitudes"."Entregables"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnBloquearModificacionTrigger"('Suba una nueva versión en lugar de modificar la existente.');

CREATE TRIGGER "tgrDictamenJefeModificar"
BEFORE UPDATE OR DELETE ON "Solicitudes"."DictamenJefe"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnBloquearModificacionTrigger"();


-- 6.4 Ticket: fecha límite = fecha_registro + dias_estimados ----------------------------
CREATE OR REPLACE FUNCTION "Solicitudes"."fnTicketCalcularFechaLimiteTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_dias INT;
BEGIN
    SELECT ts.dias_estimados INTO v_dias
      FROM "Solicitudes"."TipoSolicitud" ts
     WHERE ts.id = NEW.tipo_solicitud_id;

    IF v_dias IS NULL THEN
        RAISE EXCEPTION 'El tipo de solicitud % no existe.', NEW.tipo_solicitud_id
              USING ERRCODE = 'foreign_key_violation';
    END IF;

    NEW.fecha_registro := COALESCE(NEW.fecha_registro, CURRENT_TIMESTAMP);
    NEW.fecha_limite   := NEW.fecha_registro + make_interval(days => v_dias);
    RETURN NEW;
END;
$$;

CREATE TRIGGER "tgrTicketCalcularFechaLimite"
BEFORE INSERT ON "Solicitudes"."Ticket"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnTicketCalcularFechaLimiteTrigger"();


-- 6.5 Ticket: validaciones de datos ----------------------------------------------------
--   - tipo_solicitud_id coincide con el del formulario y el tipo está activo
--   - solicitante activo; área por defecto = área del solicitante; estado inicial 'Enviado'
--   - disenador_id (si se indica) debe tener el rol 'Diseñador'
CREATE OR REPLACE FUNCTION "Solicitudes"."fnTicketValidarTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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

    -- Diseñador asignado
    IF NEW.disenador_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.disenador_id IS DISTINCT FROM OLD.disenador_id)
       AND NOT "Seguridad"."fnUsuarioTieneRolEscalar"(NEW.disenador_id, 'Diseñador') THEN
        RAISE EXCEPTION 'El usuario % no está activo o no tiene el rol "Diseñador".', NEW.disenador_id
              USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "tgrTicketValidarInsertarActualizar"
BEFORE INSERT OR UPDATE OF tipo_solicitud_id, formulario_id, usuario_registro, area_id, disenador_id
ON "Solicitudes"."Ticket"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnTicketValidarTrigger"();


-- 6.6 Ticket: flujo de estados -----------------------------------------------------------
CREATE OR REPLACE FUNCTION "Solicitudes"."fnTicketValidarTransicionTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_anterior  VARCHAR(50);
    v_nuevo     VARCHAR(50);
    v_permitido BOOLEAN;
BEGIN
    SELECT nombre INTO v_anterior FROM "Solicitudes"."Estado" WHERE id = OLD.estado_id;
    SELECT nombre INTO v_nuevo    FROM "Solicitudes"."Estado" WHERE id = NEW.estado_id;

    v_permitido := CASE v_anterior
        WHEN 'Enviado'     THEN v_nuevo IN ('En revisión', 'En proceso', 'Finalizado', 'Retrasado')
        WHEN 'En revisión' THEN v_nuevo IN ('En proceso', 'Finalizado', 'Retrasado')
        WHEN 'En proceso'  THEN v_nuevo IN ('Finalizado', 'Retrasado')
        WHEN 'Retrasado'   THEN v_nuevo IN ('Finalizado')
        WHEN 'Finalizado'  THEN v_nuevo IN ('Corrección', 'Aprobado')
        WHEN 'Corrección'  THEN v_nuevo IN ('Finalizado')
        ELSE false                                    -- 'Aprobado' es estado final
    END;

    IF NOT v_permitido THEN
        RAISE EXCEPTION 'Transición de estado no permitida para el ticket %: "%" -> "%".', NEW.id, v_anterior, v_nuevo
              USING ERRCODE = 'check_violation';
    END IF;

    IF v_nuevo = 'Finalizado' AND NEW.fecha_entrega_diseno IS NULL THEN
        RAISE EXCEPTION 'El ticket % no puede pasar a "Finalizado" sin un entregable de diseño.', NEW.id
              USING ERRCODE = 'check_violation',
                    HINT    = 'Inserte el archivo/enlace en "Solicitudes"."Entregables"; el estado cambia solo.';
    END IF;

    IF v_nuevo = 'Retrasado' AND NEW.fecha_limite >= CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'El ticket % aún no supera su fecha límite (%).', NEW.id, NEW.fecha_limite
              USING ERRCODE = 'check_violation';
    END IF;

    IF v_nuevo = 'Corrección' AND NOT EXISTS (
            SELECT 1 FROM "Solicitudes"."DictamenJefe" d
             WHERE d.ticket_id = NEW.id AND d.decision = 'CORRECCION'
               AND d.fecha_dictamen >= NEW.fecha_entrega_diseno) THEN
        RAISE EXCEPTION 'El ticket % solo pasa a "Corrección" mediante un dictamen del jefe.', NEW.id
              USING ERRCODE = 'check_violation';
    END IF;

    IF v_nuevo = 'Aprobado' THEN
        IF NEW.aprobado_automatico THEN
            IF NOT "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(NEW.fecha_entrega_diseno) THEN
                RAISE EXCEPTION 'El ticket % aún no cumple 24 h desde la entrega del diseño.', NEW.id
                      USING ERRCODE = 'check_violation';
            END IF;
        ELSIF NOT EXISTS (SELECT 1 FROM "Solicitudes"."DictamenJefe" d
                           WHERE d.ticket_id = NEW.id AND d.decision = 'APROBADO') THEN
            RAISE EXCEPTION 'El ticket % solo pasa a "Aprobado" por dictamen del jefe o automáticamente a las 24 h.', NEW.id
                  USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "tgrTicketValidarTransicionActualizar"
BEFORE UPDATE OF estado_id ON "Solicitudes"."Ticket"
FOR EACH ROW
WHEN (OLD.estado_id IS DISTINCT FROM NEW.estado_id)
EXECUTE FUNCTION "Solicitudes"."fnTicketValidarTransicionTrigger"();


-- 6.7 Ticket: historial en TicketLog ---------------------------------------------------
-- Versión correlativa por ticket (segura ante concurrencia: la fila del ticket queda
-- bloqueada por el propio INSERT/UPDATE).
CREATE OR REPLACE FUNCTION "Solicitudes"."fnTicketRegistrarLogTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_cambios   TEXT[] := ARRAY[]::TEXT[];
    v_version   INT;
    v_anterior  VARCHAR(100);
    v_nuevo     VARCHAR(100);
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT nombre INTO v_nuevo FROM "Solicitudes"."Estado" WHERE id = NEW.estado_id;
        v_cambios := array_append(v_cambios,
            format('Ticket creado con estado "%s"; fecha límite %s', v_nuevo,
                   to_char(NEW.fecha_limite, 'YYYY-MM-DD HH24:MI TZ')));
    ELSE
        IF NEW.estado_id IS DISTINCT FROM OLD.estado_id THEN
            SELECT nombre INTO v_anterior FROM "Solicitudes"."Estado" WHERE id = OLD.estado_id;
            SELECT nombre INTO v_nuevo    FROM "Solicitudes"."Estado" WHERE id = NEW.estado_id;
            v_cambios := array_append(v_cambios, format('Estado: "%s" -> "%s"%s', v_anterior, v_nuevo,
                         CASE WHEN NEW.aprobado_automatico AND NOT OLD.aprobado_automatico
                              THEN ' (automático, 24 h sin dictamen)' ELSE '' END));
        END IF;

        IF NEW.disenador_id IS DISTINCT FROM OLD.disenador_id THEN
            SELECT nombre INTO v_anterior FROM "Seguridad"."Usuarios" WHERE id = OLD.disenador_id;
            SELECT nombre INTO v_nuevo    FROM "Seguridad"."Usuarios" WHERE id = NEW.disenador_id;
            v_cambios := array_append(v_cambios, format('Diseñador: %s -> %s',
                         COALESCE(v_anterior, '(sin asignar)'), COALESCE(v_nuevo, '(sin asignar)')));
        END IF;

        IF NEW.fecha_entrega_diseno IS DISTINCT FROM OLD.fecha_entrega_diseno THEN
            v_cambios := array_append(v_cambios, format('Entrega de diseño registrada: %s',
                         to_char(NEW.fecha_entrega_diseno, 'YYYY-MM-DD HH24:MI TZ')));
        END IF;

        IF NEW.tipo_solicitud_id IS DISTINCT FROM OLD.tipo_solicitud_id THEN
            v_cambios := array_append(v_cambios, format('Tipo de solicitud: %s -> %s', OLD.tipo_solicitud_id, NEW.tipo_solicitud_id));
        END IF;

        IF NEW.area_id IS DISTINCT FROM OLD.area_id THEN
            v_cambios := array_append(v_cambios, format('Área: %s -> %s', OLD.area_id, NEW.area_id));
        END IF;

        IF NEW.fecha_limite IS DISTINCT FROM OLD.fecha_limite THEN
            v_cambios := array_append(v_cambios, format('Fecha límite: %s -> %s',
                         to_char(OLD.fecha_limite, 'YYYY-MM-DD HH24:MI TZ'), to_char(NEW.fecha_limite, 'YYYY-MM-DD HH24:MI TZ')));
        END IF;

        IF cardinality(v_cambios) = 0 THEN
            RETURN NULL;                              -- nada relevante cambió
        END IF;
    END IF;

    SELECT COALESCE(MAX(numero_version), 0) + 1 INTO v_version
      FROM "Solicitudes"."TicketLog" WHERE ticket_id = NEW.id;

    INSERT INTO "Solicitudes"."TicketLog" (ticket_id, numero_version, descripcion_cambio)
    VALUES (NEW.id, v_version, array_to_string(v_cambios, '; '));

    RETURN NULL;
END;
$$;

CREATE TRIGGER "tgrTicketLogInsertarActualizar"
AFTER INSERT OR UPDATE ON "Solicitudes"."Ticket"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnTicketRegistrarLogTrigger"();


-- 6.8 Formularios: no cambiar el tipo si ya tiene ticket de otro tipo -------------------
CREATE OR REPLACE FUNCTION "Solicitudes"."fnFormularioValidarTipoSolicitudTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Solicitudes"."Ticket" t
                WHERE t.formulario_id = NEW.id AND t.tipo_solicitud_id <> NEW.tipo_solicitud_id) THEN
        RAISE EXCEPTION 'No se puede cambiar el tipo del formulario %: ya tiene un ticket de otro tipo.', NEW.id
              USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "tgrFormulariosActualizar"
BEFORE UPDATE OF tipo_solicitud_id ON "Solicitudes"."Formularios"
FOR EACH ROW
WHEN (OLD.tipo_solicitud_id IS DISTINCT FROM NEW.tipo_solicitud_id)
EXECUTE FUNCTION "Solicitudes"."fnFormularioValidarTipoSolicitudTrigger"();


-- 6.9 Entregables: validar, calcular versión y guardar el estado del ticket --------------
CREATE OR REPLACE FUNCTION "Solicitudes"."fnEntregableValidarTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

CREATE TRIGGER "tgrEntregablesValidarInsertar"
BEFORE INSERT ON "Solicitudes"."Entregables"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnEntregableValidarTrigger"();

-- Subir diseño -> ticket 'Finalizado' (inicia las 24 h). Evidencia final con ticket vencido
-- -> se formaliza la aprobación automática.
CREATE OR REPLACE FUNCTION "Solicitudes"."fnEntregableActualizarTicketTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado VARCHAR(50);
BEGIN
    SELECT e.nombre INTO v_estado
      FROM "Solicitudes"."Ticket" t JOIN "Solicitudes"."Estado" e ON e.id = t.estado_id
     WHERE t.id = NEW.ticket_id;

    IF v_estado NOT IN ('Finalizado', 'Aprobado')
       AND NEW.estado_id <> "Solicitudes"."fnObtenerEstadoIdEscalar"('Aprobado') THEN
        -- Primer archivo de esta versión: marca la entrega. Archivos adicionales de la
        -- misma versión no reinician la ventana de 24 h.
        UPDATE "Solicitudes"."Ticket"
           SET estado_id            = "Solicitudes"."fnObtenerEstadoIdEscalar"('Finalizado'),
               fecha_entrega_diseno = NEW.fecha_subida,
               disenador_id         = COALESCE(disenador_id, NEW.disenador_id)
         WHERE id = NEW.ticket_id;

    ELSIF v_estado = 'Finalizado'
          AND NEW.estado_id = "Solicitudes"."fnObtenerEstadoIdEscalar"('Aprobado') THEN
        UPDATE "Solicitudes"."Ticket"
           SET estado_id           = "Solicitudes"."fnObtenerEstadoIdEscalar"('Aprobado'),
               aprobado_automatico = true
         WHERE id = NEW.ticket_id;
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER "tgrEntregablesActualizarTicketInsertar"
AFTER INSERT ON "Solicitudes"."Entregables"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnEntregableActualizarTicketTrigger"();


-- 6.10 DictamenJefe: validar y aplicar la decisión ---------------------------------------
CREATE OR REPLACE FUNCTION "Solicitudes"."fnDictamenJefeValidarTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_ticket    "Solicitudes"."Ticket"%ROWTYPE;
    v_estado    VARCHAR(50);
    v_jefe_area INT;
BEGIN
    SELECT * INTO v_ticket FROM "Solicitudes"."Ticket" WHERE id = NEW.ticket_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El ticket % no existe.', NEW.ticket_id USING ERRCODE = 'foreign_key_violation';
    END IF;
    SELECT nombre INTO v_estado FROM "Solicitudes"."Estado" WHERE id = v_ticket.estado_id;

    IF v_estado <> 'Finalizado' THEN
        RAISE EXCEPTION 'Solo se dictamina un ticket en estado "Finalizado" (el ticket % está en "%").', NEW.ticket_id, v_estado
              USING ERRCODE = 'check_violation';
    END IF;

    IF "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(v_ticket.fecha_entrega_diseno) THEN
        RAISE EXCEPTION 'La ventana de 24 h para dictaminar el ticket % venció el %; quedó aprobado automáticamente.',
              NEW.ticket_id, to_char(v_ticket.fecha_entrega_diseno + INTERVAL '24 hours', 'YYYY-MM-DD HH24:MI TZ')
              USING ERRCODE = 'check_violation';
    END IF;

    IF NOT "Seguridad"."fnUsuarioTieneRolEscalar"(NEW.jefe_id, 'Jefe de Área') THEN
        RAISE EXCEPTION 'El usuario % no está activo o no tiene el rol "Jefe de Área".', NEW.jefe_id
              USING ERRCODE = 'check_violation';
    END IF;

    SELECT area_id INTO v_jefe_area FROM "Seguridad"."Usuarios" WHERE id = NEW.jefe_id;
    IF v_jefe_area IS DISTINCT FROM v_ticket.area_id THEN
        RAISE EXCEPTION 'El jefe % no pertenece al área del ticket %.', NEW.jefe_id, NEW.ticket_id
              USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.decision = 'CORRECCION' AND EXISTS (
            SELECT 1 FROM "Solicitudes"."DictamenJefe" WHERE ticket_id = NEW.ticket_id AND decision = 'CORRECCION') THEN
        RAISE EXCEPTION 'El ticket % ya tuvo su única corrección permitida; solo puede aprobarse.', NEW.ticket_id
              USING ERRCODE = 'check_violation';
    END IF;

    NEW.fecha_dictamen := COALESCE(NEW.fecha_dictamen, CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$;

CREATE TRIGGER "tgrDictamenJefeValidarInsertar"
BEFORE INSERT ON "Solicitudes"."DictamenJefe"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnDictamenJefeValidarTrigger"();

CREATE OR REPLACE FUNCTION "Solicitudes"."fnDictamenJefeAplicarTrigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_ticket "Solicitudes"."Ticket"%ROWTYPE;
BEGIN
    UPDATE "Solicitudes"."Ticket"
       SET estado_id = "Solicitudes"."fnObtenerEstadoIdEscalar"(
                           CASE NEW.decision WHEN 'APROBADO' THEN 'Aprobado' ELSE 'Corrección' END)
     WHERE id = NEW.ticket_id
    RETURNING * INTO v_ticket;

    -- Avisar al diseñador
    IF v_ticket.disenador_id IS NOT NULL THEN
        INSERT INTO "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
        VALUES (v_ticket.disenador_id, NEW.ticket_id,
                CASE NEW.decision
                    WHEN 'APROBADO' THEN format('El ticket #%s fue aprobado por el jefe de área.', NEW.ticket_id)
                    ELSE format('El ticket #%s requiere corrección: %s', NEW.ticket_id, NEW.comentario)
                END);
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER "tgrDictamenJefeAplicarInsertar"
AFTER INSERT ON "Solicitudes"."DictamenJefe"
FOR EACH ROW EXECUTE FUNCTION "Solicitudes"."fnDictamenJefeAplicarTrigger"();


/* =====================================================================================
   7. TAREAS PROGRAMADAS Y VISTA
   ===================================================================================== */

-- 7.1 Tickets retrasados -----------------------------------------------------------------
-- Pasa a 'Retrasado' los tickets sin entrega cuya fecha_limite ya venció ('Enviado',
-- 'En revisión' o 'En proceso') y notifica al diseñador asignado; si no hay diseñador
-- asignado, notifica a todos los diseñadores activos. Devuelve cuántos tickets cambió.
CREATE OR REPLACE FUNCTION "Solicitudes"."fnVerificarTicketsRetrasados"()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_total INT;
BEGIN
    WITH retrasados AS (
        UPDATE "Solicitudes"."Ticket" t
           SET estado_id = "Solicitudes"."fnObtenerEstadoIdEscalar"('Retrasado')
          FROM "Solicitudes"."Estado" e
         WHERE e.id = t.estado_id
           AND e.nombre IN ('Enviado', 'En revisión', 'En proceso')
           AND t.fecha_entrega_diseno IS NULL
           AND t.fecha_limite < CURRENT_TIMESTAMP
        RETURNING t.id, t.disenador_id, t.tipo_solicitud_id, t.fecha_limite
    ),
    destinatarios AS (
        SELECT r.id AS ticket_id, r.disenador_id AS usuario_id, r.tipo_solicitud_id, r.fecha_limite
          FROM retrasados r
         WHERE r.disenador_id IS NOT NULL
        UNION
        SELECT r.id, ur.usuario_id, r.tipo_solicitud_id, r.fecha_limite
          FROM retrasados r
          JOIN "Seguridad"."UsuariosRoles" ur ON true
          JOIN "Seguridad"."Roles"    ro ON ro.id = ur.rol_id AND ro.nombre = 'Diseñador' AND ro.estado
          JOIN "Seguridad"."Usuarios" u  ON u.id  = ur.usuario_id AND u.estado
         WHERE r.disenador_id IS NULL
    ),
    notificadas AS (
        INSERT INTO "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
        SELECT d.usuario_id, d.ticket_id,
               format('El ticket #%s (%s) está RETRASADO: su fecha límite era %s.',
                      d.ticket_id, ts.nombre, to_char(d.fecha_limite, 'YYYY-MM-DD HH24:MI TZ'))
          FROM destinatarios d
          JOIN "Solicitudes"."TipoSolicitud" ts ON ts.id = d.tipo_solicitud_id
        RETURNING 1
    )
    SELECT count(*) INTO v_total FROM retrasados;

    RETURN v_total;
END;
$$;

-- 7.2 Aprobación automática a las 24 h --------------------------------------------------
-- Formaliza en la tabla lo que la vista ya muestra en tiempo real. Notifica al
-- solicitante y al diseñador. Devuelve cuántos tickets aprobó.
CREATE OR REPLACE FUNCTION "Solicitudes"."fnAprobarTicketsAutomaticamente"()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_total INT;
BEGIN
    WITH aprobados AS (
        UPDATE "Solicitudes"."Ticket" t
           SET estado_id           = "Solicitudes"."fnObtenerEstadoIdEscalar"('Aprobado'),
               aprobado_automatico = true
          FROM "Solicitudes"."Estado" e
         WHERE e.id = t.estado_id
           AND e.nombre = 'Finalizado'
           AND "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(t.fecha_entrega_diseno)
        RETURNING t.id, t.usuario_registro, t.disenador_id
    ),
    notificadas AS (
        INSERT INTO "Solicitudes"."Notificaciones" (usuario_id, ticket_id, mensaje)
        SELECT x.usuario_id, a.id,
               format('El ticket #%s fue aprobado automáticamente (24 h sin dictamen del jefe).', a.id)
          FROM aprobados a
          CROSS JOIN LATERAL (VALUES (a.usuario_registro), (a.disenador_id)) AS x(usuario_id)
         WHERE x.usuario_id IS NOT NULL
        RETURNING 1
    )
    SELECT count(*) INTO v_total FROM aprobados;

    RETURN v_total;
END;
$$;

-- 7.3 Vista de estado en tiempo real ----------------------------------------------------
-- security_invoker: respeta los permisos/RLS de quien consulta (recomendado en Supabase).
CREATE OR REPLACE VIEW "Solicitudes"."vw_TicketsEstadoReal"
WITH (security_invoker = true)
AS
SELECT
    t.id                                            AS ticket_id,
    ts.nombre                                       AS tipo_solicitud,
    a.nombre                                        AS area,
    t.usuario_registro,
    us.nombre                                       AS solicitante,
    t.disenador_id,
    ud.nombre                                       AS disenador,
    e.nombre                                        AS estado_registrado,
    CASE
        WHEN e.nombre = 'Aprobado' AND t.aprobado_automatico                         THEN 'Aprobado (Automático)'
        WHEN e.nombre = 'Finalizado'
             AND "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(t.fecha_entrega_diseno) THEN 'Aprobado (Automático)'
        WHEN e.nombre IN ('Enviado', 'En revisión', 'En proceso')
             AND t.fecha_entrega_diseno IS NULL
             AND t.fecha_limite < CURRENT_TIMESTAMP                                  THEN 'Retrasado'
        ELSE e.nombre
    END                                             AS estado_real,
    t.fecha_registro,
    t.fecha_limite,
    t.fecha_entrega_diseno,
    t.fecha_entrega_diseno + INTERVAL '24 hours'    AS fecha_aprobacion_automatica,
    CASE
        WHEN e.nombre = 'Finalizado'
             AND NOT "Solicitudes"."fnVentanaAprobacionVencidaEscalar"(t.fecha_entrega_diseno)
        THEN round(EXTRACT(EPOCH FROM (t.fecha_entrega_diseno + INTERVAL '24 hours' - CURRENT_TIMESTAMP)) / 3600.0, 1)
    END                                             AS horas_restantes_dictamen,
    (t.fecha_entrega_diseno IS NULL AND t.fecha_limite < CURRENT_TIMESTAMP) AS fuera_de_plazo,
    (SELECT count(*) FROM "Solicitudes"."DictamenJefe" d
      WHERE d.ticket_id = t.id AND d.decision = 'CORRECCION')               AS correcciones_usadas,
    t.aprobado_automatico
FROM "Solicitudes"."Ticket" t
JOIN "Solicitudes"."TipoSolicitud" ts ON ts.id = t.tipo_solicitud_id
JOIN "Solicitudes"."Estado"        e  ON e.id  = t.estado_id
JOIN "Seguridad"."Areas"           a  ON a.id  = t.area_id
JOIN "Seguridad"."Usuarios"        us ON us.id = t.usuario_registro
LEFT JOIN "Seguridad"."Usuarios"   ud ON ud.id = t.disenador_id;


/* =====================================================================================
   8. DATOS INICIALES (se pueden reejecutar sin duplicar)
   ===================================================================================== */
INSERT INTO "Seguridad"."Areas" (nombre, descripcion)
VALUES ('Comunicación', 'Subárea de Comunicación de VOAE'),
       ('Becas',        'Subárea de Becas de VOAE'),
       ('Salud',        'Subárea de Salud de VOAE')
ON CONFLICT ON CONSTRAINT "ukArea_Nombre" DO NOTHING;

-- Los triggers buscan los roles 'Diseñador' y 'Jefe de Área' por nombre: no renombrarlos.
INSERT INTO "Seguridad"."Roles" (nombre, descripcion)
VALUES ('Administrador', 'Administra usuarios, roles y catálogos'),
       ('Jefe de Área',  'Aprueba o solicita corrección (máx. 1) de los entregables de su área'),
       ('Diseñador',     'Encargado de resolver las solicitudes visuales/multimedia'),
       ('Empleado',      'Crea solicitudes')
ON CONFLICT ON CONSTRAINT "ukRol_Nombre" DO NOTHING;

INSERT INTO "Solicitudes"."TipoSolicitud" (nombre, dias_estimados)
VALUES ('Afiche',                        5),
       ('Edición fotográfica',           4),
       ('Cobertura de eventos',          3),
       ('Comunicado',                    2),
       ('Publicación en redes sociales', 2),
       ('Aviso',                         1)
ON CONFLICT ON CONSTRAINT "ukTipoSolicitud_Nombre"
DO UPDATE SET dias_estimados = EXCLUDED.dias_estimados;

INSERT INTO "Solicitudes"."Estado" (nombre)
VALUES ('Enviado'), ('En revisión'), ('En proceso'), ('Finalizado'),
       ('Corrección'), ('Aprobado'), ('Retrasado')
ON CONFLICT ON CONSTRAINT "ukEstado_Nombre" DO NOTHING;

COMMIT;


/* =====================================================================================
   9. PROGRAMACIÓN CON pg_cron (Supabase)
   Si falla CREATE EXTENSION, actívela en Dashboard > Database > Extensions > pg_cron
   y ejecute de nuevo solo esta sección. cron.schedule con el mismo nombre actualiza el
   job existente (no lo duplica). Horarios en UTC.
   ===================================================================================== */
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
    'voae_verificar_tickets_retrasados',
    '0 * * * *',                                  -- cada hora, minuto 0
    $$SELECT "Solicitudes"."fnVerificarTicketsRetrasados"();$$
);

SELECT cron.schedule(
    'voae_aprobar_tickets_automaticamente',
    '*/15 * * * *',                               -- cada 15 minutos
    $$SELECT "Solicitudes"."fnAprobarTicketsAutomaticamente"();$$
);

-- Verificar:      SELECT jobid, jobname, schedule, active FROM cron.job;
-- Ver ejecuciones: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- Quitar un job:  SELECT cron.unschedule('voae_verificar_tickets_retrasados');


/* =====================================================================================
   10. ACCESO DESDE LA API DE SUPABASE (OPCIONAL)
   Los esquemas propios no se exponen por defecto. Para usarlos desde supabase-js:
     a) Dashboard > Project Settings > API > Exposed schemas: agregar Seguridad y Solicitudes.
     b) Conceder permisos (y definir políticas RLS antes de exponer datos sensibles):
   ===================================================================================== */
-- GRANT USAGE ON SCHEMA "Solicitudes", "Seguridad" TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA "Solicitudes" TO authenticated;
-- GRANT SELECT ON "Seguridad"."Areas", "Seguridad"."Roles" TO authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "Solicitudes" TO authenticated;
-- ALTER TABLE "Solicitudes"."Ticket" ENABLE ROW LEVEL SECURITY;   -- y crear sus políticas
