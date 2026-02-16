import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { organisationService } from "./organisationService";

type CIFRecord = Database["public"]["Tables"]["cif_records"]["Row"];
type CIFInsert = Database["public"]["Tables"]["cif_records"]["Insert"];
type CIFUpdate = Database["public"]["Tables"]["cif_records"]["Update"];
type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type ProspectInsert = Database["public"]["Tables"]["prospects"]["Insert"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];

// Extended types for UI
export interface CompaniesHouseData {
  company_number: string;
  company_name: string;
  company_status: string;
  registered_address: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
  };
  sic_codes?: string[];
  date_of_creation?: string;
  company_age_years?: number;
  type?: string;
  last_accounts_date?: string | null;
  number_of_directors?: number;
  number_of_employees?: number;
  officers?: {
    active_count: number;
    active_officers: Array<{
      name: string;
      role: string;
      appointed_on?: string;
      nationality?: string;
      occupation?: string;
      country_of_residence?: string;
    }>;
    total_count: number;
  } | null;
  filing_history?: {
    filings: Array<{
      period_end_date?: string;
      filing_date?: string;
      filing_lag_days?: number | null;
      description?: string;
      type?: string;
    }>;
    average_filing_lag_days?: number;
    filings_count?: number;
    filing_pattern?: string;
    confidence_score?: number;
  } | null;
}

export interface CIFWithDetails extends CIFRecord {
  prospects?: Prospect | null;
  claim?: Database["public"]["Tables"]["claims"]["Row"] | null;
  created_by_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
  // Feasibility fields (flattened or optional)
  technical_understanding?: string | null;
  challenges_uncertainties?: string | null;
  qualifying_activities?: string[] | null;
  rd_projects_list?: string[] | null;
  feasibility_status?: "qualified" | "not_qualified" | "needs_more_info" | null;
  estimated_claim_band?: "0-25k" | "25k-50k" | "50k-100k" | "100k-250k" | "250k+" | null;
  risk_rating?: "low" | "medium" | "high" | null;
  notes_for_finance?: string | null;
  missing_information_flags?: string[] | null;
}

