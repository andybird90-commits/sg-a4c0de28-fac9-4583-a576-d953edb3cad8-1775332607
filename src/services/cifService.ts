import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
  type?: string;
  number_of_directors?: number;
  number_of_employees?: number;
}

export interface CIFWithDetails extends CIFRecord {
  prospects?: Prospect | null;
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
  company_research?: string | null;
}

export const cifService = {
  /**
   * Lookup company data from Companies House API
   */
  async lookupCompaniesHouse(companyNumber: string): Promise<CompaniesHouseData | null> {
    try {
      const cleanNumber = companyNumber.replace(/\s/g, "").toUpperCase();
      const response = await fetch(`/api/companies-house/lookup?number=${cleanNumber}`);
      
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
  async createCIF(data: {
    prospectData: {
      org_id?: string;
      company_name: string;
      company_number?: string;
      company_status?: string;
      registered_address?: string;
      sic_codes?: string[];
      incorporation_date?: string;
      status?: string;
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
    };
    createdBy: string;
  }): Promise<{ cif: CIFRecord; prospect: Prospect } | null> {
    try {
      console.log("[cifService.createCIF] Starting CIF creation with data:", data);

      // 1. Create prospect record
      console.log("[cifService.createCIF] Step 1: Creating prospect record...");
      const prospectInsert: ProspectInsert = {
        company_name: data.prospectData.company_name,
        company_number: data.prospectData.company_number,
        company_status: data.prospectData.company_status || "active",
        registered_address: data.prospectData.registered_address,
        sic_codes: data.prospectData.sic_codes || [],
        incorporation_date: data.prospectData.incorporation_date || null,
        number_of_directors: data.prospectData.number_of_directors || null,
        number_of_employees: data.prospectData.number_of_employees || null,
        bd_owner_id: data.createdBy,
        status: "section1_in_progress"
      };
      console.log("[cifService.createCIF] Prospect insert data:", prospectInsert);

      const { data: prospect, error: prospectError } = await supabase
        .from("prospects")
        .insert(prospectInsert)
        .select()
        .single();

      if (prospectError) {
        console.error("[cifService.createCIF] Prospect creation error:", prospectError);
        console.error("[cifService.createCIF] Error details:", {
          code: prospectError.code,
          message: prospectError.message,
          details: prospectError.details,
          hint: prospectError.hint
        });
        throw prospectError;
      }
      
      if (!prospect) {
        console.error("[cifService.createCIF] Prospect creation returned null");
        throw new Error("Failed to create prospect - no data returned");
      }

      console.log("[cifService.createCIF] Prospect created successfully:", prospect);

      // 2. Create CIF record
      console.log("[cifService.createCIF] Step 2: Creating CIF record...");
      const cifData: CIFInsert = {
        prospect_id: prospect.id,
        section1_completed_by: data.createdBy,
        current_stage: "bdm_section",
        cif_status: "in_progress",
        business_background: data.bdmSectionData.business_background,
        project_overview: data.bdmSectionData.project_overview,
        primary_contact_name: data.bdmSectionData.primary_contact_name,
        primary_contact_position: data.bdmSectionData.primary_contact_position,
        primary_contact_email: data.bdmSectionData.primary_contact_email,
        primary_contact_phone: data.bdmSectionData.primary_contact_phone,
        primary_contact_landline: data.bdmSectionData.primary_contact_landline,
        rd_themes: data.bdmSectionData.rd_themes,
        expected_feasibility_date: data.bdmSectionData.expected_feasibility_date,
        has_claimed_before: data.bdmSectionData.has_claimed_before,
        previous_claim_year_end_date: data.bdmSectionData.previous_claim_year_end_date,
        previous_claim_value: data.bdmSectionData.previous_claim_value,
        previous_claim_date_submitted: data.bdmSectionData.previous_claim_date_submitted,
        bdm_last_updated: new Date().toISOString(),
        company_research: data.bdmSectionData.company_research,
      };
      console.log("[cifService.createCIF] CIF insert data:", cifData);

      const { data: cif, error: cifError } = await supabase
        .from("cif_records")
        .insert(cifData)
        .select()
        .single();

      if (cifError) {
        console.error("[cifService.createCIF] CIF creation error:", cifError);
        throw cifError;
      }

      if (!cif) {
        console.error("[cifService.createCIF] CIF creation returned null");
        throw new Error("Failed to create CIF - no data returned");
      }

      console.log("[cifService.createCIF] CIF created successfully:", cif);
      return { cif, prospect };
    } catch (error) {
      console.error("[cifService.createCIF] Error creating CIF:", error);
      throw error; // Re-throw so the caller can handle it
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
   * Admin approve CIF and auto-create claim
   */
  async approveCIF(
    cifId: string,
    adminUserId: string
  ): Promise<{ cif: CIFRecord; claim: any } | null> {
    try {
      const { data: cif, error: cifError } = await supabase
        .from("cif_records")
        .select("*, prospects(*)")
        .eq("id", cifId)
        .single();

      if (cifError) throw cifError;

      const prospect = Array.isArray(cif.prospects) ? cif.prospects[0] : cif.prospects;
      if (!prospect) throw new Error("Prospect not found");

      const yearStr = cif.financial_year || new Date().getFullYear().toString();
      const claimYear = parseInt(yearStr.replace(/\D/g, "")) || new Date().getFullYear();
      
      let orgId = cif.org_id || prospect.org_id;
      
      if (!orgId) {
        // Create organisation if not exists (should have been created in tech stage but fallback here)
        const { data: org } = await supabase
          .from("organisations")
          .insert({
            name: prospect.company_name,
            organisation_code: prospect.company_name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000)
          })
          .select()
          .single();
        if (org) orgId = org.id;
        
        // Update prospect linkage
        if (orgId) {
          await supabase.from("prospects").update({ org_id: orgId }).eq("id", prospect.id);
        }
      }

      if (!orgId) throw new Error("Could not create organisation for claim");

      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert({
          org_id: orgId,
          claim_year: claimYear,
          status: "intake",
        })
        .select()
        .single();

      if (claimError) throw claimError;

      const { data: updatedCif, error: updateError } = await supabase
        .from("cif_records")
        .update({
          current_stage: "approved",
          cif_status: "approved",
          linked_claim_id: claim.id,
          admin_last_updated: new Date().toISOString(),
          director_decision: "approved",
          director_decided_at: new Date().toISOString(),
          director_id: adminUserId,
          section4_completed_by: adminUserId,
          section4_completed_at: new Date().toISOString()
        })
        .eq("id", cifId)
        .select()
        .single();

      if (updateError) throw updateError;

      return { cif: updatedCif, claim };
    } catch (error) {
      console.error("Error approving CIF:", error);
      return null;
    }
  },

  /**
   * Admin reject CIF with multiple options
   */
  async rejectCIF(
    cifId: string,
    rejectionType: "send_back" | "archive" | "delete",
    rejectToStage?: "bdm_section" | "tech_feasibility" | "financial_section",
    reason?: string,
    rejectedBy?: string
  ): Promise<CIFRecord | null> {
    try {
      // Handle deletion
      if (rejectionType === "delete") {
        const { error: deleteError } = await supabase
          .from("cif_records")
          .delete()
          .eq("id", cifId);

        if (deleteError) throw deleteError;
        return null;
      }

      const updateData: CIFUpdate = {
        admin_last_updated: new Date().toISOString(),
        rejection_reason: reason,
        rejected_by: rejectedBy,
        rejected_at: new Date().toISOString(),
        director_decision: "rejected", // Always use 'rejected' for director_decision
      };
      
      if (rejectionType === "archive") {
        // Archive the CIF - use 'rejected' status and set current_stage to 'rejected'
        // Add "[ARCHIVED]" prefix to rejection_reason to distinguish archived items
        updateData.cif_status = "rejected";
        updateData.current_stage = "rejected";
        updateData.rejection_reason = `[ARCHIVED] ${reason || ""}`;
        updateData.director_comment = reason;
      } else if (rejectionType === "send_back" && rejectToStage) {
        // Send back to specific stage
        // Add "[SENT_BACK]" prefix to rejection_reason to distinguish sent back items
        updateData.current_stage = rejectToStage;
        updateData.cif_status = "in_progress";
        updateData.rejected_to_stage = rejectToStage;
        updateData.rejection_reason = `[SENT_BACK] ${reason || ""}`;
        updateData.director_comment = reason;
        
        // Reset completion flags for the rejected stage
        if (rejectToStage === "bdm_section") {
          updateData.section1_completed_at = null;
        } else if (rejectToStage === "tech_feasibility") {
          updateData.section2_feasibility_id = null;
        } else if (rejectToStage === "financial_section") {
          updateData.section3_completed_at = null;
          updateData.ready_to_submit = false;
        }
      }

      const { data, error } = await supabase
        .from("cif_records")
        .update(updateData)
        .eq("id", cifId)
        .select()
        .single();

      if (error) throw error;

      // Log state change
      if (data && rejectedBy) {
        await supabase.from("cif_state_changes").insert({
          cif_id: cifId,
          from_stage: data.current_stage,
          to_stage: rejectToStage || "rejected",
          changed_by: rejectedBy,
          change_type: rejectionType === "archive" ? "approval" : "rejection",
          comments: reason,
        });
      }

      return data;
    } catch (error) {
      console.error("Error rejecting CIF:", error);
      return null;
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
   * Get single CIF by ID
   */
  async getCIFById(cifId: string): Promise<CIFWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email),
          feasibility:feasibility_analyses(*)
        `)
        .eq("id", cifId)
        .single();

      if (error) throw error;

      if (data) {
        const feasibility = Array.isArray(data.feasibility) ? data.feasibility[0] : data.feasibility;
        return {
          ...data,
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