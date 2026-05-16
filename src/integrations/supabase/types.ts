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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          email: string
          is_superadmin: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          is_superadmin?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          is_superadmin?: boolean
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      customer: {
        Row: {
          address: string | null
          cust_name: string
          cust_no: string
          payment_terms: string | null
        }
        Insert: {
          address?: string | null
          cust_name: string
          cust_no: string
          payment_terms?: string | null
        }
        Update: {
          address?: string | null
          cust_name?: string
          cust_no?: string
          payment_terms?: string | null
        }
        Relationships: []
      }
      employee: {
        Row: {
          birth_date: string | null
          emp_no: string
          first_name: string
          gender: string | null
          hire_date: string | null
          last_name: string
          termination_date: string | null
        }
        Insert: {
          birth_date?: string | null
          emp_no: string
          first_name: string
          gender?: string | null
          hire_date?: string | null
          last_name: string
          termination_date?: string | null
        }
        Update: {
          birth_date?: string | null
          emp_no?: string
          first_name?: string
          gender?: string | null
          hire_date?: string | null
          last_name?: string
          termination_date?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          value: number
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          value?: number
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          mod_code: string
          mod_name: string
        }
        Insert: {
          mod_code: string
          mod_name: string
        }
        Update: {
          mod_code?: string
          mod_name?: string
        }
        Relationships: []
      }
      price_hist: {
        Row: {
          effective_date: string
          id: string
          prod_no: string
          unit_price: number
        }
        Insert: {
          effective_date: string
          id?: string
          prod_no: string
          unit_price: number
        }
        Update: {
          effective_date?: string
          id?: string
          prod_no?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_hist_prod_no_fkey"
            columns: ["prod_no"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["prod_no"]
          },
        ]
      }
      product: {
        Row: {
          category: string | null
          prod_name: string
          prod_no: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          prod_name: string
          prod_no: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          prod_name?: string
          prod_no?: string
          unit?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked: boolean
          created_at: string
          email_signature: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          email_signature?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          email_signature?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rights: {
        Row: {
          mod_code: string
          right_code: string
          right_name: string
        }
        Insert: {
          mod_code: string
          right_code: string
          right_name: string
        }
        Update: {
          mod_code?: string
          right_code?: string
          right_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rights_mod_code_fkey"
            columns: ["mod_code"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["mod_code"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          cust_no: string | null
          emp_no: string | null
          record_status: string
          sales_date: string
          trans_no: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cust_no?: string | null
          emp_no?: string | null
          record_status?: string
          sales_date: string
          trans_no: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cust_no?: string | null
          emp_no?: string | null
          record_status?: string
          sales_date?: string
          trans_no?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_cust_no_fkey"
            columns: ["cust_no"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["cust_no"]
          },
          {
            foreignKeyName: "sales_emp_no_fkey"
            columns: ["emp_no"]
            isOneToOne: false
            referencedRelation: "employee"
            referencedColumns: ["emp_no"]
          },
        ]
      }
      sales_detail: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          prod_no: string
          qty: number
          record_status: string
          trans_no: string
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          prod_no: string
          qty: number
          record_status?: string
          trans_no: string
          unit_price: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          prod_no?: string
          qty?: number
          record_status?: string
          trans_no?: string
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_detail_prod_no_fkey"
            columns: ["prod_no"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["prod_no"]
          },
          {
            foreignKeyName: "sales_detail_trans_no_fkey"
            columns: ["trans_no"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["trans_no"]
          },
        ]
      }
      user_module: {
        Row: {
          mod_code: string
          user_id: string
        }
        Insert: {
          mod_code: string
          user_id: string
        }
        Update: {
          mod_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_mod_code_fkey"
            columns: ["mod_code"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["mod_code"]
          },
          {
            foreignKeyName: "user_module_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_module_rights: {
        Row: {
          granted: boolean
          right_code: string
          user_id: string
        }
        Insert: {
          granted?: boolean
          right_code: string
          user_id: string
        }
        Update: {
          granted?: boolean
          right_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_rights_right_code_fkey"
            columns: ["right_code"]
            isOneToOne: false
            referencedRelation: "rights"
            referencedColumns: ["right_code"]
          },
          {
            foreignKeyName: "user_module_rights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_right: { Args: { _right: string; _user: string }; Returns: boolean }
      is_superadmin: { Args: { _user: string }; Returns: boolean }
    }
    Enums: {
      activity_type: "call" | "email" | "meeting" | "note"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal_sent"
        | "negotiation"
        | "won"
        | "lost"
        | "archived"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: ["call", "email", "meeting", "note"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal_sent",
        "negotiation",
        "won",
        "lost",
        "archived",
      ],
    },
  },
} as const
