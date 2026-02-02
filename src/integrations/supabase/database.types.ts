 
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
      cif_documents: {
        Row: {
          cif_id: string
          doc_type: string
          file_path: string
          id: string
          notes: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          cif_id: string
          doc_type: string
          file_path: string
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          cif_id?: string
          doc_type?: string
          file_path?: string
          id?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cif_documents_cif_id_fkey"
            columns: ["cif_id"]
            isOneToOne: false
            referencedRelation: "cif_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cif_records: {
        Row: {
          accountant_email: string | null
          accountant_firm: string | null
          accountant_name: string | null
          accountant_phone: string | null
          admin_last_updated: string | null
          apportionment_assumptions: string | null
          bdm_last_updated: string | null
          bdm_section_created_by: string | null
          business_background: string | null
          cif_status: string
          company_research: string | null
          consumables_estimate: number | null
          created_at: string
          current_stage: string | null
          director_comment: string | null
          director_decided_at: string | null
          director_decision: string | null
          director_id: string | null
          expected_feasibility_date: string | null
          finance_last_updated: string | null
          financial_section_created_by: string | null
          financial_year: string | null
          has_claimed_before: boolean | null
          id: string
          linked_claim_id: string | null
          org_id: string | null
          previous_claim_date_submitted: string | null
          previous_claim_value: number | null
          previous_claim_year_end_date: string | null
          primary_contact_email: string | null
          primary_contact_landline: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          primary_contact_position: string | null
          project_overview: string | null
          prospect_id: string
          rd_themes: string[] | null
          ready_to_submit: boolean | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_to_stage: string | null
          rejection_reason: string | null
          section1_completed_at: string | null
          section1_completed_by: string | null
          section2_feasibility_id: string | null
          section3_completed_at: string | null
          section3_completed_by: string | null
          section4_completed_at: string | null
          section4_completed_by: string | null
          software_estimate: number | null
          staff_cost_estimate: number | null
          subcontractor_estimate: number | null
          tech_last_updated: string | null
          tech_section_created_by: string | null
          updated_at: string
        }
        Insert: {
          accountant_email?: string | null
          accountant_firm?: string | null
          accountant_name?: string | null
          accountant_phone?: string | null
          admin_last_updated?: string | null
          apportionment_assumptions?: string | null
          bdm_last_updated?: string | null
          bdm_section_created_by?: string | null
          business_background?: string | null
          cif_status?: string
          company_research?: string | null
          consumables_estimate?: number | null
          created_at?: string
          current_stage?: string | null
          director_comment?: string | null
          director_decided_at?: string | null
          director_decision?: string | null
          director_id?: string | null
          expected_feasibility_date?: string | null
          finance_last_updated?: string | null
          financial_section_created_by?: string | null
          financial_year?: string | null
          has_claimed_before?: boolean | null
          id?: string
          linked_claim_id?: string | null
          org_id?: string | null
          previous_claim_date_submitted?: string | null
          previous_claim_value?: number | null
          previous_claim_year_end_date?: string | null
          primary_contact_email?: string | null
          primary_contact_landline?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_position?: string | null
          project_overview?: string | null
          prospect_id: string
          rd_themes?: string[] | null
          ready_to_submit?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_to_stage?: string | null
          rejection_reason?: string | null
          section1_completed_at?: string | null
          section1_completed_by?: string | null
          section2_feasibility_id?: string | null
          section3_completed_at?: string | null
          section3_completed_by?: string | null
          section4_completed_at?: string | null
          section4_completed_by?: string | null
          software_estimate?: number | null
          staff_cost_estimate?: number | null
          subcontractor_estimate?: number | null
          tech_last_updated?: string | null
          tech_section_created_by?: string | null
          updated_at?: string
        }
        Update: {
          accountant_email?: string | null
          accountant_firm?: string | null
          accountant_name?: string | null
          accountant_phone?: string | null
          admin_last_updated?: string | null
          apportionment_assumptions?: string | null
          bdm_last_updated?: string | null
          bdm_section_created_by?: string | null
          business_background?: string | null
          cif_status?: string
          company_research?: string | null
          consumables_estimate?: number | null
          created_at?: string
          current_stage?: string | null
          director_comment?: string | null
          director_decided_at?: string | null
          director_decision?: string | null
          director_id?: string | null
          expected_feasibility_date?: string | null
          finance_last_updated?: string | null
          financial_section_created_by?: string | null
          financial_year?: string | null
          has_claimed_before?: boolean | null
          id?: string
          linked_claim_id?: string | null
          org_id?: string | null
          previous_claim_date_submitted?: string | null
          previous_claim_value?: number | null
          previous_claim_year_end_date?: string | null
          primary_contact_email?: string | null
          primary_contact_landline?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_position?: string | null
          project_overview?: string | null
          prospect_id?: string
          rd_themes?: string[] | null
          ready_to_submit?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_to_stage?: string | null
          rejection_reason?: string | null
          section1_completed_at?: string | null
          section1_completed_by?: string | null
          section2_feasibility_id?: string | null
          section3_completed_at?: string | null
          section3_completed_by?: string | null
          section4_completed_at?: string | null
          section4_completed_by?: string | null
          software_estimate?: number | null
          staff_cost_estimate?: number | null
          subcontractor_estimate?: number | null
          tech_last_updated?: string | null
          tech_section_created_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cif_records_bdm_section_created_by_fkey"
            columns: ["bdm_section_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_financial_section_created_by_fkey"
            columns: ["financial_section_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_linked_claim_id_fkey"
            columns: ["linked_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_section1_completed_by_fkey"
            columns: ["section1_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_section2_feasibility_id_fkey"
            columns: ["section2_feasibility_id"]
            isOneToOne: false
            referencedRelation: "feasibility_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_section3_completed_by_fkey"
            columns: ["section3_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_section4_completed_by_fkey"
            columns: ["section4_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_tech_section_created_by_fkey"
            columns: ["tech_section_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cif_state_changes: {
        Row: {
          change_type: string
          changed_by: string
          cif_id: string
          comments: string | null
          created_at: string
          from_stage: string | null
          id: string
          to_stage: string
        }
        Insert: {
          change_type: string
          changed_by: string
          cif_id: string
          comments?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          to_stage: string
        }
        Update: {
          change_type?: string
          changed_by?: string
          cif_id?: string
          comments?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "cif_state_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_state_changes_cif_id_fkey"
            columns: ["cif_id"]
            isOneToOne: false
            referencedRelation: "cif_records"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_costs: {
        Row: {
          amount: number
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          claim_id: string
          cost_date: string | null
          cost_type: string
          created_at: string
          created_by: string | null
          description: string
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          invoice_reference: string | null
          notes: string | null
          org_id: string
          period_end: string | null
          period_start: string | null
          project_id: string | null
          staff_member_name: string | null
          staff_role: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          claim_id: string
          cost_date?: string | null
          cost_type: string
          created_at?: string
          created_by?: string | null
          description: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          invoice_reference?: string | null
          notes?: string | null
          org_id: string
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          staff_member_name?: string | null
          staff_role?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          claim_id?: string
          cost_date?: string | null
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          invoice_reference?: string | null
          notes?: string | null
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          staff_member_name?: string | null
          staff_role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_costs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_costs_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_costs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "claim_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_documents: {
        Row: {
          claim_id: string
          created_at: string
          description: string | null
          doc_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_confidential: boolean | null
          mime_type: string | null
          org_id: string
          project_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          description?: string | null
          doc_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean | null
          mime_type?: string | null
          org_id: string
          project_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          description?: string | null
          doc_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean | null
          mime_type?: string | null
          org_id?: string
          project_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "claim_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_projects: {
        Row: {
          advance_in_science: string | null
          challenges_uncertainties: string | null
          claim_id: string
          consumables_cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          org_id: string
          project_code: string | null
          qualifying_activities: string[] | null
          rd_theme: string | null
          software_cost: number | null
          staff_cost: number | null
          start_date: string | null
          status: string
          subcontractor_cost: number | null
          technical_reviewer: string | null
          technical_understanding: string | null
          total_qualifying_cost: number | null
          updated_at: string
        }
        Insert: {
          advance_in_science?: string | null
          challenges_uncertainties?: string | null
          claim_id: string
          consumables_cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          org_id: string
          project_code?: string | null
          qualifying_activities?: string[] | null
          rd_theme?: string | null
          software_cost?: number | null
          staff_cost?: number | null
          start_date?: string | null
          status?: string
          subcontractor_cost?: number | null
          technical_reviewer?: string | null
          technical_understanding?: string | null
          total_qualifying_cost?: number | null
          updated_at?: string
        }
        Update: {
          advance_in_science?: string | null
          challenges_uncertainties?: string | null
          claim_id?: string
          consumables_cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          org_id?: string
          project_code?: string | null
          qualifying_activities?: string[] | null
          rd_theme?: string | null
          software_cost?: number | null
          staff_cost?: number | null
          start_date?: string | null
          status?: string
          subcontractor_cost?: number | null
          technical_reviewer?: string | null
          technical_understanding?: string | null
          total_qualifying_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_projects_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_projects_technical_reviewer_fkey"
            columns: ["technical_reviewer"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          actual_submission_date: string | null
          bd_owner_id: string | null
          claim_year: number
          cost_lead_id: string | null
          created_at: string
          director_id: string | null
          engagement_id: string | null
          expected_submission_date: string | null
          hmrc_reference: string | null
          id: string
          notes: string | null
          ops_owner_id: string | null
          org_id: string
          period_end: string | null
          period_start: string | null
          status: string
          technical_lead_id: string | null
          updated_at: string
        }
        Insert: {
          actual_submission_date?: string | null
          bd_owner_id?: string | null
          claim_year: number
          cost_lead_id?: string | null
          created_at?: string
          director_id?: string | null
          engagement_id?: string | null
          expected_submission_date?: string | null
          hmrc_reference?: string | null
          id?: string
          notes?: string | null
          ops_owner_id?: string | null
          org_id: string
          period_end?: string | null
          period_start?: string | null
          status?: string
          technical_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_submission_date?: string | null
          bd_owner_id?: string | null
          claim_year?: number
          cost_lead_id?: string | null
          created_at?: string
          director_id?: string | null
          engagement_id?: string | null
          expected_submission_date?: string | null
          hmrc_reference?: string | null
          id?: string
          notes?: string | null
          ops_owner_id?: string | null
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
          technical_lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_bd_owner_id_fkey"
            columns: ["bd_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_cost_lead_id_fkey"
            columns: ["cost_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_ops_owner_id_fkey"
            columns: ["ops_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_technical_lead_id_fkey"
            columns: ["technical_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          is_read: boolean
          mentioned_user_id: string
          read_at: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_user_id: string
          read_at?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_user_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "internal_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          created_at: string
          created_by: string
          end_date: string | null
          fee_model: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date?: string | null
          fee_model?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          fee_model?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
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
          estimated_claim_band: string | null
          feasibility_status: string | null
          id: string
          idea_description: string
          idea_title: string | null
          missing_information_flags: string[] | null
          next_actions: Json | null
          notable_risks: Json | null
          notes_for_finance: string | null
          organisation_id: string
          project_id: string | null
          rd_tax_flag: string | null
          rd_tax_reasoning: string | null
          regulatory_issues: Json | null
          revenue_ideas: Json | null
          risk_rating: string | null
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
          estimated_claim_band?: string | null
          feasibility_status?: string | null
          id?: string
          idea_description: string
          idea_title?: string | null
          missing_information_flags?: string[] | null
          next_actions?: Json | null
          notable_risks?: Json | null
          notes_for_finance?: string | null
          organisation_id: string
          project_id?: string | null
          rd_tax_flag?: string | null
          rd_tax_reasoning?: string | null
          regulatory_issues?: Json | null
          revenue_ideas?: Json | null
          risk_rating?: string | null
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
          estimated_claim_band?: string | null
          feasibility_status?: string | null
          id?: string
          idea_description?: string
          idea_title?: string | null
          missing_information_flags?: string[] | null
          next_actions?: Json | null
          notable_risks?: Json | null
          notes_for_finance?: string | null
          organisation_id?: string
          project_id?: string | null
          rd_tax_flag?: string | null
          rd_tax_reasoning?: string | null
          regulatory_issues?: Json | null
          revenue_ideas?: Json | null
          risk_rating?: string | null
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
      internal_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          payload_json: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          payload_json: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          payload_json?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      pipeline_entries: {
        Row: {
          claim_id: string | null
          created_at: string
          created_by: string
          engagement_id: string | null
          estimated_qualifying_spend: number | null
          expected_accounts_filing_date: string | null
          expected_fee: number | null
          expected_submission_date: string | null
          filing_pattern: string | null
          id: string
          notes: string | null
          org_id: string
          period_label: string | null
          predictor_confidence: string | null
          predictor_last_run_at: string | null
          probability: number | null
          updated_at: string
          weighted_fee: number | null
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          created_by: string
          engagement_id?: string | null
          estimated_qualifying_spend?: number | null
          expected_accounts_filing_date?: string | null
          expected_fee?: number | null
          expected_submission_date?: string | null
          filing_pattern?: string | null
          id?: string
          notes?: string | null
          org_id: string
          period_label?: string | null
          predictor_confidence?: string | null
          predictor_last_run_at?: string | null
          probability?: number | null
          updated_at?: string
          weighted_fee?: number | null
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          created_by?: string
          engagement_id?: string | null
          estimated_qualifying_spend?: number | null
          expected_accounts_filing_date?: string | null
          expected_fee?: number | null
          expected_submission_date?: string | null
          filing_pattern?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          period_label?: string | null
          predictor_confidence?: string | null
          predictor_last_run_at?: string | null
          probability?: number | null
          updated_at?: string
          weighted_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_entries_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_entries_org_id_fkey"
            columns: ["org_id"]
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
          internal_role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          internal_role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          internal_role?: string | null
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
      prospects: {
        Row: {
          bd_owner_id: string
          commercial_lead_id: string | null
          company_name: string
          company_number: string | null
          company_status: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          incorporation_date: string | null
          number_of_directors: number | null
          number_of_employees: number | null
          org_id: string | null
          registered_address: string | null
          sic_codes: string[] | null
          status: string
          technical_lead_id: string | null
          updated_at: string
        }
        Insert: {
          bd_owner_id: string
          commercial_lead_id?: string | null
          company_name: string
          company_number?: string | null
          company_status?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          incorporation_date?: string | null
          number_of_directors?: number | null
          number_of_employees?: number | null
          org_id?: string | null
          registered_address?: string | null
          sic_codes?: string[] | null
          status?: string
          technical_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          bd_owner_id?: string
          commercial_lead_id?: string | null
          company_name?: string
          company_number?: string | null
          company_status?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          incorporation_date?: string | null
          number_of_directors?: number | null
          number_of_employees?: number | null
          org_id?: string | null
          registered_address?: string | null
          sic_codes?: string[] | null
          status?: string
          technical_lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_bd_owner_id_fkey"
            columns: ["bd_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_commercial_lead_id_fkey"
            columns: ["commercial_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_technical_lead_id_fkey"
            columns: ["technical_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "rd_claim_evidence_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
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
          origin: string
          project_id: string
          type: string
          visibility: string
        }
        Insert: {
          author_id: string
          author_role: string
          body: string
          created_at?: string
          id?: string
          origin?: string
          project_id: string
          type?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          origin?: string
          project_id?: string
          type?: string
          visibility?: string
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
          accepted_at: string | null
          claim_id: string | null
          company_id: string
          conexa_project_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          internal_status: string | null
          name: string
          ready_for_review_at: string | null
          reviewed_by_user_id: string | null
          sector: string | null
          stage: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          claim_id?: string | null
          company_id: string
          conexa_project_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          internal_status?: string | null
          name: string
          ready_for_review_at?: string | null
          reviewed_by_user_id?: string | null
          sector?: string | null
          stage?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          claim_id?: string | null
          company_id?: string
          conexa_project_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          internal_status?: string | null
          name?: string
          ready_for_review_at?: string | null
          reviewed_by_user_id?: string | null
          sector?: string | null
          stage?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sidekick_projects_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sidekick_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          activity_type: string | null
          claim_id: string | null
          created_at: string
          date: string
          hours: number
          id: string
          notes: string | null
          org_id: string
          sidekick_project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          claim_id?: string | null
          created_at?: string
          date: string
          hours: number
          id?: string
          notes?: string | null
          org_id: string
          sidekick_project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string | null
          claim_id?: string | null
          created_at?: string
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          org_id?: string
          sidekick_project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_sidekick_project_id_fkey"
            columns: ["sidekick_project_id"]
            isOneToOne: false
            referencedRelation: "sidekick_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
