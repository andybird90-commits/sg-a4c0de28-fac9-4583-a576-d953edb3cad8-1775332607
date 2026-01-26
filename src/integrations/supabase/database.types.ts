/* eslint-disable @typescript-eslint/no-empty-object-type */
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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      evidence_files: {
        Row: {
          created_at: string | null
          evidence_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          evidence_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          evidence_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          claim_year: number | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          org_id: string
          project_id: string | null
          tag: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          claim_year?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          org_id: string
          project_id?: string | null
          tag?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          claim_year?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          org_id?: string
          project_id?: string | null
          tag?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feasibility_analyses: {
        Row: {
          commercial_rating: string | null
          commercial_reasoning: string | null
          created_at: string | null
          delivery_complexity: string | null
          delivery_dependencies: Json | null
          delivery_timeframe_months: number | null
          id: string
          idea_description: string
          idea_title: string | null
          next_actions: Json | null
          notable_risks: Json | null
          organisation_id: string
          project_id: string | null
          rd_tax_flag: string | null
          rd_tax_reasoning: string | null
          regulatory_issues: Json | null
          revenue_ideas: Json | null
          sector: string | null
          sector_guess: string | null
          stage: string | null
          summary: string | null
          target_customers: Json | null
          technical_constraints: Json | null
          technical_rating: string | null
          technical_reasoning: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          commercial_rating?: string | null
          commercial_reasoning?: string | null
          created_at?: string | null
          delivery_complexity?: string | null
          delivery_dependencies?: Json | null
          delivery_timeframe_months?: number | null
          id?: string
          idea_description: string
          idea_title?: string | null
          next_actions?: Json | null
          notable_risks?: Json | null
          organisation_id: string
          project_id?: string | null
          rd_tax_flag?: string | null
          rd_tax_reasoning?: string | null
          regulatory_issues?: Json | null
          revenue_ideas?: Json | null
          sector?: string | null
          sector_guess?: string | null
          stage?: string | null
          summary?: string | null
          target_customers?: Json | null
          technical_constraints?: Json | null
          technical_rating?: string | null
          technical_reasoning?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          commercial_rating?: string | null
          commercial_reasoning?: string | null
          created_at?: string | null
          delivery_complexity?: string | null
          delivery_dependencies?: Json | null
          delivery_timeframe_months?: number | null
          id?: string
          idea_description?: string
          idea_title?: string | null
          next_actions?: Json | null
          notable_risks?: Json | null
          organisation_id?: string
          project_id?: string | null
          rd_tax_flag?: string | null
          rd_tax_reasoning?: string | null
          regulatory_issues?: Json | null
          revenue_ideas?: Json | null
          sector?: string | null
          sector_guess?: string | null
          stage?: string | null
          summary?: string | null
          target_customers?: Json | null
          technical_constraints?: Json | null
          technical_rating?: string | null
          technical_reasoning?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_analyses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sidekick_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          org_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          org_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invite_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_users: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          is_conexa_company: boolean
          linked_at: string | null
          linked_by_user_id: string | null
          linked_conexa_company_id: string | null
          linked_conexa_company_name: string | null
          name: string
          organisation_code: string
          sidekick_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_conexa_company?: boolean
          linked_at?: string | null
          linked_by_user_id?: string | null
          linked_conexa_company_id?: string | null
          linked_conexa_company_name?: string | null
          name: string
          organisation_code: string
          sidekick_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_conexa_company?: boolean
          linked_at?: string | null
          linked_by_user_id?: string | null
          linked_conexa_company_id?: string | null
          linked_conexa_company_name?: string | null
          name?: string
          organisation_code?: string
          sidekick_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisations_linked_conexa_company_id_fkey"
            columns: ["linked_conexa_company_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          claim_year: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          claim_year?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          claim_year?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      rd_claim_evidence: {
        Row: {
          attached_by: string | null
          claim_id: string
          created_at: string
          description: string | null
          id: string
          org_id: string
          project_id: string | null
          sidekick_evidence_id: string
          tag: string | null
          type: string
        }
        Insert: {
          attached_by?: string | null
          claim_id: string
          created_at?: string
          description?: string | null
          id?: string
          org_id: string
          project_id?: string | null
          sidekick_evidence_id: string
          tag?: string | null
          type: string
        }
        Update: {
          attached_by?: string | null
          claim_id?: string
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string
          project_id?: string | null
          sidekick_evidence_id?: string
          tag?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rd_claim_evidence_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rd_claim_evidence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sidekick_evidence_items: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          external_url: string | null
          file_path: string | null
          id: string
          project_id: string
          rd_internal_only: boolean
          sidekick_visible: boolean
          tags: string[] | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          project_id: string
          rd_internal_only?: boolean
          sidekick_visible?: boolean
          tags?: string[] | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          project_id?: string
          rd_internal_only?: boolean
          sidekick_visible?: boolean
          tags?: string[] | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sidekick_evidence_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sidekick_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sidekick_project_comments: {
        Row: {
          author_id: string
          author_role: string
          body: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          author_id: string
          author_role: string
          body: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          author_id?: string
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sidekick_project_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sidekick_project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sidekick_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sidekick_projects: {
        Row: {
          company_id: string
          conexa_project_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          ready_for_review_at: string | null
          reviewed_by_user_id: string | null
          sector: string | null
          stage: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          conexa_project_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          ready_for_review_at?: string | null
          reviewed_by_user_id?: string | null
          sector?: string | null
          stage?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          conexa_project_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          ready_for_review_at?: string | null
          reviewed_by_user_id?: string | null
          sector?: string | null
          stage?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sidekick_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_client: { Args: { _org_id: string }; Returns: boolean }
      is_org_employee: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
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
