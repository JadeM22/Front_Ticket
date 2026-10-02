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
        }
        Insert: {
          accion: string
          fecha_registro?: string
          id?: number
          rol_id: number
          usuario_id: number
        }
        Update: {
          accion?: string
          fecha_registro?: string
          id?: number
          rol_id?: number
          usuario_id?: number
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
      FormularioAfiche: {
        Row: {
          dimensiones: string
          formulario_id: number
          orientacion: string
          texto_principal: string
        }
        Insert: {
          dimensiones: string
          formulario_id: number
          orientacion: string
          texto_principal: string
        }
        Update: {
          dimensiones?: string
          formulario_id?: number
          orientacion?: string
          texto_principal?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioAfiche_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      FormularioAviso: {
        Row: {
          formulario_id: number
          medio_difusion: string
          titulo_aviso: string
          urgencia: string
        }
        Insert: {
          formulario_id: number
          medio_difusion: string
          titulo_aviso: string
          urgencia?: string
        }
        Update: {
          formulario_id?: number
          medio_difusion?: string
          titulo_aviso?: string
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioAviso_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      FormularioCoberturaEventos: {
        Row: {
          fecha_fin: string
          fecha_inicio: string
          formulario_id: number
          lugar: string
          nombre_evento: string
        }
        Insert: {
          fecha_fin: string
          fecha_inicio: string
          formulario_id: number
          lugar: string
          nombre_evento: string
        }
        Update: {
          fecha_fin?: string
          fecha_inicio?: string
          formulario_id?: number
          lugar?: string
          nombre_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioCoberturaEventos_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      FormularioComunicado: {
        Row: {
          contenido_comunicado: string
          dirigido_a: string
          formulario_id: number
          titulo: string
        }
        Insert: {
          contenido_comunicado: string
          dirigido_a: string
          formulario_id: number
          titulo: string
        }
        Update: {
          contenido_comunicado?: string
          dirigido_a?: string
          formulario_id?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioComunicado_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      FormularioEdicionFotografica: {
        Row: {
          cantidad_fotos: number
          enlace_drive: string
          estilo_edicion: string
          formulario_id: number
        }
        Insert: {
          cantidad_fotos: number
          enlace_drive: string
          estilo_edicion: string
          formulario_id: number
        }
        Update: {
          cantidad_fotos?: number
          enlace_drive?: string
          estilo_edicion?: string
          formulario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioEdicionFotografica_Formulario"
            columns: null
            isOneToOne: false
            referencedRelation: "Formularios"
            referencedColumns: null
          },
        ]
      }
      FormularioPublicacionRedesSociales: {
        Row: {
          formulario_id: number
          hora_sugerida: string | null
          plataformas: string[]
          texto_copy: string
        }
        Insert: {
          formulario_id: number
          hora_sugerida?: string | null
          plataformas: string[]
          texto_copy: string
        }
        Update: {
          formulario_id?: number
          hora_sugerida?: string | null
          plataformas?: string[]
          texto_copy?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkFormularioPublicacionRedesSociales_Formulario"
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
        }
        Insert: {
          descripcion_cambio: string
          fecha_registro?: string
          id?: number
          numero_version: number
          ticket_id: number
        }
        Update: {
          descripcion_cambio?: string
          fecha_registro?: string
          id?: number
          numero_version?: number
          ticket_id?: number
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
          dias_estimados: number
          estado: boolean
          id: number
          nombre: string
        }
        Insert: {
          dias_estimados?: number
          estado?: boolean
          id?: number
          nombre: string
        }
        Update: {
          dias_estimados?: number
          estado?: boolean
          id?: number
          nombre?: string
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
      fnObtenerEstadoIdEscalar: { Args: { p_nombre: string }; Returns: number }
      fnSolicitudCrearEscalar: {
        Args: { p_detalle: Json; p_tipo_solicitud_id: number }
        Returns: number
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
