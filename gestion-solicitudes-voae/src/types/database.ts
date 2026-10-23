export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  Seguridad: {
    Tables: {
      Areas: {
        Row: {
          descripcion: string | null
          estado: boolean
          id: number
          nombre: string
          prefijo: string | null
          ultimo_consecutivo: number
        }
        Insert: {
          descripcion?: string | null
          estado?: boolean
          id?: number
          nombre: string
          prefijo?: string | null
          ultimo_consecutivo?: number
        }
        Update: {
          descripcion?: string | null
          estado?: boolean
          id?: number
          nombre?: string
          prefijo?: string | null
          ultimo_consecutivo?: number
        }
        Relationships: []
      }
      FeriadosLog: {
        Row: {
          accion: string
          fecha_fin_anterior: string | null
          fecha_fin_nueva: string | null
          fecha_inicio_anterior: string | null
          fecha_inicio_nueva: string | null
          fecha_registro: string
          feriado_id: number
          id: number
          nombre: string
          usuario_registro: number | null
        }
        Insert: {
          accion: string
          fecha_fin_anterior?: string | null
          fecha_fin_nueva?: string | null
          fecha_inicio_anterior?: string | null
          fecha_inicio_nueva?: string | null
          fecha_registro?: string
          feriado_id: number
          id?: number
          nombre: string
          usuario_registro?: number | null
        }
        Update: {
          accion?: string
          fecha_fin_anterior?: string | null
          fecha_fin_nueva?: string | null
          fecha_inicio_anterior?: string | null
          fecha_inicio_nueva?: string | null
          fecha_registro?: string
          feriado_id?: number
          id?: number
          nombre?: string
          usuario_registro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fkFeriadoLog_UsuarioRegistro"
            columns: null
            isOneToOne: false
            referencedRelation: "Usuarios"
            referencedColumns: null
          },
        ]
      }
      Roles: {
        Row: {
          descripcion: string | null
          estado: boolean
          id: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          estado?: boolean
          id?: number
          nombre: string
        }
        Update: {
          descripcion?: string | null
          estado?: boolean
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      Usuarios: {
        Row: {
          area_id: number | null
          auth_id: string | null
          correo: string
          debe_cambiar_password: boolean
          estado: boolean
          id: number
          nombre: string
          nombre_completo: string | null
          primer_apellido: string | null
          segundo_apellido: string | null
        }
        Insert: {
          area_id?: number | null
          auth_id?: string | null
          correo: string
          debe_cambiar_password?: boolean
          estado?: boolean
          id?: number
          nombre: string
          nombre_completo?: string | null
          primer_apellido?: string | null
          segundo_apellido?: string | null
        }
        Update: {
          area_id?: number | null
          auth_id?: string | null
          correo?: string
          debe_cambiar_password?: boolean
          estado?: boolean
          id?: number
          nombre?: string
          nombre_completo?: string | null
          primer_apellido?: string | null
          segundo_apellido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fkUsuario_Area"
            columns: null
            isOneToOne: false
            referencedRelation: "Areas"
            referencedColumns: null
          },
        ]
      }
      UsuariosRoles: {
        Row: {
          rol_id: number
          usuario_id: number
        }
        Insert: {
          rol_id: number
          usuario_id: number
        }
        Update: {
          rol_id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fkUsuarioRol_Rol"
            columns: null
            isOneToOne: false
            referencedRelation: "Roles"
            referencedColumns: null
          },
          {
            foreignKeyName: "fkUsuarioRol_Usuario"
            columns: null
            isOneToOne: false
            referencedRelation: "Usuarios"
            referencedColumns: null
          },
        ]
      }
      UsuariosRolesLog: {
        Row: {
          accion: string
          fecha_registro: string
          id: number
          rol_id: number
          usuario_id: number
          usuario_registro: number | null
        }
        Insert: {
          accion: string
          fecha_registro?: string
          id?: number
          rol_id: number
          usuario_id: number
          usuario_registro?: number | null
        }
        Update: {
          accion?: string
          fecha_registro?: string
          id?: number
          rol_id?: number
          usuario_id?: number
          usuario_registro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fkUsuarioRolLog_Rol"
            columns: null
            isOneToOne: false
            referencedRelation: "Roles"
            referencedColumns: null
          },
          {
            foreignKeyName: "fkUsuarioRolLog_Usuario"
            columns: null
            isOneToOne: false
            referencedRelation: "Usuarios"
            referencedColumns: null
          },
          {
            foreignKeyName: "fkUsuarioRolLog_UsuarioRegistro"
            columns: null
            isOneToOne: false
            referencedRelation: "Usuarios"
            referencedColumns: null
          },
        ]
      }
    }
    Views: {
      vw_FeriadosLog: {
        Row: {
          accion: string | null
          fecha_fin_anterior: string | null
          fecha_fin_nueva: string | null
          fecha_inicio_anterior: string | null
          fecha_inicio_nueva: string | null
          fecha_registro: string | null
          feriado_id: number | null
          id: number | null
          nombre: string | null
          realizado_por: string | null
          usuario_registro: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fkFeriadoLog_UsuarioRegistro"
            columns: ["usuario_registro"]
            isOneToOne: false
            referencedRelation: "Usuarios"
            referencedColumns: null
          },
        ]
      }
    }
    Functions: {
      fnDisenadoresTabla: {
        Args: never
        Returns: {
          es_asignador: boolean
          id: number
          nombre: string
        }[]
      }
      fnUsuarioActualAreaEscalar: { Args: never; Returns: number }
      fnUsuarioActualIdEscalar: { Args: never; Returns: number }
      fnUsuarioActualTieneRolEscalar: {
        Args: { p_rol: string }
        Returns: boolean
      }
      fnUsuarioAplicarConfiguracionInicial: {
        Args: { p_auth_id: string; p_meta: Json }
        Returns: undefined
      }
      fnUsuariosNombresTabla: {
        Args: never
        Returns: {
          id: number
          nombre: string
        }[]
      }
      fnUsuarioTieneRolEscalar: {
        Args: { p_rol: string; p_usuario_id: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  Solicitudes: {
    Tables: {
      Adjuntos: {
        Row: {
          descripcion: string | null
          fecha_registro: string
          id: number
          nombre_archivo: string
          ruta_o_url: string
          tamano_bytes: number | null
          ticket_id: number
          tipo: string
          tipo_mime: string | null
          usuario_registro: number
        }
        Insert: {
          descripcion?: string | null
          fecha_registro?: string
          id?: never
          nombre_archivo: string
          ruta_o_url: string
          tamano_bytes?: number | null
          ticket_id: number
          tipo?: string
          tipo_mime?: string | null
          usuario_registro: number
        }
        Update: {
          descripcion?: string | null
          fecha_registro?: string
          id?: never
          nombre_archivo?: string
          ruta_o_url?: string
          tamano_bytes?: number | null
          ticket_id?: number
          tipo?: string
          tipo_mime?: string | null
          usuario_registro?: number
        }
        Relationships: [
          {
            foreignKeyName: "fkAdjunto_Ticket"
            columns: null
            isOneToOne: false
            referencedRelation: "Ticket"
            referencedColumns: null
          },
        ]
      }
      AsignacionLog: {
        Row: {
          accion: string
          disenador_anterior_id: number | null
          disenador_nuevo_id: number | null
          fecha_registro: string
          id: number
          ticket_id: number
          usuario_registro: number | null
        }
        Insert: {
          accion: string
          disenador_anterior_id?: number | null
          disenador_nuevo_id?: number | null
          fecha_registro?: string
          id?: number
          ticket_id: number
          usuario_registro?: number | null
        }
        Update: {
          accion?: string
          disenador_anterior_id?: number | null
          disenador_nuevo_id?: number | null
          fecha_registro?: string
          id?: number
          ticket_id?: number
          usuario_registro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fkAsignacionLog_Ticket"
            columns: null
            isOneToOne: false
            referencedRelation: "Ticket"
            referencedColumns: null
          },
        ]
      }
      CampoFormulario: {
        Row: {
          ayuda: string | null
          clave: string
          estado: boolean
          etiqueta: string
          fecha_registro: string
          id: number
          obligatorio: boolean
          opciones: Json | null
          orden: number
          placeholder: string | null
          tipo_campo: string
          tipo_solicitud_id: number
          usuario_registro: number | null
          validaciones: Json | null
          valor_defecto: Json | null
        }
        Insert: {
          ayuda?: string | null
          clave: string
          estado?: boolean
          etiqueta: string
          fecha_registro?: string
          id?: never
          obligatorio?: boolean
          opciones?: Json | null
          orden?: number
          placeholder?: string | null
          tipo_campo: string
          tipo_solicitud_id: number
          usuario_registro?: number | null
          validaciones?: Json | null
          valor_defecto?: Json | null
        }
        Update: {
          ayuda?: string | null
          clave?: string
          estado?: boolean
          etiqueta?: string
          fecha_registro?: string
          id?: never
          obligatorio?: boolean
          opciones?: Json | null
          orden?: number
          placeholder?: string | null
          tipo_campo?: string
          tipo_solicitud_id?: number
          usuario_registro?: number | null
          validaciones?: Json | null
          valor_defecto?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fkCampoFormulario_TipoSolicitud"
            columns: null
            isOneToOne: false
            referencedRelation: "TipoSolicitud"
            referencedColumns: null
          },
        ]
      }
      Campus: {
        Row: {
          estado: boolean
          id: number
          nombre: string
          orden: number
          siglas: string | null
        }
        Insert: {
          estado?: boolean
          id?: never
          nombre: string
          orden?: number
          siglas?: string | null
        }
        Update: {
          estado?: boolean
          id?: never
          nombre?: string
          orden?: number
          siglas?: string | null
        }
        Relationships: []
      }
      DictamenJefe: {
        Row: {
          comentario: string | null
          decision: string
          fecha_dictamen: string
          id: number
          jefe_id: number
          ticket_id: number
        }
        Insert: {
          comentario?: string | null
          decision: string
          fecha_dictamen?: string
          id?: number
          jefe_id?: number
          ticket_id: number
        }
        Update: {
          comentario?: string | null
          decision?: string
          fecha_dictamen?: string
          id?: number
          jefe_id?: number
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fkDictamenJefe_Ticket"
            columns: null
            isOneToOne: false
            referencedRelation: "Ticket"
            referencedColumns: null
          },
        ]
      }
      Entregables: {
        Row: {
          descripcion: string | null
          disenador_id: number
          estado_id: number
          fecha_subida: string
          id: number
          ticket_id: number
          tipo_entregable: string
          url_o_ruta: string
          version: number
        }
        Insert: {
          descripcion?: string | null
          disenador_id?: number
          estado_id?: number
          fecha_subida?: string
          id?: number
          ticket_id: number
          tipo_entregable: string
          url_o_ruta: string
          version?: number
        }
        Update: {
          descripcion?: string | null
          disenador_id?: number
          estado_id?: number
          fecha_subida?: string
          id?: number
          ticket_id?: number
          tipo_entregable?: string
          url_o_ruta?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fkEntregable_Estado"
            columns: null
            isOneToOne: false
            referencedRelation: "Estado"
            referencedColumns: null
          },
          {
            foreignKeyName: "fkEntregable_Ticket"
            columns: null
            isOneToOne: false
            referencedRelation: "Ticket"
            referencedColumns: null
          },
        ]
      }
      EnvioIA: {
        Row: {
          comentario: string | null
          fecha_registro: string
          id: number
          intento: number
          nombre_archivo: string
          ruta_archivo: string
          ticket_id: number
          tipo_mime: string | null
          usuario_registro: number
        }
        Insert: {
          comentario?: string | null
          fecha_registro?: string
          id?: never
          intento: number
          nombre_archivo: string
          ruta_archivo: string
          ticket_id: number
          tipo_mime?: string | null
          usuario_registro: number
        }
        Update: {
          comentario?: string | null
          fecha_registro?: string
          id?: never
          intento?: number
          nombre_archivo?: string
          ruta_archivo?: string
          ticket_id?: number
          tipo_mime?: string | null
          usuario_registro?: number
        }
        Relationships: [
          {
            foreignKeyName: "fkEnvioIA_Ticket"
            columns: null
            isOneToOne: false
            referencedRelation: "Ticket"
            referencedColumns: null
          },
        ]
      }
      Estado: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      Feriados: {
        Row: {
          estado: boolean
          fecha_fin: string
          fecha_inicio: string
          fecha_registro: string
          id: number
          nombre: string
          usuario_registro: number | null
        }
        Insert: {
          estado?: boolean
          fecha_fin: string
          fecha_inicio: string
          fecha_registro?: string
          id?: never
          nombre: string
          usuario_registro?: number | null
        }
        Update: {
          estado?: boolean
          fecha_fin?: string
          fecha_inicio?: string
          fecha_registro?: string
          id?: never
          nombre?: string
          usuario_registro?: number | null
        }
        Relationships: []
      }
      FormularioCampus: {
        Row: {
          campus_id: number
          formulario_id: number
        }
        Insert: {
          campus_id: number
          formulario_id: number
        }
        Update: {
          campus_id?: number
          formulario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioCampus_Campus"
            columns: null
            isOneToOne: false
            referencedRelation: "Campus"
            referencedColumns: null
          },
          {
            foreignKeyName: "fkFormularioCampus_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      Formularios: {
        Row: {
          campos_snapshot: Json
          dirigido_a: string
          fecha_creacion: string
          fecha_evento: string
          id: number
          respuestas: Json
          tipo_solicitud_id: number
          titulo: string
        }
        Insert: {
          campos_snapshot?: Json
          dirigido_a: string
          fecha_creacion?: string
          fecha_evento: string
          id?: number
          respuestas?: Json
          tipo_solicitud_id: number
          titulo: string
        }
        Update: {
          campos_snapshot?: Json
          dirigido_a?: string
          fecha_creacion?: string
          fecha_evento?: string
          id?: number
          respuestas?: Json
          tipo_solicitud_id?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormulario_TipoSolicitud"
            columns: null
            isOneToOne: false
            referencedRelation: "TipoSolicitud"
            referencedColumns: null
          },
        ]
      }
      Notificaciones: {
        Row: {
          fecha: string
          id: number
          mensaje: string
          ticket_id: number | null
          usuario_id: number
          visto: boolean
        }
        Insert: {
          fecha?: string
          id?: number
          mensaje: string
          ticket_id?: number | null
          usuario_id: number
          visto?: boolean
        }
        Update: {
          fecha?: string
          id?: number
          mensaje?: string
          ticket_id?: number | null
          usuario_id?: number
          visto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fkNotificacion_Ticket"
            columns: null
            isOneToOne: false
            referencedRelation: "Ticket"
            referencedColumns: null
          },
        ]
      }
      RevisionIA: {
        Row: {
          comentario: string | null
          decision: string
          envio_id: number
          fecha_revision: string
          id: number
          revisor_id: number
          ticket_id: number
        }
        Insert: {
          comentario?: string | null
          decision: string
          envio_id: number
          fecha_revision?: string
          id?: never
          revisor_id: number
          ticket_id: number
        }
        Update: {
          comentario?: string | null
          decision?: string
          envio_id?: number
          fecha_revision?: string
          id?: never
          revisor_id?: number
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fkRevisionIA_Envio"
            columns: null
            isOneToOne: false
            referencedRelation: "EnvioIA"
            referencedColumns: null
          },
          {
            foreignKeyName: "fkRevisionIA_Ticket"
            columns: null
            isOneToOne: false
            referencedRelation: "Ticket"
            referencedColumns: null
          },
        ]
      }
      Ticket: {
        Row: {
          aprobado_automatico: boolean
          area_id: number
          asignado_por: number | null
          codigo: string
          disenador_id: number | null
          es_excepcional: boolean
          estado_id: number
          excepcional_estado: string | null
          excepcional_fecha_respuesta: string | null
          excepcional_motivo_rechazo: string | null
          excepcional_respondido_por: number | null
          fecha_asignacion: string | null
          fecha_entrega_diseno: string | null
          fecha_limite: string
          fecha_registro: string
          formulario_id: number
          id: number
          tipo_solicitud_id: number
          usuario_registro: number
        }
        Insert: {
          aprobado_automatico?: boolean
          area_id: number
          asignado_por?: number | null
          codigo: string
          disenador_id?: number | null
          es_excepcional?: boolean
          estado_id: number
          excepcional_estado?: string | null
          excepcional_fecha_respuesta?: string | null
          excepcional_motivo_rechazo?: string | null
          excepcional_respondido_por?: number | null
          fecha_asignacion?: string | null
          fecha_entrega_diseno?: string | null
          fecha_limite: string
          fecha_registro?: string
          formulario_id: number
          id?: number
          tipo_solicitud_id: number
          usuario_registro: number
        }
        Update: {
          aprobado_automatico?: boolean
          area_id?: number
          asignado_por?: number | null
          codigo?: string
          disenador_id?: number | null
          es_excepcional?: boolean
          estado_id?: number
          excepcional_estado?: string | null
          excepcional_fecha_respuesta?: string | null
          excepcional_motivo_rechazo?: string | null
          excepcional_respondido_por?: number | null
          fecha_asignacion?: string | null
          fecha_entrega_diseno?: string | null
          fecha_limite?: string
          fecha_registro?: string
          formulario_id?: number
          id?: number
          tipo_solicitud_id?: number
          usuario_registro?: number
        }
        Relationships: [
          {
            foreignKeyName: "fkTicket_Estado"
            columns: null
            isOneToOne: false
            referencedRelation: "Estado"
            referencedColumns: null
          },
          {
            foreignKeyName: "fkTicket_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
          {
            foreignKeyName: "fkTicket_TipoSolicitud"
            columns: null
            isOneToOne: false
            referencedRelation: "TipoSolicitud"
            referencedColumns: null
          },
        ]
      }
      TicketLog: {
        Row: {
          descripcion_cambio: string
          fecha_registro: string
          id: number
          numero_version: number
          ticket_id: number
          usuario_registro: number | null
        }
        Insert: {
          descripcion_cambio: string
          fecha_registro?: string
          id?: number
          numero_version: number
          ticket_id: number
          usuario_registro?: number | null
        }
        Update: {
          descripcion_cambio?: string
          fecha_registro?: string
          id?: number
          numero_version?: number
          ticket_id?: number
          usuario_registro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fkTicketLog_Ticket"
            columns: null
            isOneToOne: false
            referencedRelation: "Ticket"
            referencedColumns: null
          },
        ]
      }
      TipoSolicitud: {
        Row: {
          descripcion: string | null
          dias_estimados: number
          dias_habiles: boolean
          estado: boolean
          fecha_registro: string
          flujo: string
          id: number
          nombre: string
          usuario_registro: number | null
        }
        Insert: {
          descripcion?: string | null
          dias_estimados?: number
          dias_habiles?: boolean
          estado?: boolean
          fecha_registro?: string
          flujo?: string
          id?: number
          nombre: string
          usuario_registro?: number | null
        }
        Update: {
          descripcion?: string | null
          dias_estimados?: number
          dias_habiles?: boolean
          estado?: boolean
          fecha_registro?: string
          flujo?: string
          id?: number
          nombre?: string
          usuario_registro?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_AsignacionLog: {
        Row: {
          accion: string | null
          area: string | null
          codigo: string | null
          disenador_anterior: string | null
          disenador_anterior_id: number | null
          disenador_nuevo: string | null
          disenador_nuevo_id: number | null
          fecha_registro: string | null
          id: number | null
          realizado_por: string | null
          ticket_id: number | null
          tipo_solicitud: string | null
          usuario_registro: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fkAsignacionLog_Ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "Ticket"
            referencedColumns: null
          },
        ]
      }
      vw_TicketsEstadoReal: {
        Row: {
          aprobado_automatico: boolean | null
          area: string | null
          area_id: number | null
          asignado_por: number | null
          asignado_por_asignador: boolean | null
          asignado_por_nombre: string | null
          codigo: string | null
          correcciones_maximas: number | null
          correcciones_usadas: number | null
          dirigido_a: string | null
          disenador: string | null
          disenador_id: number | null
          es_excepcional: boolean | null
          estado_real: string | null
          estado_registrado: string | null
          excepcional_estado: string | null
          excepcional_motivo_rechazo: string | null
          fecha_aprobacion_automatica: string | null
          fecha_asignacion: string | null
          fecha_entrega_diseno: string | null
          fecha_evento: string | null
          fecha_limite: string | null
          fecha_registro: string | null
          flujo: string | null
          fuera_de_plazo: boolean | null
          intentos_usados: number | null
          minutos_habiles_restantes_dictamen: number | null
          solicitante: string | null
          ticket_id: number | null
          tipo_solicitud: string | null
          tipo_solicitud_id: number | null
          titulo: string | null
          usuario_registro: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fkTicket_TipoSolicitud"
            columns: ["tipo_solicitud_id"]
            isOneToOne: false
            referencedRelation: "TipoSolicitud"
            referencedColumns: null
          },
        ]
      }
    }
    Functions: {
      fnAprobarTicketsAutomaticamente: { Args: never; Returns: number }
      fnEsDiaHabilEscalar: { Args: { p_dia: string }; Returns: boolean }
      fnEsHorarioHabilEscalar: {
        Args: { p_momento?: string }
        Returns: boolean
      }
      fnEstadisticasTicketsTabla: {
        Args: {
          p_area_id?: number
          p_desde?: string
          p_hasta?: string
          p_tipo_solicitud_id?: number
        }
        Returns: {
          aprobado_automatico: boolean
          area: string
          codigo: string
          correcciones_usadas: number
          dias_resolucion: number
          disenador: string
          entregado_a_tiempo: boolean
          es_excepcional: boolean
          estado_real: string
          fecha_entrega_diseno: string
          fecha_evento: string
          fecha_limite: string
          fecha_registro: string
          flujo: string
          intentos_usados: number
          ticket_id: number
          tipo_solicitud: string
        }[]
      }
      fnFechaEventoMinimaEscalar: {
        Args: { p_excepcional?: boolean; p_tipo_solicitud_id: number }
        Returns: string
      }
      fnFechaLimiteCalcularEscalar: {
        Args: { p_tipo_solicitud_id: number }
        Returns: string
      }
      fnLiberarTicketsDisenadorEscalar: {
        Args: { p_motivo: string; p_usuario_id: number }
        Returns: number
      }
      fnMinutosHabilesEntreEscalar: {
        Args: { p_desde: string; p_hasta: string }
        Returns: number
      }
      fnObtenerEstadoIdEscalar: { Args: { p_nombre: string }; Returns: number }
      fnPuedeVerAsignacionEscalar: {
        Args: { p_area_id: number }
        Returns: boolean
      }
      fnRechazarExcepcionalesVencidas: { Args: never; Returns: number }
      fnSolicitudCrearEscalar: {
        Args: {
          p_detalle: Json
          p_excepcional?: boolean
          p_tipo_solicitud_id: number
        }
        Returns: number
      }
      fnSolicitudExcepcionalResponderEscalar: {
        Args: {
          p_aceptar: boolean
          p_disenador_id?: number
          p_motivo?: string
          p_ticket_id: number
        }
        Returns: undefined
      }
      fnSumarDiasHabilesEscalar: {
        Args: { p_desde: string; p_dias: number }
        Returns: string
      }
      fnSumarHorasHabilesEscalar: {
        Args: { p_desde: string; p_horas: number }
        Returns: string
      }
      fnTicketIdDesdeRutaEscalar: { Args: { p_ruta: string }; Returns: number }
      fnTipoSolicitudFlujoEscalar: {
        Args: { p_tipo_solicitud_id: number }
        Returns: string
      }
      fnVentanaAprobacionVencidaEscalar: {
        Args: { p_fecha_entrega_diseno: string }
        Returns: boolean
      }
      fnVerificarTicketsRetrasados: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  Seguridad: {
    Enums: {},
  },
  Solicitudes: {
    Enums: {},
  },
} as const
