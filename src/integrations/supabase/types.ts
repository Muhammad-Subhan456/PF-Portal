export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          roll_number: string | null
          name: string | null
          section: "CS-F26-M" | "CS-F26-A" | null
          is_admin: boolean
          created_at: string
          updated_at: string
          last_login: string | null
        }
        Insert: {
          id: string
          email: string
          roll_number?: string | null
          name?: string | null
          section?: "CS-F26-M" | "CS-F26-A" | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          email?: string
          roll_number?: string | null
          name?: string | null
          section?: "CS-F26-M" | "CS-F26-A" | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
      }
      enrolled_students: {
        Row: {
          id: string
          roll_number: string
          name: string
          section: "CS-F26-M" | "CS-F26-A"
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          roll_number: string
          name: string
          section: "CS-F26-M" | "CS-F26-A"
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          roll_number?: string
          name?: string
          section?: "A" | "B"
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      admins: {
        Row: {
          id: string
          email: string
          name: string
          added_by: string | null
          added_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          email: string
          name: string
          added_by?: string | null
          added_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          email?: string
          name?: string
          added_by?: string | null
          added_at?: string
          is_active?: boolean
        }
      }
      labs: {
        Row: {
          id: string
          lab_number: number
          title: string
          description: string | null
          taken_date: string | null
          deadline: string | null
          solution_visible_after: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lab_number: number
          title: string
          description?: string | null
          taken_date?: string | null
          deadline?: string | null
          solution_visible_after?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lab_number?: number
          title?: string
          description?: string | null
          taken_date?: string | null
          deadline?: string | null
          solution_visible_after?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lab_files: {
        Row: {
          id: string
          lab_id: string
          file_name: string
          file_url: string
          file_type: "problem" | "solution" | "starter_code" | "dataset"
          file_size: number | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          lab_id: string
          file_name: string
          file_url: string
          file_type: "problem" | "solution" | "starter_code" | "dataset"
          file_size?: number | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          lab_id?: string
          file_name?: string
          file_url?: string
          file_type?: "problem" | "solution" | "starter_code" | "dataset"
          file_size?: number | null
          uploaded_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          assignment_number: number
          title: string
          description: string | null
          submission_deadline: string | null
          status: "active" | "closed"
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_number: number
          title: string
          description?: string | null
          submission_deadline?: string | null
          status?: "active" | "closed"
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_number?: number
          title?: string
          description?: string | null
          submission_deadline?: string | null
          status?: "active" | "closed"
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assignment_files: {
        Row: {
          id: string
          assignment_id: string
          file_name: string
          file_url: string
          file_type: "problem" | "solution" | "instructions"
          file_size: number | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          file_name: string
          file_url: string
          file_type: "problem" | "solution" | "instructions"
          file_size?: number | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          file_name?: string
          file_url?: string
          file_type?: "problem" | "solution" | "instructions"
          file_size?: number | null
          uploaded_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          quiz_number: number
          title: string
          description: string | null
          scheduled_date: string | null
          taken_date: string | null
          status: "completed" | "upcoming"
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quiz_number: number
          title: string
          description?: string | null
          scheduled_date?: string | null
          taken_date?: string | null
          status?: "completed" | "upcoming"
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quiz_number?: number
          title?: string
          description?: string | null
          scheduled_date?: string | null
          taken_date?: string | null
          status?: "completed" | "upcoming"
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quiz_files: {
        Row: {
          id: string
          quiz_id: string
          file_name: string
          file_url: string
          file_type: "problem" | "solution"
          file_size: number | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          file_name: string
          file_url: string
          file_type: "problem" | "solution"
          file_size?: number | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          file_name?: string
          file_url?: string
          file_type?: "problem" | "solution"
          file_size?: number | null
          uploaded_at?: string
        }
      }
      grade_sheets: {
        Row: {
          id: string
          sheet_url: string
          sheet_id: string
          sheet_name: string | null
          section: "CS-F26-M" | "CS-F26-A" | null
          tabs: Json
          last_synced_at: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sheet_url: string
          sheet_id: string
          sheet_name?: string | null
          section?: "CS-F26-M" | "CS-F26-A" | null
          tabs: Json
          last_synced_at?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sheet_url?: string
          sheet_id?: string
          sheet_name?: string | null
          section?: "CS-F26-M" | "CS-F26-A" | null
          tabs?: Json
          last_synced_at?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      grade_data: {
        Row: {
          sheet_id: string
          tab_name: string
          roll_number: string
          data: Json
          synced_at: string
        }
        Insert: {
          sheet_id: string
          tab_name: string
          roll_number: string
          data: Json
          synced_at?: string
        }
        Update: {
          sheet_id?: string
          tab_name?: string
          roll_number?: string
          data?: Json
          synced_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      is_valid_pucit_email: {
        Args: {
          email: string
        }
        Returns: boolean
      }
      is_user_enrolled: {
        Args: {
          user_email: string
        }
        Returns: boolean
      }
      get_user_roll_number: {
        Args: {
          user_id: string
        }
        Returns: string
      }
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
    Enums: {},
  },
} as const
