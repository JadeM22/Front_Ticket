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
        }
        Insert: {
          area_id?: number | null
          auth_id?: string | null
          correo: string
          debe_cambiar_password?: boolean
          estado?: boolean
          id?: number
          nombre: string
        }
        Update: {
          area_id?: number | null
          auth_id?: string | null
          correo?: string
          debe_cambiar_password?: boolean
          estado?: boolean
          id?: number
          nombre?: string
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
      [_ in never]: never
    }
    Functions: {
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
      FormularioArte: {
        Row: {
          alcance: string | null
          aplica_articulo_140: boolean
          enlace_qr: string | null
          fecha: string | null
          formulario_id: number
          hora_fin: string | null
          hora_inicio: string | null
          informacion_adicional: string | null
          logotipos: string[]
          lugar: string | null
          modalidad: string | null
          titulo: string
        }
        Insert: {
          alcance?: string | null
          aplica_articulo_140?: boolean
          enlace_qr?: string | null
          fecha?: string | null
          formulario_id: number
          hora_fin?: string | null
          hora_inicio?: string | null
          informacion_adicional?: string | null
          logotipos?: string[]
          lugar?: string | null
          modalidad?: string | null
          titulo: string
        }
        Update: {
          alcance?: string | null
          aplica_articulo_140?: boolean
          enlace_qr?: string | null
          fecha?: string | null
          formulario_id?: number
          hora_fin?: string | null
          hora_inicio?: string | null
          informacion_adicional?: string | null
          logotipos?: string[]
          lugar?: string | null
          modalidad?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioArte_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      FormularioDircom: {
        Row: {
          fecha_necesaria: string
          formulario_id: number
          informacion_valor: string
          logotipos: string[]
          necesita_dictamen: boolean
          tipo_material: string
        }
        Insert: {
          fecha_necesaria: string
          formulario_id: number
          informacion_valor: string
          logotipos?: string[]
          necesita_dictamen?: boolean
          tipo_material: string
        }
        Update: {
          fecha_necesaria?: string
          formulario_id?: number
          informacion_valor?: string
          logotipos?: string[]
          necesita_dictamen?: boolean
          tipo_material?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioDircom_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      FormularioGenerico: {
        Row: {
          descripcion: string
          fecha_requerida: string | null
          formulario_id: number
          informacion_producto: string | null
          logotipos: string[]
          observaciones: string | null
          titulo: string
        }
        Insert: {
          descripcion: string
          fecha_requerida?: string | null
          formulario_id: number
          informacion_producto?: string | null
          logotipos?: string[]
          observaciones?: string | null
          titulo: string
        }
        Update: {
          descripcion?: string
          fecha_requerida?: string | null
          formulario_id?: number
          informacion_producto?: string | null
          logotipos?: string[]
          observaciones?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioGenerico_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      FormularioProtocolo: {
        Row: {
          cantidad_invitados: number | null
          elaborar_invitacion: boolean
          equipo_requerido: string | null
          fecha: string
          formulario_id: number
          hora: string
          informacion_programa: string | null
          lugar_propuesto: string
          maestro_ceremonia_preferido: string | null
          necesita_edecanes: boolean
          necesita_maestro_ceremonia: boolean
          necesita_pumas: boolean
          nombre_actividad: string
        }
        Insert: {
          cantidad_invitados?: number | null
          elaborar_invitacion?: boolean
          equipo_requerido?: string | null
          fecha: string
          formulario_id: number
          hora: string
          informacion_programa?: string | null
          lugar_propuesto: string
          maestro_ceremonia_preferido?: string | null
          necesita_edecanes?: boolean
          necesita_maestro_ceremonia?: boolean
          necesita_pumas?: boolean
          nombre_actividad: string
        }
        Update: {
          cantidad_invitados?: number | null
          elaborar_invitacion?: boolean
          equipo_requerido?: string | null
          fecha?: string
          formulario_id?: number
          hora?: string
          informacion_programa?: string | null
          lugar_propuesto?: string
          maestro_ceremonia_preferido?: string | null
          necesita_edecanes?: boolean
          necesita_maestro_ceremonia?: boolean
          necesita_pumas?: boolean
          nombre_actividad?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioProtocolo_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      Formularios: {
        Row: {
          fecha_creacion: string
          id: number
          tipo_solicitud_id: number
        }
        Insert: {
          fecha_creacion?: string
          id?: number
          tipo_solicitud_id: number
        }
        Update: {
          fecha_creacion?: string
          id?: number
          tipo_solicitud_id?: number
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
      FormularioVideo: {
        Row: {
          encargado_actividad: string
          fecha_entrega_publicacion: string
          formulario_id: number
          informacion_producto: string | null
          logotipos: string[]
          objetivo: string
          participacion_estudiantes: string
        }
        Insert: {
          encargado_actividad: string
          fecha_entrega_publicacion: string
          formulario_id: number
          informacion_producto?: string | null
          logotipos?: string[]
          objetivo: string
          participacion_estudiantes?: string
        }
        Update: {
          encargado_actividad?: string
          fecha_entrega_publicacion?: string
          formulario_id?: number
          informacion_producto?: string | null
          logotipos?: string[]
          objetivo?: string
          participacion_estudiantes?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioVideo_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
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
      Ticket: {
        Row: {
          aprobado_automatico: boolean
          area_id: number
          disenador_id: number | null
          estado_id: number
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
          disenador_id?: number | null
          estado_id: number
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
          disenador_id?: number | null
          estado_id?: number
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
          formulario: string
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
          formulario?: string
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
          formulario?: string
          id?: number
          nombre?: string
          usuario_registro?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_TicketsEstadoReal: {
        Row: {
          aprobado_automatico: boolean | null
          area: string | null
          correcciones_usadas: number | null
          disenador: string | null
          disenador_id: number | null
          estado_real: string | null
          estado_registrado: string | null
          fecha_aprobacion_automatica: string | null
          fecha_entrega_diseno: string | null
          fecha_limite: string | null
          fecha_registro: string | null
          fuera_de_plazo: boolean | null
          horas_restantes_dictamen: number | null
          solicitante: string | null
          ticket_id: number | null
          tipo_solicitud: string | null
          usuario_registro: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      fnAprobarTicketsAutomaticamente: { Args: never; Returns: number }
      fnEsDiaHabilEscalar: { Args: { p_dia: string }; Returns: boolean }
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
          correcciones_usadas: number
          dias_resolucion: number
          disenador: string
          entregado_a_tiempo: boolean
          estado_real: string
          fecha_entrega_diseno: string
          fecha_limite: string
          fecha_registro: string
          ticket_id: number
          tipo_solicitud: string
        }[]
      }
      fnFechaLimiteCalcularEscalar: {
        Args: { p_tipo_solicitud_id: number }
        Returns: string
      }
      fnObtenerEstadoIdEscalar: { Args: { p_nombre: string }; Returns: number }
      fnSolicitudCrearEscalar: {
        Args: { p_detalle: Json; p_tipo_solicitud_id: number }
        Returns: number
      }
      fnSumarDiasHabilesEscalar: {
        Args: { p_desde: string; p_dias: number }
        Returns: string
      }
      fnTicketIdDesdeRutaEscalar: { Args: { p_ruta: string }; Returns: number }
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