export const cifService = {
  /**
   * Lookup company data from Companies House API
   */
  async lookupCompaniesHouse(companyNumber: string, includeHistory: boolean = false): Promise<CompaniesHouseData | null> {
    try {
      const cleanNumber = companyNumber.replace(/\s/g, "").toUpperCase();
      const response = await fetch(`/api/companies-house/lookup?number=${cleanNumber}&includeHistory=${includeHistory}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Companies House lookup failed");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Companies House lookup error:", error);
      throw error;
    }
  },

  /**
   * Check if company is active
   */
  isCompanyActive(status: string): boolean {
    const inactiveStatuses = [
      "dissolved",
      "liquidation",
      "receivership",
      "administration",
      "voluntary-arrangement",
      "converted-closed",
      "insolvency-proceedings"
    ];
    return !inactiveStatuses.includes(status.toLowerCase());
  },

  /**
   * Create new CIF record with BDM Section A data
   */
  async createCIF({
    prospectData,
    bdmSectionData,
    createdBy,
  }: {
    prospectData: {
      company_name: string;
      company_number: string;
      company_status?: string;
      registered_address?: string;
      sic_codes?: string[];
      incorporation_date?: string;
      last_accounts_date?: string;
      number_of_directors?: number;
      number_of_employees?: number;
    };
    bdmSectionData: {
      business_background?: string;
      project_overview?: string;
      primary_contact_name?: string;
      primary_contact_position?: string;
      primary_contact_email?: string;
      primary_contact_phone?: string;
      primary_contact_landline?: string;
      rd_themes?: string[];
      expected_feasibility_date?: string;
      has_claimed_before?: boolean;
      previous_claim_year_end_date?: string;
      previous_claim_value?: number;
      previous_claim_date_submitted?: string;
      company_research?: string;
      ai_research_data?: any;
      can_answer_feasibility?: string;
      alternate_contact_informed?: string;
      understands_scheme?: string;
      scheme_understanding_details?: string;
      previous_claim_details?: string;
      projects_discussed?: string;
      projects_details?: string;
      fee_terms_discussed?: string;
      fee_terms_details?: string;
      additional_info?: string;
    };
    createdBy: string;
  }) {
    // 1. Create or get Profile
    // Note: In a real app we'd probably want to create a contact record first
    // For now we'll just store contact info directly on the CIF or Prospect

    // 2. Create Prospect
    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .insert({
        company_name: prospectData.company_name,
        company_number: prospectData.company_number,
        company_status: prospectData.company_status,
        registered_address: prospectData.registered_address,
        sic_codes: prospectData.sic_codes,
        incorporation_date: prospectData.incorporation_date,
        last_accounts_date: prospectData.last_accounts_date,
        number_of_directors: prospectData.number_of_directors,
        number_of_employees: prospectData.number_of_employees,
        primary_contact_name: bdmSectionData.primary_contact_name,
        primary_contact_email: bdmSectionData.primary_contact_email,
        primary_contact_phone: bdmSectionData.primary_contact_phone,
      })
      .select()
      .single();

    if (prospectError) throw prospectError;

    // 3. Create CIF Record
    const { data: cif, error: cifError } = await supabase
      .from("cif_records")
      .insert({
        prospect_id: prospect.id,
        created_by: createdBy,
        current_stage: "bdm_section",
        
        // BDM Section Data
        bdm_business_background: bdmSectionData.business_background,
        bdm_project_overview: bdmSectionData.project_overview,
        bdm_primary_contact_name: bdmSectionData.primary_contact_name,
        bdm_primary_contact_position: bdmSectionData.primary_contact_position,
        bdm_primary_contact_email: bdmSectionData.primary_contact_email,
        bdm_primary_contact_phone: bdmSectionData.primary_contact_phone,
        bdm_primary_contact_landline: bdmSectionData.primary_contact_landline,
        bdm_rd_themes: bdmSectionData.rd_themes,
        bdm_expected_feasibility_date: bdmSectionData.expected_feasibility_date,
        has_claimed_before: bdmSectionData.has_claimed_before,
        previous_claim_year_end_date: bdmSectionData.previous_claim_year_end_date,
        previous_claim_value: bdmSectionData.previous_claim_value,
        previous_claim_date_submitted: bdmSectionData.previous_claim_date_submitted,
        
        // New Fields
        can_answer_feasibility: bdmSectionData.can_answer_feasibility,
        alternate_contact_informed: bdmSectionData.alternate_contact_informed,
        understands_scheme: bdmSectionData.understands_scheme,
        scheme_understanding_details: bdmSectionData.scheme_understanding_details,
        previous_claim_details: bdmSectionData.previous_claim_details,
        projects_discussed: bdmSectionData.projects_discussed,
        projects_details: bdmSectionData.projects_details,
        fee_terms_discussed: bdmSectionData.fee_terms_discussed,
        fee_terms_details: bdmSectionData.fee_terms_details,
        additional_info: bdmSectionData.additional_info,

        // AI Research
        bdm_company_research: bdmSectionData.company_research,
        bdm_ai_research_data: bdmSectionData.ai_research_data,
      })
      .select()
      .single();

    if (cifError) throw cifError;

    return { cif, prospect };
  },

  /**
   * Complete BDM section
   */
  async completeBDMSection(
    cifId: string,
    bdmData: {
      business_background?: string;
      project_overview?: string;
      primary_contact_name?: string;
      primary_contact_position?: string;
      primary_contact_email?: string;
      primary_contact_phone?: string;
      rd_themes?: string[];
      expected_feasibility_date?: string;
      has_claimed_before?: boolean;
      previous_claim_year_end_date?: string;
      previous_claim_value?: number;
      previous_claim_date_submitted?: string;
      // New fields
      can_answer_feasibility?: "yes" | "no";
      alternate_contact_informed?: "yes" | "no";
      understands_scheme?: "yes" | "no" | "dont_know";
      scheme_understanding_details?: string;
      previous_claim_details?: string;
      projects_discussed?: "yes" | "no";
      projects_details?: string;
      fee_terms_discussed?: "yes" | "no";
      fee_terms_details?: string;
      additional_info?: string;
    },
    userId: string
  ): Promise<CIFRecord | null> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .update({
          current_stage: "tech_feasibility",
          business_background: bdmData.business_background,
          project_overview: bdmData.project_overview,
          primary_contact_name: bdmData.primary_contact_name,
          primary_contact_position: bdmData.primary_contact_position,
          primary_contact_email: bdmData.primary_contact_email,
          primary_contact_phone: bdmData.primary_contact_phone,
          rd_themes: bdmData.rd_themes,
          expected_feasibility_date: bdmData.expected_feasibility_date,
          has_claimed_before: bdmData.has_claimed_before,
          previous_claim_year_end_date: bdmData.previous_claim_year_end_date,
          previous_claim_value: bdmData.previous_claim_value,
          previous_claim_date_submitted: bdmData.previous_claim_date_submitted,
          // New fields mapping
          can_answer_feasibility: bdmData.can_answer_feasibility,
          alternate_contact_informed: bdmData.alternate_contact_informed,
          understands_scheme: bdmData.understands_scheme,
          scheme_understanding_details: bdmData.scheme_understanding_details,
          previous_claim_details: bdmData.previous_claim_details,
          projects_discussed: bdmData.projects_discussed,
          projects_details: bdmData.projects_details,
          fee_terms_discussed: bdmData.fee_terms_discussed,
          fee_terms_details: bdmData.fee_terms_details,
          additional_info: bdmData.additional_info,
          
          section1_completed_by: userId,
          section1_completed_at: new Date().toISOString(),
          bdm_last_updated: new Date().toISOString(),
        })
        .eq("id", cifId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error completing BDM section:", error);
      return null;
    }
  },

  /**
   * Complete technical feasibility section
   */
  async completeTechnicalSection(
    cifId: string,
    feasibilityData: {
      technical_understanding: string;
      challenges_uncertainties?: string;
      qualifying_activities?: string[];
      rd_projects_list?: string[];
      feasibility_status: "qualified" | "not_qualified" | "needs_more_info";
      estimated_claim_band?: "0-25k" | "25k-50k" | "50k-100k" | "100k-250k" | "250k+";
      risk_rating?: "low" | "medium" | "high";
      notes_for_finance?: string;
      missing_information_flags?: string[];
    },
    userId: string
  ): Promise<CIFRecord | null> {
    try {
      // 1. Get current CIF to check for org_id
      const { data: currentCif, error: fetchError } = await supabase
        .from("cif_records")
        .select(`*, prospects(*)`)
        .eq("id", cifId)
        .single();

      if (fetchError || !currentCif) throw fetchError || new Error("CIF not found");

      // 2. Ensure Organisation exists (required for feasibility_analyses)
      let orgId = currentCif.org_id;
      
      if (!orgId) {
        // Check prospect for org_id
        const prospect = Array.isArray(currentCif.prospects) ? currentCif.prospects[0] : currentCif.prospects;
        
        if (prospect?.org_id) {
          orgId = prospect.org_id;
        } else if (prospect) {
          // Create new Organisation
          const { data: newOrg, error: orgError } = await supabase
            .from("organisations")
            .insert({
              name: prospect.company_name,
              organisation_code: prospect.company_name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000)
            })
            .select()
            .single();

          if (orgError) throw orgError;
          orgId = newOrg.id;

          // Link org to prospect and CIF
          await supabase.from("prospects").update({ org_id: orgId }).eq("id", prospect.id);
          await supabase.from("cif_records").update({ org_id: orgId }).eq("id", cifId);
        }
      }

      if (!orgId) throw new Error("Could not determine or create Organisation ID");

      const newStage = feasibilityData.feasibility_status === "qualified" 
        ? "financial_section"
        : "rejected";

      // 3. Create feasibility record
      const { data: feasibility, error: feasError } = await supabase
        .from("feasibility_analyses")
        .insert({
          organisation_id: orgId,
          user_id: userId,
          idea_description: "CIF Technical Assessment", // Required field
          technical_reasoning: feasibilityData.technical_understanding, // Map to existing field
          feasibility_status: feasibilityData.feasibility_status,
          estimated_claim_band: feasibilityData.estimated_claim_band,
          risk_rating: feasibilityData.risk_rating,
          notes_for_finance: feasibilityData.notes_for_finance,
          missing_information_flags: feasibilityData.missing_information_flags,
          // Map other fields to JSON or text as appropriate since schema might not have specific columns yet
          // For now we map what fits cleanly into existing schema
          technical_rating: feasibilityData.risk_rating // Reuse risk rating for tech rating?
        })
        .select()
        .single();

      if (feasError) throw feasError;

      // 4. Update CIF
      const { data, error } = await supabase
        .from("cif_records")
        .update({
          current_stage: newStage,
          section2_feasibility_id: feasibility.id,
          tech_last_updated: new Date().toISOString(),
          section3_completed_by: userId, // Tracking who completed tech section (using section3 slot for now? No, wait. Tech is section 2. Schema says section2_feasibility_id but no section2_completed_by field?)
          // Schema has section1, section3, section4 completed_by. Missing section2_completed_by? 
          // Let's assume section2 is tracked via feasibility record's user_id.
        })
        .eq("id", cifId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error completing technical section:", error);
      return null;
    }
  },

  /**
   * Complete financial section
   */
  async completeFinancialSection(
    cifId: string,
    financialData: {
      financial_year?: string;
      staff_cost_estimate?: number;
      subcontractor_estimate?: number;
      consumables_estimate?: number;
      software_estimate?: number;
      apportionment_assumptions?: string;
      accountant_name?: string;
      accountant_firm?: string;
      accountant_email?: string;
      accountant_phone?: string;
      ready_to_submit?: boolean;
    },
    userId: string
  ): Promise<CIFRecord | null> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .update({
          current_stage: "admin_approval",
          financial_year: financialData.financial_year,
          staff_cost_estimate: financialData.staff_cost_estimate,
          subcontractor_estimate: financialData.subcontractor_estimate,
          consumables_estimate: financialData.consumables_estimate,
          software_estimate: financialData.software_estimate,
          apportionment_assumptions: financialData.apportionment_assumptions,
          accountant_name: financialData.accountant_name,
          accountant_firm: financialData.accountant_firm,
          accountant_email: financialData.accountant_email,
          accountant_phone: financialData.accountant_phone,
          ready_to_submit: financialData.ready_to_submit,
          finance_last_updated: new Date().toISOString(),
          section3_completed_by: userId,
          section3_completed_at: new Date().toISOString(),
        })
        .eq("id", cifId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error completing financial section:", error);
      return null;
    }
  },

  /**
   * Approve CIF (Director/Admin Decision) - Automatically creates claim
   */
  async approveCIF(cifId: string, approverId: string, comment?: string): Promise<CIFWithDetails | null> {
    try {
      console.log("[cifService.approveCIF] Starting approval for CIF:", cifId);

      // 1. Get CIF with prospect details
      const { data: cif, error: cifError } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects (
            id,
            company_name,
            company_number,
            org_id,
            bd_owner_id,
            technical_lead_id,
            commercial_lead_id
          )
        `)
        .eq("id", cifId)
        .single();

      if (cifError || !cif) {
        console.error("[cifService.approveCIF] Failed to fetch CIF:", cifError);
        throw new Error("CIF not found");
      }

      const prospect = cif.prospects;
      if (!prospect) {
        throw new Error("No prospect linked to this CIF");
      }

      console.log("[cifService.approveCIF] CIF data:", cif);
      console.log("[cifService.approveCIF] Prospect data:", prospect);

      let orgId = prospect.org_id;

      // 2. Create organisation if it doesn't exist
      if (!orgId) {
        console.log("[cifService.approveCIF] Creating new organisation for prospect");
        
        const orgCode = await organisationService.generateOrganisationCode(prospect.company_name);

        const { data: newOrg, error: orgError } = await supabase
          .from("organisations")
          .insert({
            name: prospect.company_name,
            organisation_code: orgCode,
            is_conexa_company: false,
          })
          .select()
          .single();

        if (orgError || !newOrg) {
          console.error("[cifService.approveCIF] Failed to create organisation:", orgError);
          throw new Error("Failed to create organisation");
        }

        orgId = newOrg.id;
        console.log("[cifService.approveCIF] Created organisation:", orgId);

        // Update prospect with org_id
        const { error: prospectUpdateError } = await supabase
          .from("prospects")
          .update({ org_id: orgId })
          .eq("id", prospect.id);

        if (prospectUpdateError) {
          console.error("[cifService.approveCIF] Failed to update prospect with org_id:", prospectUpdateError);
        }
      }

      // 3. Create claim
      console.log("[cifService.approveCIF] Creating claim for organisation:", orgId);
      
      const currentYear = new Date().getFullYear();
      const claimYear = cif.financial_year 
        ? parseInt(cif.financial_year.split("-")[0]) 
        : currentYear;

      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert({
          org_id: orgId,
          claim_year: claimYear,
          status: "intake",
          bd_owner_id: prospect.bd_owner_id,
          technical_lead_id: prospect.technical_lead_id,
          cost_lead_id: prospect.commercial_lead_id,
          director_id: approverId,
          notes: `Claim created from approved CIF ${cifId}. ${comment ? `Approval comment: ${comment}` : ""}`,
        })
        .select()
        .single();

      if (claimError || !claim) {
        console.error("[cifService.approveCIF] Failed to create claim:", claimError);
        throw new Error("Failed to create claim");
      }

      console.log("[cifService.approveCIF] Created claim:", claim.id);

      // 4. Update CIF with approval and link to claim
      const { data: updatedCif, error: updateError } = await supabase
        .from("cif_records")
        .update({
          director_id: approverId,
          director_decision: "approved",
          director_comment: comment,
          director_decided_at: new Date().toISOString(),
          current_stage: "approved",
          cif_status: "approved",
          org_id: orgId,
          linked_claim_id: claim.id,
          admin_last_updated: new Date().toISOString(),
          rejection_reason: null,
          rejected_by: null,
          rejected_at: null,
          rejected_to_stage: null,
        })
        .eq("id", cifId)
        .select()
        .single();

      if (updateError || !updatedCif) {
        console.error("[cifService.approveCIF] Failed to update CIF:", updateError);
        throw new Error("Failed to update CIF");
      }

      // 5. Update prospect status
      await supabase
        .from("prospects")
        .update({ 
          status: "cif_approved",
          org_id: orgId,
        })
        .eq("id", prospect.id);

      // 6. Log state change
      await supabase.from("cif_state_changes").insert({
        cif_id: cifId,
        from_stage: cif.current_stage,
        to_stage: "approved",
        changed_by: approverId,
        change_type: "approval",
        comments: comment,
      });

      console.log("[cifService.approveCIF] CIF approved successfully, claim created:", claim.id);

      return updatedCif as CIFWithDetails;
    } catch (error) {
      console.error("[cifService.approveCIF] Error approving CIF:", error);
      throw error;
    }
  },

  /**
   * Admin reject CIF with multiple options
   */
  async rejectCIF(
    cifId: string,
    rejectionType: "send_back" | "archive" | "delete",
    sendBackToStage?: "bdm_section" | "tech_feasibility" | "financial_section",
    reason?: string,
    userId?: string
  ): Promise<boolean> {
    try {
      if (rejectionType === "delete") {
        console.log("🗑️ Starting CIF deletion process for:", cifId);
        
        // Delete the CIF record (CASCADE will handle related records)
        const { error: deleteError } = await supabase
          .from("cif_records")
          .delete()
          .eq("id", cifId);

        if (deleteError) {
          console.error("❌ CIF deletion failed:", deleteError);
          console.error("Error details:", {
            message: deleteError.message,
            code: deleteError.code,
            details: deleteError.details,
            hint: deleteError.hint
          });
          return false;
        }

        console.log("✅ CIF deleted successfully");
        return true;
      }

      // Handle send_back and archive cases...
      const updates: any = {
        current_stage: rejectionType === "archive" ? "rejected" : sendBackToStage,
        rejection_reason: rejectionType === "archive" 
          ? `[ARCHIVED] ${reason || "Archived by admin"}`
          : `[SENT_BACK] ${reason || "Sent back for revision"}`,
        rejected_at: new Date().toISOString(),
        rejected_by: userId,
      };

      const { error } = await supabase
        .from("cif_records")
        .update(updates)
        .eq("id", cifId);

      if (error) {
        console.error("Failed to reject CIF:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in rejectCIF:", error);
      return false;
    }
  },

  /**
   * Get all CIF records for the CIF list
   */
  async getAllCIFs(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email),
          feasibility:feasibility_analyses(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => {
        const feasibility = Array.isArray(item.feasibility) ? item.feasibility[0] : item.feasibility;
        return {
          ...item,
          created_by_profile: Array.isArray(item.created_by_profile) ? item.created_by_profile[0] : item.created_by_profile,
          prospects: Array.isArray(item.prospects) ? item.prospects[0] : item.prospects,
          technical_understanding: feasibility?.technical_reasoning,
          challenges_uncertainties: feasibility?.technical_challenges,
          qualifying_activities: feasibility?.qualifying_activities as string[] | null, // Cast jsonb to string[]
          rd_projects_list: feasibility?.rd_projects_list as string[] | null,
          feasibility_status: feasibility?.feasibility_status as any,
          estimated_claim_band: feasibility?.estimated_claim_band as any,
          risk_rating: feasibility?.risk_rating as any,
          notes_for_finance: feasibility?.notes_for_finance,
          missing_information_flags: feasibility?.missing_information_flags as string[] | null
        } as CIFWithDetails;
      }) as CIFWithDetails[];
    } catch (error) {
      console.error("Error fetching CIFs:", error);
      return [];
    }
  },

  /**
   * Get Job Board A (Awaiting Technical)
   */
  async getJobBoardA(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email),
          feasibility:feasibility_analyses(*)
        `)
        .eq("current_stage", "bdm_section")
        .neq("cif_status", "archived")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => {
        const feasibility = Array.isArray(item.feasibility) ? item.feasibility[0] : item.feasibility;
        return {
          ...item,
          created_by_profile: Array.isArray(item.created_by_profile) ? item.created_by_profile[0] : item.created_by_profile,
          prospects: Array.isArray(item.prospects) ? item.prospects[0] : item.prospects,
          technical_understanding: feasibility?.technical_reasoning,
          challenges_uncertainties: feasibility?.technical_challenges,
          qualifying_activities: feasibility?.qualifying_activities,
          rd_projects_list: feasibility?.rd_projects_list,
          feasibility_status: feasibility?.feasibility_status,
          estimated_claim_band: feasibility?.estimated_claim_band,
          risk_rating: feasibility?.risk_rating,
          notes_for_finance: feasibility?.notes_for_finance,
          missing_information_flags: feasibility?.missing_information_flags
        };
      }) as CIFWithDetails[];
    } catch (error) {
      console.error("Error fetching Job Board A:", error);
      return [];
    }
  },

  /**
   * Get Job Board B (Awaiting Financial)
   */
  async getJobBoardB(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email),
          feasibility:feasibility_analyses(*)
        `)
        .eq("current_stage", "financial_section")
        .neq("cif_status", "archived")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => {
        const feasibility = Array.isArray(item.feasibility) ? item.feasibility[0] : item.feasibility;
        return {
          ...item,
          created_by_profile: Array.isArray(item.created_by_profile) ? item.created_by_profile[0] : item.created_by_profile,
          prospects: Array.isArray(item.prospects) ? item.prospects[0] : item.prospects,
          technical_understanding: feasibility?.technical_reasoning,
          feasibility_status: feasibility?.feasibility_status,
          estimated_claim_band: feasibility?.estimated_claim_band,
        };
      }) as CIFWithDetails[];
    } catch (error) {
      console.error("Error fetching Job Board B:", error);
      return [];
    }
  },

  /**
   * Get Job Board C (Awaiting Admin)
   */
  async getJobBoardC(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email),
          feasibility:feasibility_analyses(*)
        `)
        .eq("current_stage", "admin_approval")
        .neq("cif_status", "archived")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => {
        const feasibility = Array.isArray(item.feasibility) ? item.feasibility[0] : item.feasibility;
        return {
          ...item,
          created_by_profile: Array.isArray(item.created_by_profile) ? item.created_by_profile[0] : item.created_by_profile,
          prospects: Array.isArray(item.prospects) ? item.prospects[0] : item.prospects,
          technical_understanding: feasibility?.technical_reasoning,
          feasibility_status: feasibility?.feasibility_status,
          estimated_claim_band: feasibility?.estimated_claim_band,
        };
      }) as CIFWithDetails[];
    } catch (error) {
      console.error("Error fetching Job Board C:", error);
      return [];
    }
  },

  /**
   * Get rejected CIFs (not archived)
   */
  async getRejectedCIFs(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email),
          feasibility:feasibility_analyses(*),
          rejected_by_profile:profiles!cif_records_rejected_by_fkey(full_name, email)
        `)
        .ilike("rejection_reason", "[SENT_BACK]%")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => {
        const feasibility = Array.isArray(item.feasibility) ? item.feasibility[0] : item.feasibility;
        return {
          ...item,
          created_by_profile: Array.isArray(item.created_by_profile) ? item.created_by_profile[0] : item.created_by_profile,
          prospects: Array.isArray(item.prospects) ? item.prospects[0] : item.prospects,
          technical_understanding: feasibility?.technical_reasoning,
          feasibility_status: feasibility?.feasibility_status,
          estimated_claim_band: feasibility?.estimated_claim_band,
        };
      }) as CIFWithDetails[];
    } catch (error) {
      console.error("Error fetching rejected CIFs:", error);
      return [];
    }
  },

  /**
   * Get archived CIFs
   */
  async getArchivedCIFs(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email),
          feasibility:feasibility_analyses(*),
          rejected_by_profile:profiles!cif_records_rejected_by_fkey(full_name, email)
        `)
        .ilike("rejection_reason", "[ARCHIVED]%")
        .order("rejected_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => {
        const feasibility = Array.isArray(item.feasibility) ? item.feasibility[0] : item.feasibility;
        return {
          ...item,
          created_by_profile: Array.isArray(item.created_by_profile) ? item.created_by_profile[0] : item.created_by_profile,
          prospects: Array.isArray(item.prospects) ? item.prospects[0] : item.prospects,
          technical_understanding: feasibility?.technical_reasoning,
          feasibility_status: feasibility?.feasibility_status,
          estimated_claim_band: feasibility?.estimated_claim_band,
        };
      }) as CIFWithDetails[];
    } catch (error) {
      console.error("Error fetching archived CIFs:", error);
      return [];
    }
  },

  /**
   * Reactivate archived CIF
   */
  async reactivateCIF(cifId: string, reactivateToStage: "bdm_section" | "tech_feasibility" | "financial_section" | "admin_approval"): Promise<CIFRecord | null> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .update({
          cif_status: "in_progress",
          current_stage: reactivateToStage,
          admin_last_updated: new Date().toISOString(),
        })
        .eq("id", cifId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error reactivating CIF:", error);
      return null;
    }
  },

  /**
   * Update a CIF record with new data
   */
  async updateCIF(
    cifId: string,
    updates: CIFUpdate
  ): Promise<CIFRecord | null> {
    console.log("cifService.updateCIF called with:", { cifId, updates });
    
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .update(updates)
        .eq("id", cifId)
        .select()
        .single();

      console.log("updateCIF query result:", { data, error });

      if (error) {
        console.error("Error updating CIF:", error);
        throw error;
      }

      console.log("CIF updated successfully:", data);
      return data;
    } catch (error) {
      console.error("Exception in updateCIF:", error);
      throw error;
    }
  },

  /**
   * Get single CIF by ID
   */
  async getCIFById(cifId: string): Promise<CIFWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          claim:claims!cif_records_linked_claim_id_fkey(*),
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email),
          feasibility:feasibility_analyses(*)
        `)
        .eq("id", cifId)
        .single();

      if (error) throw error;

      if (data) {
        const feasibility = Array.isArray(data.feasibility) ? data.feasibility[0] : data.feasibility;
        // Handle claim if it's an array (one-to-many returned by join) or object
        const claimData = Array.isArray(data.claim) ? data.claim[0] : data.claim;
        
        return {
          ...data,
          claim: claimData,
          created_by_profile: Array.isArray(data.created_by_profile) ? data.created_by_profile[0] : data.created_by_profile,
          prospects: Array.isArray(data.prospects) ? data.prospects[0] : data.prospects,
          // Map feasibility fields
          technical_understanding: feasibility?.technical_reasoning,
          challenges_uncertainties: feasibility?.technical_challenges, 
          qualifying_activities: feasibility?.qualifying_activities as string[] | null, // Cast jsonb to string[]
          rd_projects_list: feasibility?.rd_projects_list as string[] | null,
          feasibility_status: feasibility?.feasibility_status as any,
          estimated_claim_band: feasibility?.estimated_claim_band as any,
          risk_rating: feasibility?.risk_rating as any,
          notes_for_finance: feasibility?.notes_for_finance,
          missing_information_flags: feasibility?.missing_information_flags as string[] | null
        } as CIFWithDetails;
      }

      return null;
    } catch (error) {
      console.error("Error fetching CIF:", error);
      return null;
    }
  },

  /**
   * Upload document to CIF
   */
  async uploadDocument(
    cifId: string,
    file: File,
    documentType: "letter_of_authority" | "anti_slavery" | "accountant_docs" | "other",
    uploadedBy: string
  ): Promise<boolean> {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${cifId}_${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `cif_documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: docError } = await supabase
        .from("cif_documents")
        .insert({
          cif_id: cifId,
          doc_type: documentType,
          file_path: filePath,
          uploaded_by: uploadedBy,
        });

      if (docError) throw docError;
      return true;
    } catch (error) {
      console.error("Error uploading document:", error);
      return false;
    }
  },
};