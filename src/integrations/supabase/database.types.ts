 
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
      academy_certificates: {
        Row: {
          certificate_id: string
          completed_at: string
          created_at: string
          id: string
          recipient_name: string
          user_id: string
          verification_code: string
        }
        Insert: {
          certificate_id: string
          completed_at?: string
          created_at?: string
          id?: string
          recipient_name: string
          user_id: string
          verification_code: string
        }
        Update: {
          certificate_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          recipient_name?: string
          user_id?: string
          verification_code?: string
        }
        Relationships: []
      }
      academy_module_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_score: number | null
          module_id: string
          quiz_passed: boolean
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_score?: number | null
          module_id: string
          quiz_passed?: boolean
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_score?: number | null
          module_id?: string
          quiz_passed?: boolean
          user_id?: string
        }
        Relationships: []
      }
      bulk_project_uploads: {
        Row: {
          bucket_name: string
          bulk_project_id: string
          created_at: string
          created_by: string
          file_name: string
          file_path: string
          file_size_bytes: number
          id: string
          mime_type: string | null
          upload_type: string
        }
        Insert: {
          bucket_name: string
          bulk_project_id: string
          created_at?: string
          created_by: string
          file_name: string
          file_path: string
          file_size_bytes: number
          id?: string
          mime_type?: string | null
          upload_type: string
        }
        Update: {
          bucket_name?: string
          bulk_project_id?: string
          created_at?: string
          created_by?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string | null
          upload_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_project_uploads_bulk_project_id_fkey"
            columns: ["bulk_project_id"]
            isOneToOne: false
            referencedRelation: "bulk_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_projects: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          sector: string | null
          stage: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          sector?: string | null
          stage?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          sector?: string | null
          stage?: string | null
        }
        Relationships: []
      }
      calendar_accounts: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          azure_oid: string
          created_at: string
          id: string
          primary_calendar_id: string | null
          provider: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          azure_oid: string
          created_at?: string
          id?: string
          primary_calendar_id?: string | null
          provider: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          azure_oid?: string
          created_at?: string
          id?: string
          primary_calendar_id?: string | null
          provider?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          accounts_filed: string | null
          additional_info: string | null
          admin_last_updated: string | null
          ai_research_data: Json | null
          alternate_contact_informed: string | null
          any_issues_gathering_info: string | null
          apes: string | null
          apportionment_assumptions: string | null
          archived: boolean | null
          archived_at: string | null
          archived_by_user_id: string | null
          archived_reason: string | null
          bdm_claimed_before: boolean | null
          bdm_contract_period_understood: boolean | null
          bdm_fee_terms_explained: boolean | null
          bdm_last_updated: string | null
          bdm_other_notes: string | null
          bdm_projects_discussed: string | null
          bdm_section_created_by: string | null
          bdm_understands_scheme: boolean | null
          business_background: string | null
          can_answer_feasibility: string | null
          cif_status: string
          company_research: string | null
          competent_professional_1_email: string | null
          competent_professional_1_mobile: string | null
          competent_professional_1_name: string | null
          competent_professional_1_position: string | null
          competent_professional_2_email: string | null
          competent_professional_2_mobile: string | null
          competent_professional_2_name: string | null
          competent_professional_2_position: string | null
          competent_professional_3_email: string | null
          competent_professional_3_mobile: string | null
          competent_professional_3_name: string | null
          competent_professional_3_position: string | null
          consumables_estimate: number | null
          costs_details: string | null
          created_at: string
          created_by: string | null
          ct600_filed_seen: string | null
          current_stage: string | null
          director_comment: string | null
          director_decided_at: string | null
          director_decision: string | null
          director_id: string | null
          expected_feasibility_date: string | null
          feasibility_call_date: string | null
          fee_percentage: number | null
          fee_terms_details: string | null
          fee_terms_discussed: string | null
          finance_last_updated: string | null
          financial_section_created_by: string | null
          financial_year: string | null
          first_claim_year_for_new_claim: number | null
          has_claimed_before: boolean | null
          id: string
          introducer: string | null
          introducer_details: string | null
          issues_gathering_info_details: string | null
          linked_claim_id: string | null
          minimum_fee: number | null
          org_id: string | null
          paye_reference: string | null
          payroll: number | null
          pre_notification_required: string | null
          previous_claim_date_submitted: string | null
          previous_claim_details: string | null
          previous_claim_value: number | null
          previous_claim_year_end_date: string | null
          primary_contact_email: string | null
          primary_contact_landline: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          primary_contact_position: string | null
          project_overview: string | null
          projects_details: string | null
          projects_discussed: string | null
          prospect_id: string
          rd_themes: string[] | null
          ready_to_submit: boolean | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_to_stage: string | null
          rejection_reason: string | null
          scheme_understanding_details: string | null
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
          subcontractors_involved: string | null
          tech_last_updated: string | null
          tech_section_created_by: string | null
          time_sensitive: string | null
          turnover: number | null
          understands_scheme: string | null
          updated_at: string
          utr: string | null
          vat_number: string | null
          year_end_month: string | null
        }
        Insert: {
          accountant_email?: string | null
          accountant_firm?: string | null
          accountant_name?: string | null
          accountant_phone?: string | null
          accounts_filed?: string | null
          additional_info?: string | null
          admin_last_updated?: string | null
          ai_research_data?: Json | null
          alternate_contact_informed?: string | null
          any_issues_gathering_info?: string | null
          apes?: string | null
          apportionment_assumptions?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by_user_id?: string | null
          archived_reason?: string | null
          bdm_claimed_before?: boolean | null
          bdm_contract_period_understood?: boolean | null
          bdm_fee_terms_explained?: boolean | null
          bdm_last_updated?: string | null
          bdm_other_notes?: string | null
          bdm_projects_discussed?: string | null
          bdm_section_created_by?: string | null
          bdm_understands_scheme?: boolean | null
          business_background?: string | null
          can_answer_feasibility?: string | null
          cif_status?: string
          company_research?: string | null
          competent_professional_1_email?: string | null
          competent_professional_1_mobile?: string | null
          competent_professional_1_name?: string | null
          competent_professional_1_position?: string | null
          competent_professional_2_email?: string | null
          competent_professional_2_mobile?: string | null
          competent_professional_2_name?: string | null
          competent_professional_2_position?: string | null
          competent_professional_3_email?: string | null
          competent_professional_3_mobile?: string | null
          competent_professional_3_name?: string | null
          competent_professional_3_position?: string | null
          consumables_estimate?: number | null
          costs_details?: string | null
          created_at?: string
          created_by?: string | null
          ct600_filed_seen?: string | null
          current_stage?: string | null
          director_comment?: string | null
          director_decided_at?: string | null
          director_decision?: string | null
          director_id?: string | null
          expected_feasibility_date?: string | null
          feasibility_call_date?: string | null
          fee_percentage?: number | null
          fee_terms_details?: string | null
          fee_terms_discussed?: string | null
          finance_last_updated?: string | null
          financial_section_created_by?: string | null
          financial_year?: string | null
          first_claim_year_for_new_claim?: number | null
          has_claimed_before?: boolean | null
          id?: string
          introducer?: string | null
          introducer_details?: string | null
          issues_gathering_info_details?: string | null
          linked_claim_id?: string | null
          minimum_fee?: number | null
          org_id?: string | null
          paye_reference?: string | null
          payroll?: number | null
          pre_notification_required?: string | null
          previous_claim_date_submitted?: string | null
          previous_claim_details?: string | null
          previous_claim_value?: number | null
          previous_claim_year_end_date?: string | null
          primary_contact_email?: string | null
          primary_contact_landline?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_position?: string | null
          project_overview?: string | null
          projects_details?: string | null
          projects_discussed?: string | null
          prospect_id: string
          rd_themes?: string[] | null
          ready_to_submit?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_to_stage?: string | null
          rejection_reason?: string | null
          scheme_understanding_details?: string | null
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
          subcontractors_involved?: string | null
          tech_last_updated?: string | null
          tech_section_created_by?: string | null
          time_sensitive?: string | null
          turnover?: number | null
          understands_scheme?: string | null
          updated_at?: string
          utr?: string | null
          vat_number?: string | null
          year_end_month?: string | null
        }
        Update: {
          accountant_email?: string | null
          accountant_firm?: string | null
          accountant_name?: string | null
          accountant_phone?: string | null
          accounts_filed?: string | null
          additional_info?: string | null
          admin_last_updated?: string | null
          ai_research_data?: Json | null
          alternate_contact_informed?: string | null
          any_issues_gathering_info?: string | null
          apes?: string | null
          apportionment_assumptions?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by_user_id?: string | null
          archived_reason?: string | null
          bdm_claimed_before?: boolean | null
          bdm_contract_period_understood?: boolean | null
          bdm_fee_terms_explained?: boolean | null
          bdm_last_updated?: string | null
          bdm_other_notes?: string | null
          bdm_projects_discussed?: string | null
          bdm_section_created_by?: string | null
          bdm_understands_scheme?: boolean | null
          business_background?: string | null
          can_answer_feasibility?: string | null
          cif_status?: string
          company_research?: string | null
          competent_professional_1_email?: string | null
          competent_professional_1_mobile?: string | null
          competent_professional_1_name?: string | null
          competent_professional_1_position?: string | null
          competent_professional_2_email?: string | null
          competent_professional_2_mobile?: string | null
          competent_professional_2_name?: string | null
          competent_professional_2_position?: string | null
          competent_professional_3_email?: string | null
          competent_professional_3_mobile?: string | null
          competent_professional_3_name?: string | null
          competent_professional_3_position?: string | null
          consumables_estimate?: number | null
          costs_details?: string | null
          created_at?: string
          created_by?: string | null
          ct600_filed_seen?: string | null
          current_stage?: string | null
          director_comment?: string | null
          director_decided_at?: string | null
          director_decision?: string | null
          director_id?: string | null
          expected_feasibility_date?: string | null
          feasibility_call_date?: string | null
          fee_percentage?: number | null
          fee_terms_details?: string | null
          fee_terms_discussed?: string | null
          finance_last_updated?: string | null
          financial_section_created_by?: string | null
          financial_year?: string | null
          first_claim_year_for_new_claim?: number | null
          has_claimed_before?: boolean | null
          id?: string
          introducer?: string | null
          introducer_details?: string | null
          issues_gathering_info_details?: string | null
          linked_claim_id?: string | null
          minimum_fee?: number | null
          org_id?: string | null
          paye_reference?: string | null
          payroll?: number | null
          pre_notification_required?: string | null
          previous_claim_date_submitted?: string | null
          previous_claim_details?: string | null
          previous_claim_value?: number | null
          previous_claim_year_end_date?: string | null
          primary_contact_email?: string | null
          primary_contact_landline?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_position?: string | null
          project_overview?: string | null
          projects_details?: string | null
          projects_discussed?: string | null
          prospect_id?: string
          rd_themes?: string[] | null
          ready_to_submit?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_to_stage?: string | null
          rejection_reason?: string | null
          scheme_understanding_details?: string | null
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
          subcontractors_involved?: string | null
          tech_last_updated?: string | null
          tech_section_created_by?: string | null
          time_sensitive?: string | null
          turnover?: number | null
          understands_scheme?: string | null
          updated_at?: string
          utr?: string | null
          vat_number?: string | null
          year_end_month?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cif_records_archived_by_user_id_fkey"
            columns: ["archived_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_bdm_section_created_by_fkey"
            columns: ["bdm_section_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cif_records_created_by_fkey"
            columns: ["created_by"]
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
      claim_apportionment_source_files: {
        Row: {
          claim_evidence_id: string | null
          confidence_score: number | null
          created_at: string
          detected_doc_type: string | null
          extraction_summary_json: Json | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          parse_status: string
          raw_text: Json | null
          schedule_id: string
          selected_doc_type: string | null
          source_origin: string
          updated_at: string
        }
        Insert: {
          claim_evidence_id?: string | null
          confidence_score?: number | null
          created_at?: string
          detected_doc_type?: string | null
          extraction_summary_json?: Json | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          parse_status?: string
          raw_text?: Json | null
          schedule_id: string
          selected_doc_type?: string | null
          source_origin: string
          updated_at?: string
        }
        Update: {
          claim_evidence_id?: string | null
          confidence_score?: number | null
          created_at?: string
          detected_doc_type?: string | null
          extraction_summary_json?: Json | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          parse_status?: string
          raw_text?: Json | null
          schedule_id?: string
          selected_doc_type?: string | null
          source_origin?: string
          updated_at?: string
        }
        Relationships: []
      }
      claim_completion_status: {
        Row: {
          claim_id: string
          cost_completed_at: string | null
          cost_completed_by: string | null
          cost_notes: string | null
          cost_status: string
          created_at: string
          draft_completed_at: string | null
          draft_completed_by: string | null
          draft_document_id: string | null
          draft_status: string
          final_completed_at: string | null
          final_completed_by: string | null
          final_document_id: string | null
          final_status: string
          id: string
          qa_completed_at: string | null
          qa_completed_by: string | null
          qa_notes: string | null
          qa_status: string
          technical_completed_at: string | null
          technical_completed_by: string | null
          technical_notes: string | null
          technical_status: string
          updated_at: string
        }
        Insert: {
          claim_id: string
          cost_completed_at?: string | null
          cost_completed_by?: string | null
          cost_notes?: string | null
          cost_status?: string
          created_at?: string
          draft_completed_at?: string | null
          draft_completed_by?: string | null
          draft_document_id?: string | null
          draft_status?: string
          final_completed_at?: string | null
          final_completed_by?: string | null
          final_document_id?: string | null
          final_status?: string
          id?: string
          qa_completed_at?: string | null
          qa_completed_by?: string | null
          qa_notes?: string | null
          qa_status?: string
          technical_completed_at?: string | null
          technical_completed_by?: string | null
          technical_notes?: string | null
          technical_status?: string
          updated_at?: string
        }
        Update: {
          claim_id?: string
          cost_completed_at?: string | null
          cost_completed_by?: string | null
          cost_notes?: string | null
          cost_status?: string
          created_at?: string
          draft_completed_at?: string | null
          draft_completed_by?: string | null
          draft_document_id?: string | null
          draft_status?: string
          final_completed_at?: string | null
          final_completed_by?: string | null
          final_document_id?: string | null
          final_status?: string
          id?: string
          qa_completed_at?: string | null
          qa_completed_by?: string | null
          qa_notes?: string | null
          qa_status?: string
          technical_completed_at?: string | null
          technical_completed_by?: string | null
          technical_notes?: string | null
          technical_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_completion_status_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: true
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_completion_status_cost_completed_by_fkey"
            columns: ["cost_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_completion_status_draft_completed_by_fkey"
            columns: ["draft_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_completion_status_final_completed_by_fkey"
            columns: ["final_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_completion_status_qa_completed_by_fkey"
            columns: ["qa_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_completion_status_technical_completed_by_fkey"
            columns: ["technical_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          approval_status: Json | null
          approved_at: string | null
          assigned_to_user_id: string | null
          auto_synced: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          challenges_uncertainties: string | null
          claim_id: string
          client_feedback: string | null
          consumables_cost: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          end_date: string | null
          id: string
          last_synced_at: string | null
          name: string
          org_id: string
          project_code: string | null
          qualifying_activities: string[] | null
          rd_theme: string | null
          revision_count: number | null
          sent_to_client_at: string | null
          software_cost: number | null
          source_bulk_project_id: string | null
          source_project_id: string | null
          source_sidekick_project_id: string | null
          staff_cost: number | null
          staff_return_notes: string | null
          start_date: string | null
          status: string
          subcontractor_cost: number | null
          submitted_to_team_at: string | null
          team_started_at: string | null
          technical_reviewer: string | null
          technical_understanding: string | null
          total_qualifying_cost: number | null
          updated_at: string
          updated_by: string | null
          workflow_status: string | null
        }
        Insert: {
          advance_in_science?: string | null
          approval_status?: Json | null
          approved_at?: string | null
          assigned_to_user_id?: string | null
          auto_synced?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          challenges_uncertainties?: string | null
          claim_id: string
          client_feedback?: string | null
          consumables_cost?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          org_id: string
          project_code?: string | null
          qualifying_activities?: string[] | null
          rd_theme?: string | null
          revision_count?: number | null
          sent_to_client_at?: string | null
          software_cost?: number | null
          source_bulk_project_id?: string | null
          source_project_id?: string | null
          source_sidekick_project_id?: string | null
          staff_cost?: number | null
          staff_return_notes?: string | null
          start_date?: string | null
          status?: string
          subcontractor_cost?: number | null
          submitted_to_team_at?: string | null
          team_started_at?: string | null
          technical_reviewer?: string | null
          technical_understanding?: string | null
          total_qualifying_cost?: number | null
          updated_at?: string
          updated_by?: string | null
          workflow_status?: string | null
        }
        Update: {
          advance_in_science?: string | null
          approval_status?: Json | null
          approved_at?: string | null
          assigned_to_user_id?: string | null
          auto_synced?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          challenges_uncertainties?: string | null
          claim_id?: string
          client_feedback?: string | null
          consumables_cost?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          org_id?: string
          project_code?: string | null
          qualifying_activities?: string[] | null
          rd_theme?: string | null
          revision_count?: number | null
          sent_to_client_at?: string | null
          software_cost?: number | null
          source_bulk_project_id?: string | null
          source_project_id?: string | null
          source_sidekick_project_id?: string | null
          staff_cost?: number | null
          staff_return_notes?: string | null
          start_date?: string | null
          status?: string
          subcontractor_cost?: number | null
          submitted_to_team_at?: string | null
          team_started_at?: string | null
          technical_reviewer?: string | null
          technical_understanding?: string | null
          total_qualifying_cost?: number | null
          updated_at?: string
          updated_by?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_projects_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "claim_projects_source_bulk_project_id_fkey"
            columns: ["source_bulk_project_id"]
            isOneToOne: false
            referencedRelation: "bulk_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_projects_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_projects_source_sidekick_project_id_fkey"
            columns: ["source_sidekick_project_id"]
            isOneToOne: false
            referencedRelation: "sidekick_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_projects_technical_reviewer_fkey"
            columns: ["technical_reviewer"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_projects_updated_by_fkey"
            columns: ["updated_by"]
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
          client_review_completed_at: string | null
          client_review_requested_at: string | null
          cost_lead_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          director_id: string | null
          draft_pdf_url: string | null
          engagement_id: string | null
          expected_submission_date: string | null
          final_pdf_url: string | null
          hmrc_reference: string | null
          hmrc_response_pdf_paths: string[] | null
          hmrc_responses: Json | null
          hmrc_submission_pdf_path: string | null
          id: string
          notes: string | null
          ops_owner_id: string | null
          org_id: string
          period_end: string | null
          period_start: string | null
          qa_completed_at: string | null
          qa_requested_at: string | null
          qa_reviewer_id: string | null
          received_claim_value: number | null
          scheme: string | null
          scheme_type: string | null
          status: string
          submitted_claim_value: number | null
          technical_lead_id: string | null
          updated_at: string
        }
        Insert: {
          actual_submission_date?: string | null
          bd_owner_id?: string | null
          claim_year: number
          client_review_completed_at?: string | null
          client_review_requested_at?: string | null
          cost_lead_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          director_id?: string | null
          draft_pdf_url?: string | null
          engagement_id?: string | null
          expected_submission_date?: string | null
          final_pdf_url?: string | null
          hmrc_reference?: string | null
          hmrc_response_pdf_paths?: string[] | null
          hmrc_responses?: Json | null
          hmrc_submission_pdf_path?: string | null
          id?: string
          notes?: string | null
          ops_owner_id?: string | null
          org_id: string
          period_end?: string | null
          period_start?: string | null
          qa_completed_at?: string | null
          qa_requested_at?: string | null
          qa_reviewer_id?: string | null
          received_claim_value?: number | null
          scheme?: string | null
          scheme_type?: string | null
          status?: string
          submitted_claim_value?: number | null
          technical_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_submission_date?: string | null
          bd_owner_id?: string | null
          claim_year?: number
          client_review_completed_at?: string | null
          client_review_requested_at?: string | null
          cost_lead_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          director_id?: string | null
          draft_pdf_url?: string | null
          engagement_id?: string | null
          expected_submission_date?: string | null
          final_pdf_url?: string | null
          hmrc_reference?: string | null
          hmrc_response_pdf_paths?: string[] | null
          hmrc_responses?: Json | null
          hmrc_submission_pdf_path?: string | null
          id?: string
          notes?: string | null
          ops_owner_id?: string | null
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          qa_completed_at?: string | null
          qa_requested_at?: string | null
          qa_reviewer_id?: string | null
          received_claim_value?: number | null
          scheme?: string | null
          scheme_type?: string | null
          status?: string
          submitted_claim_value?: number | null
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
            foreignKeyName: "claims_deleted_by_fkey"
            columns: ["deleted_by"]
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
            foreignKeyName: "claims_qa_reviewer_id_fkey"
            columns: ["qa_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      client_activities: {
        Row: {
          body: string | null
          client_id: string
          contact_id: string | null
          created_at: string
          created_by: string
          direction: string
          follow_up_date: string | null
          follow_up_required: boolean
          id: string
          outcome: string | null
          subject: string | null
          summary: string | null
          type: string
        }
        Insert: {
          body?: string | null
          client_id: string
          contact_id?: string | null
          created_at?: string
          created_by: string
          direction: string
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          outcome?: string | null
          subject?: string | null
          summary?: string | null
          type: string
        }
        Update: {
          body?: string | null
          client_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          direction?: string
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          outcome?: string | null
          subject?: string | null
          summary?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_activity_links: {
        Row: {
          activity_id: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          activity_id: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          activity_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activity_links_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "client_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_decision_maker: boolean
          is_primary: boolean
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          preferred_contact_method: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_dossiers: {
        Row: {
          business_summary: string | null
          claim_likelihood: string | null
          client_id: string
          confidence_score: number | null
          created_at: string
          documents_to_request_json: Json | null
          generated_at: string | null
          id: string
          innovation_signals_json: Json | null
          key_questions_json: Json | null
          likely_buyer_personas_json: Json | null
          likely_objections_json: Json | null
          likely_pain_points_json: Json | null
          likely_qualifying_themes_json: Json | null
          owner_user_id: string | null
          potential_claim_size_band: string | null
          rd_fit_summary: string | null
          recommended_approach: string | null
          recommended_next_step: string | null
          refreshed_at: string | null
          staff_locked: boolean
          staff_notes: string | null
          status: string
          technical_environment: string | null
          updated_at: string
          watchouts_json: Json | null
        }
        Insert: {
          business_summary?: string | null
          claim_likelihood?: string | null
          client_id: string
          confidence_score?: number | null
          created_at?: string
          documents_to_request_json?: Json | null
          generated_at?: string | null
          id?: string
          innovation_signals_json?: Json | null
          key_questions_json?: Json | null
          likely_buyer_personas_json?: Json | null
          likely_objections_json?: Json | null
          likely_pain_points_json?: Json | null
          likely_qualifying_themes_json?: Json | null
          owner_user_id?: string | null
          potential_claim_size_band?: string | null
          rd_fit_summary?: string | null
          recommended_approach?: string | null
          recommended_next_step?: string | null
          refreshed_at?: string | null
          staff_locked?: boolean
          staff_notes?: string | null
          status?: string
          technical_environment?: string | null
          updated_at?: string
          watchouts_json?: Json | null
        }
        Update: {
          business_summary?: string | null
          claim_likelihood?: string | null
          client_id?: string
          confidence_score?: number | null
          created_at?: string
          documents_to_request_json?: Json | null
          generated_at?: string | null
          id?: string
          innovation_signals_json?: Json | null
          key_questions_json?: Json | null
          likely_buyer_personas_json?: Json | null
          likely_objections_json?: Json | null
          likely_pain_points_json?: Json | null
          likely_qualifying_themes_json?: Json | null
          owner_user_id?: string | null
          potential_claim_size_band?: string | null
          rd_fit_summary?: string | null
          recommended_approach?: string | null
          recommended_next_step?: string | null
          refreshed_at?: string | null
          staff_locked?: boolean
          staff_notes?: string | null
          status?: string
          technical_environment?: string | null
          updated_at?: string
          watchouts_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "client_dossiers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_dossiers_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          assigned_to_user_id: string
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          priority: string
          related_claim_id: string | null
          status: string
          task_type: string | null
          title: string
        }
        Insert: {
          assigned_to_user_id: string
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          related_claim_id?: string | null
          status?: string
          task_type?: string | null
          title: string
        }
        Update: {
          assigned_to_user_id?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          related_claim_id?: string | null
          status?: string
          task_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_related_claim_id_fkey"
            columns: ["related_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      clients_to_be_onboarded: {
        Row: {
          address: string | null
          bdm: string | null
          comments: string | null
          company_name: string
          company_number: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          fee_percent: number | null
          id: string
          landline: string | null
          phone: string | null
          ref_by: string | null
          ref_fee: number | null
          title: string | null
          utr: string | null
          year_end_month: string | null
        }
        Insert: {
          address?: string | null
          bdm?: string | null
          comments?: string | null
          company_name: string
          company_number?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          fee_percent?: number | null
          id?: string
          landline?: string | null
          phone?: string | null
          ref_by?: string | null
          ref_fee?: number | null
          title?: string | null
          utr?: string | null
          year_end_month?: string | null
        }
        Update: {
          address?: string | null
          bdm?: string | null
          comments?: string | null
          company_name?: string
          company_number?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          fee_percent?: number | null
          id?: string
          landline?: string | null
          phone?: string | null
          ref_by?: string | null
          ref_fee?: number | null
          title?: string | null
          utr?: string | null
          year_end_month?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_to_be_onboarded_bdm_fkey"
            columns: ["bdm"]
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
      companies_house_filings: {
        Row: {
          accounts_filing_date: string
          company_number: string
          created_at: string
          fetched_at: string
          filing_lag_days: number | null
          filing_type: string | null
          id: string
          org_id: string
          period_end_date: string
          period_start_date: string
        }
        Insert: {
          accounts_filing_date: string
          company_number: string
          created_at?: string
          fetched_at?: string
          filing_lag_days?: number | null
          filing_type?: string | null
          id?: string
          org_id: string
          period_end_date: string
          period_start_date: string
        }
        Update: {
          accounts_filing_date?: string
          company_number?: string
          created_at?: string
          fetched_at?: string
          filing_lag_days?: number | null
          filing_type?: string | null
          id?: string
          org_id?: string
          period_end_date?: string
          period_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_house_filings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
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
      feasibility_availability: {
        Row: {
          cif_case_id: string | null
          created_at: string
          end_time: string
          id: string
          is_booked: boolean | null
          slot_length_minutes: number | null
          slot_type: string | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cif_case_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_booked?: boolean | null
          slot_length_minutes?: number | null
          slot_type?: string | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cif_case_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_booked?: boolean | null
          slot_length_minutes?: number | null
          slot_type?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_availability_cif_case_id_fkey"
            columns: ["cif_case_id"]
            isOneToOne: false
            referencedRelation: "cif_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feasibility_meetings: {
        Row: {
          bdm_user_id: string
          cif_case_id: string
          client_id: string | null
          client_teams_email: string | null
          created_at: string
          feasibility_user_id: string
          id: string
          meeting_date: string
          meeting_end_time: string
          meeting_start_time: string
          meeting_status: string
          outcome: string | null
          outcome_notes: string | null
          slot_id: string | null
          teams_meeting_link: string | null
          updated_at: string
        }
        Insert: {
          bdm_user_id: string
          cif_case_id: string
          client_id?: string | null
          client_teams_email?: string | null
          created_at?: string
          feasibility_user_id: string
          id?: string
          meeting_date: string
          meeting_end_time: string
          meeting_start_time: string
          meeting_status?: string
          outcome?: string | null
          outcome_notes?: string | null
          slot_id?: string | null
          teams_meeting_link?: string | null
          updated_at?: string
        }
        Update: {
          bdm_user_id?: string
          cif_case_id?: string
          client_id?: string | null
          client_teams_email?: string | null
          created_at?: string
          feasibility_user_id?: string
          id?: string
          meeting_date?: string
          meeting_end_time?: string
          meeting_start_time?: string
          meeting_status?: string
          outcome?: string | null
          outcome_notes?: string | null
          slot_id?: string | null
          teams_meeting_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_meetings_bdm_user_id_fkey"
            columns: ["bdm_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_meetings_cif_case_id_fkey"
            columns: ["cif_case_id"]
            isOneToOne: false
            referencedRelation: "cif_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_meetings_feasibility_user_id_fkey"
            columns: ["feasibility_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_meetings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "feasibility_availability"
            referencedColumns: ["id"]
          },
        ]
      }
      hmrc_inspector_findings: {
        Row: {
          category: string
          claim_id: string
          created_at: string
          description: string
          id: string
          project_id: string | null
          recommendation: string
          session_id: string
          severity: string
          source_refs_json: Json | null
          title: string
        }
        Insert: {
          category: string
          claim_id: string
          created_at?: string
          description: string
          id?: string
          project_id?: string | null
          recommendation: string
          session_id: string
          severity: string
          source_refs_json?: Json | null
          title: string
        }
        Update: {
          category?: string
          claim_id?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string | null
          recommendation?: string
          session_id?: string
          severity?: string
          source_refs_json?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hmrc_inspector_findings_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hmrc_inspector_findings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "hmrc_inspector_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hmrc_inspector_messages: {
        Row: {
          created_at: string
          id: string
          message_text: string
          role: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_text: string
          role: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hmrc_inspector_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "hmrc_inspector_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hmrc_inspector_sessions: {
        Row: {
          claim_id: string
          created_at: string
          created_by_user_id: string
          id: string
          mode: string
          overall_score: number | null
          risk_level: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          mode: string
          overall_score?: number | null
          risk_level?: string | null
          status: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          mode?: string
          overall_score?: number | null
          risk_level?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hmrc_inspector_sessions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hmrc_inspector_sessions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      message_mentions: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          mentioned_user_id: string
          message_id: string
          read_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_user_id: string
          message_id: string
          read_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_user_id?: string
          message_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_recipients: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_id: string
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id: string
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id?: string
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_staff_sender: boolean
          org_id: string
          parent_message_id: string | null
          sender_id: string
          subject: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_staff_sender?: boolean
          org_id: string
          parent_message_id?: string | null
          sender_id: string
          subject: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_staff_sender?: boolean
          org_id?: string
          parent_message_id?: string | null
          sender_id?: string
          subject?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
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
      organisation_notification_status: {
        Row: {
          accounting_period_end: string | null
          accounting_period_start: string | null
          claimed_within_last_3_years: boolean | null
          created_at: string
          deadline_date: string | null
          has_claimed_before: boolean | null
          id: string
          internal_rd_contact_email: string | null
          internal_rd_contact_name: string | null
          notes: string | null
          notification_required: boolean | null
          organisation_id: string
          organisation_rd_summary: string | null
          status: string
          submission_date: string | null
          submission_reference: string | null
          updated_at: string
        }
        Insert: {
          accounting_period_end?: string | null
          accounting_period_start?: string | null
          claimed_within_last_3_years?: boolean | null
          created_at?: string
          deadline_date?: string | null
          has_claimed_before?: boolean | null
          id?: string
          internal_rd_contact_email?: string | null
          internal_rd_contact_name?: string | null
          notes?: string | null
          notification_required?: boolean | null
          organisation_id: string
          organisation_rd_summary?: string | null
          status?: string
          submission_date?: string | null
          submission_reference?: string | null
          updated_at?: string
        }
        Update: {
          accounting_period_end?: string | null
          accounting_period_start?: string | null
          claimed_within_last_3_years?: boolean | null
          created_at?: string
          deadline_date?: string | null
          has_claimed_before?: boolean | null
          id?: string
          internal_rd_contact_email?: string | null
          internal_rd_contact_name?: string | null
          notes?: string | null
          notification_required?: boolean | null
          organisation_id?: string
          organisation_rd_summary?: string | null
          status?: string
          submission_date?: string | null
          submission_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_notification_status_organisation_id_fkey"
            columns: ["organisation_id"]
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
          incorporation_date: string | null
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
          incorporation_date?: string | null
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
          incorporation_date?: string | null
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
          auto_created: boolean | null
          average_filing_lag_days: number | null
          claim_id: string | null
          created_at: string
          created_by: string
          engagement_id: string | null
          estimated_qualifying_spend: number | null
          expected_accounts_filing_date: string | null
          expected_fee: number | null
          expected_submission_date: string | null
          filing_confidence_score: number | null
          filing_pattern: string | null
          id: string
          last_companies_house_sync: string | null
          manual_revenue_override: number | null
          notes: string | null
          org_id: string
          period_label: string | null
          pipeline_start_date: string | null
          predicted_revenue: number | null
          predictor_confidence: string | null
          predictor_last_run_at: string | null
          probability: number | null
          updated_at: string
          weighted_fee: number | null
          years_trading: number | null
        }
        Insert: {
          auto_created?: boolean | null
          average_filing_lag_days?: number | null
          claim_id?: string | null
          created_at?: string
          created_by: string
          engagement_id?: string | null
          estimated_qualifying_spend?: number | null
          expected_accounts_filing_date?: string | null
          expected_fee?: number | null
          expected_submission_date?: string | null
          filing_confidence_score?: number | null
          filing_pattern?: string | null
          id?: string
          last_companies_house_sync?: string | null
          manual_revenue_override?: number | null
          notes?: string | null
          org_id: string
          period_label?: string | null
          pipeline_start_date?: string | null
          predicted_revenue?: number | null
          predictor_confidence?: string | null
          predictor_last_run_at?: string | null
          probability?: number | null
          updated_at?: string
          weighted_fee?: number | null
          years_trading?: number | null
        }
        Update: {
          auto_created?: boolean | null
          average_filing_lag_days?: number | null
          claim_id?: string | null
          created_at?: string
          created_by?: string
          engagement_id?: string | null
          estimated_qualifying_spend?: number | null
          expected_accounts_filing_date?: string | null
          expected_fee?: number | null
          expected_submission_date?: string | null
          filing_confidence_score?: number | null
          filing_pattern?: string | null
          id?: string
          last_companies_house_sync?: string | null
          manual_revenue_override?: number | null
          notes?: string | null
          org_id?: string
          period_label?: string | null
          pipeline_start_date?: string | null
          predicted_revenue?: number | null
          predictor_confidence?: string | null
          predictor_last_run_at?: string | null
          probability?: number | null
          updated_at?: string
          weighted_fee?: number | null
          years_trading?: number | null
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
      pipeline_settings: {
        Row: {
          setting_key: string
          setting_value: string
        }
        Insert: {
          setting_key: string
          setting_value: string
        }
        Update: {
          setting_key?: string
          setting_value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          internal_role: string | null
          is_feasibility_available: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          internal_role?: string | null
          is_feasibility_available?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          internal_role?: string | null
          is_feasibility_available?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          added_at: string | null
          added_by: string | null
          claim_project_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          claim_project_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          claim_project_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_collaborators_claim_project_id_fkey"
            columns: ["claim_project_id"]
            isOneToOne: false
            referencedRelation: "claim_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          claim_project_id: string
          comment_text: string
          comment_type: string
          created_at: string | null
          id: string
          section_reference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          claim_project_id: string
          comment_text: string
          comment_type: string
          created_at?: string | null
          id?: string
          section_reference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          claim_project_id?: string
          comment_text?: string
          comment_type?: string
          created_at?: string | null
          id?: string
          section_reference?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_claim_project_id_fkey"
            columns: ["claim_project_id"]
            isOneToOne: false
            referencedRelation: "claim_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_health_scores: {
        Row: {
          cost_support_score: number | null
          documentation_strength: number | null
          evidence_score: number | null
          experimentation_score: number | null
          health_rating: string | null
          id: string
          innovation_density_score: number | null
          iteration_score: number | null
          narrative_score: number | null
          overall_health_score: number | null
          project_id: string
          reasons_json: Json | null
          risk_level: string | null
          timeline_score: number | null
          uncertainty_score: number | null
          updated_at: string
        }
        Insert: {
          cost_support_score?: number | null
          documentation_strength?: number | null
          evidence_score?: number | null
          experimentation_score?: number | null
          health_rating?: string | null
          id?: string
          innovation_density_score?: number | null
          iteration_score?: number | null
          narrative_score?: number | null
          overall_health_score?: number | null
          project_id: string
          reasons_json?: Json | null
          risk_level?: string | null
          timeline_score?: number | null
          uncertainty_score?: number | null
          updated_at?: string
        }
        Update: {
          cost_support_score?: number | null
          documentation_strength?: number | null
          evidence_score?: number | null
          experimentation_score?: number | null
          health_rating?: string | null
          id?: string
          innovation_density_score?: number | null
          iteration_score?: number | null
          narrative_score?: number | null
          overall_health_score?: number | null
          project_id?: string
          reasons_json?: Json | null
          risk_level?: string | null
          timeline_score?: number | null
          uncertainty_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_health_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "claim_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          claim_project_id: string
          from_status: string | null
          id: string
          notes: string | null
          to_status: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          claim_project_id: string
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          claim_project_id?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_status_history_claim_project_id_fkey"
            columns: ["claim_project_id"]
            isOneToOne: false
            referencedRelation: "claim_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_voice_notes: {
        Row: {
          ai_summary: string | null
          created_at: string
          created_by_user_id: string | null
          detected_project_name: string | null
          detection_confidence: number | null
          id: string
          manually_confirmed: boolean | null
          org_id: string
          original_audio_url: string | null
          project_id: string
          transcript_cleaned: string | null
          transcript_raw: string | null
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          created_by_user_id?: string | null
          detected_project_name?: string | null
          detection_confidence?: number | null
          id?: string
          manually_confirmed?: boolean | null
          org_id: string
          original_audio_url?: string | null
          project_id: string
          transcript_cleaned?: string | null
          transcript_raw?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          created_by_user_id?: string | null
          detected_project_name?: string | null
          detection_confidence?: number | null
          id?: string
          manually_confirmed?: boolean | null
          org_id?: string
          original_audio_url?: string | null
          project_id?: string
          transcript_cleaned?: string | null
          transcript_raw?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_voice_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_voice_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sidekick_projects"
            referencedColumns: ["id"]
          },
        ]
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
          ai_research_data: Json | null
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
          last_accounts_date: string | null
          last_enriched_at: string | null
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
          ai_research_data?: Json | null
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
          last_accounts_date?: string | null
          last_enriched_at?: string | null
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
          ai_research_data?: Json | null
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
          last_accounts_date?: string | null
          last_enriched_at?: string | null
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
      rd_audit_log: {
        Row: {
          action: string
          actor_user_id: string
          claim_id: string | null
          created_at: string
          details_json: Json | null
          id: string
          project_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          claim_id?: string | null
          created_at?: string
          details_json?: Json | null
          id?: string
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          claim_id?: string | null
          created_at?: string
          details_json?: Json | null
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rd_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rd_audit_log_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rd_audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "claim_projects"
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
      rd_project_narrative_state: {
        Row: {
          claim_project_id: string
          current_narrative_id: string | null
          final_narrative_id: string | null
          id: string
          last_edited_at: string | null
          last_edited_by: string | null
        }
        Insert: {
          claim_project_id: string
          current_narrative_id?: string | null
          final_narrative_id?: string | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
        }
        Update: {
          claim_project_id?: string
          current_narrative_id?: string | null
          final_narrative_id?: string | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rd_project_narrative_state_claim_project_id_fkey"
            columns: ["claim_project_id"]
            isOneToOne: true
            referencedRelation: "claim_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rd_project_narrative_state_current_narrative_id_fkey"
            columns: ["current_narrative_id"]
            isOneToOne: false
            referencedRelation: "rd_project_narratives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rd_project_narrative_state_final_narrative_id_fkey"
            columns: ["final_narrative_id"]
            isOneToOne: false
            referencedRelation: "rd_project_narratives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rd_project_narrative_state_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rd_project_narratives: {
        Row: {
          advance_sought: string
          baseline_knowledge: string
          claim_project_id: string
          created_at: string
          created_by: string | null
          generated_by: string | null
          id: string
          outcome: string
          quality_score: number | null
          status: string
          technological_uncertainty: string
          updated_at: string
          version_number: number
          work_undertaken: string
        }
        Insert: {
          advance_sought: string
          baseline_knowledge: string
          claim_project_id: string
          created_at?: string
          created_by?: string | null
          generated_by?: string | null
          id?: string
          outcome: string
          quality_score?: number | null
          status?: string
          technological_uncertainty: string
          updated_at?: string
          version_number?: number
          work_undertaken: string
        }
        Update: {
          advance_sought?: string
          baseline_knowledge?: string
          claim_project_id?: string
          created_at?: string
          created_by?: string | null
          generated_by?: string | null
          id?: string
          outcome?: string
          quality_score?: number | null
          status?: string
          technological_uncertainty?: string
          updated_at?: string
          version_number?: number
          work_undertaken?: string
        }
        Relationships: [
          {
            foreignKeyName: "rd_project_narratives_claim_project_id_fkey"
            columns: ["claim_project_id"]
            isOneToOne: false
            referencedRelation: "claim_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rd_project_narratives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_prospects: {
        Row: {
          ai_dossier_json: Json | null
          bdm_call_duration_minutes: number | null
          bdm_call_event_id: string | null
          bdm_call_scheduled_at: string | null
          bdm_call_teams_link: string | null
          bdm_user_id: string | null
          company_name: string
          company_number: string | null
          created_at: string
          created_by: string
          engagement_account_persona: string | null
          engagement_ai_generation_status: string | null
          engagement_call_score: number | null
          engagement_commercial_value_score: number | null
          engagement_confidence: string | null
          engagement_decision_maker_access_score: number | null
          engagement_digital_maturity_score: number | null
          engagement_education_need_score: number | null
          engagement_email_score: number | null
          engagement_evidence_summary: string[] | null
          engagement_face_to_face_score: number | null
          engagement_fallback_touch: string | null
          engagement_generated_at: string | null
          engagement_generated_from_version: string | null
          engagement_last_tested_channel: string | null
          engagement_last_tested_outcome: string | null
          engagement_local_visit_score: number | null
          engagement_next_best_action: string | null
          engagement_observed_preference_notes: string | null
          engagement_observed_real_preference: string | null
          engagement_reason_codes: string[] | null
          engagement_recommended_first_touch: string | null
          engagement_relationship_score: number | null
          engagement_strategy_json: Json | null
          engagement_suggested_call_opener: string | null
          engagement_suggested_meeting_angle: string | null
          engagement_suggested_opener: string | null
          engagement_suggested_subject_line: string | null
          engagement_urgency_trigger_score: number | null
          enrichment_error: string | null
          estimated_claim_band: string | null
          id: string
          last_enriched_at: string | null
          rd_viability_score: number | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          ai_dossier_json?: Json | null
          bdm_call_duration_minutes?: number | null
          bdm_call_event_id?: string | null
          bdm_call_scheduled_at?: string | null
          bdm_call_teams_link?: string | null
          bdm_user_id?: string | null
          company_name: string
          company_number?: string | null
          created_at?: string
          created_by: string
          engagement_account_persona?: string | null
          engagement_ai_generation_status?: string | null
          engagement_call_score?: number | null
          engagement_commercial_value_score?: number | null
          engagement_confidence?: string | null
          engagement_decision_maker_access_score?: number | null
          engagement_digital_maturity_score?: number | null
          engagement_education_need_score?: number | null
          engagement_email_score?: number | null
          engagement_evidence_summary?: string[] | null
          engagement_face_to_face_score?: number | null
          engagement_fallback_touch?: string | null
          engagement_generated_at?: string | null
          engagement_generated_from_version?: string | null
          engagement_last_tested_channel?: string | null
          engagement_last_tested_outcome?: string | null
          engagement_local_visit_score?: number | null
          engagement_next_best_action?: string | null
          engagement_observed_preference_notes?: string | null
          engagement_observed_real_preference?: string | null
          engagement_reason_codes?: string[] | null
          engagement_recommended_first_touch?: string | null
          engagement_relationship_score?: number | null
          engagement_strategy_json?: Json | null
          engagement_suggested_call_opener?: string | null
          engagement_suggested_meeting_angle?: string | null
          engagement_suggested_opener?: string | null
          engagement_suggested_subject_line?: string | null
          engagement_urgency_trigger_score?: number | null
          enrichment_error?: string | null
          estimated_claim_band?: string | null
          id?: string
          last_enriched_at?: string | null
          rd_viability_score?: number | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          ai_dossier_json?: Json | null
          bdm_call_duration_minutes?: number | null
          bdm_call_event_id?: string | null
          bdm_call_scheduled_at?: string | null
          bdm_call_teams_link?: string | null
          bdm_user_id?: string | null
          company_name?: string
          company_number?: string | null
          created_at?: string
          created_by?: string
          engagement_account_persona?: string | null
          engagement_ai_generation_status?: string | null
          engagement_call_score?: number | null
          engagement_commercial_value_score?: number | null
          engagement_confidence?: string | null
          engagement_decision_maker_access_score?: number | null
          engagement_digital_maturity_score?: number | null
          engagement_education_need_score?: number | null
          engagement_email_score?: number | null
          engagement_evidence_summary?: string[] | null
          engagement_face_to_face_score?: number | null
          engagement_fallback_touch?: string | null
          engagement_generated_at?: string | null
          engagement_generated_from_version?: string | null
          engagement_last_tested_channel?: string | null
          engagement_last_tested_outcome?: string | null
          engagement_local_visit_score?: number | null
          engagement_next_best_action?: string | null
          engagement_observed_preference_notes?: string | null
          engagement_observed_real_preference?: string | null
          engagement_reason_codes?: string[] | null
          engagement_recommended_first_touch?: string | null
          engagement_relationship_score?: number | null
          engagement_strategy_json?: Json | null
          engagement_suggested_call_opener?: string | null
          engagement_suggested_meeting_angle?: string | null
          engagement_suggested_opener?: string | null
          engagement_suggested_subject_line?: string | null
          engagement_urgency_trigger_score?: number | null
          enrichment_error?: string | null
          estimated_claim_band?: string | null
          id?: string
          last_enriched_at?: string | null
          rd_viability_score?: number | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_prospects_bdm_user_id_fkey"
            columns: ["bdm_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_prospects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      sidekick_project_cost_advice: {
        Row: {
          amount: number
          cost_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          notes: string | null
          project_id: string
        }
        Insert: {
          amount: number
          cost_type: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          notes?: string | null
          project_id: string
        }
        Update: {
          amount?: number
          cost_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          notes?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sidekick_project_cost_advice_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sidekick_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sidekick_project_timeline_items: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          name: string
          project_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          name: string
          project_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          name?: string
          project_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sidekick_project_timeline_items_project_id_fkey"
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
          end_date: string | null
          id: string
          innovations: string | null
          internal_status: string | null
          name: string
          rd_budget: number | null
          rd_challenges: string | null
          ready_for_review_at: string | null
          reviewed_by_user_id: string | null
          sector: string | null
          stage: string | null
          start_date: string | null
          status: string
          submitted_at: string | null
          team_members: string | null
          technical_uncertainties: string | null
          total_budget: number | null
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
          end_date?: string | null
          id?: string
          innovations?: string | null
          internal_status?: string | null
          name: string
          rd_budget?: number | null
          rd_challenges?: string | null
          ready_for_review_at?: string | null
          reviewed_by_user_id?: string | null
          sector?: string | null
          stage?: string | null
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          team_members?: string | null
          technical_uncertainties?: string | null
          total_budget?: number | null
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
          end_date?: string | null
          id?: string
          innovations?: string | null
          internal_status?: string | null
          name?: string
          rd_budget?: number | null
          rd_challenges?: string | null
          ready_for_review_at?: string | null
          reviewed_by_user_id?: string | null
          sector?: string | null
          stage?: string | null
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          team_members?: string | null
          technical_uncertainties?: string | null
          total_budget?: number | null
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
      calculate_filing_confidence: {
        Args: { p_org_id: string; p_years_trading: number }
        Returns: number
      }
      calculate_pipeline_confidence: {
        Args: { p_filing_history_count: number; p_years_trading: number }
        Returns: number
      }
      get_average_filing_lag: { Args: { p_org_id: string }; Returns: number }
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
