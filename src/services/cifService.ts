import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CIFRecord = Database["public"]["Tables"]["cif_records"]["Row"];
type CIFInsert = Database["public"]["Tables"]["cif_records"]["Insert"];
type CIFUpdate = Database["public"]["Tables"]["cif_records"]["Update"];
type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type ProspectInsert = Database["public"]["Tables"]["prospects"]["Insert"];

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
}

export interface CIFWithDetails extends CIFRecord {
  prospects?: Prospect;
  created_by_profile?: {
    full_name: string;
    email: string;
  };
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
    prospectData: ProspectInsert;
    bdmSectionData: {
      business_background?: string;
      project_overview?: string;
      primary_contact_name?: string;
      primary_contact_email?: string;
      primary_contact_phone?: string;
      rd_themes?: string[];
      expected_feasibility_date?: string;
    };
    createdBy: string;
  }): Promise<{ cif: CIFRecord; prospect: Prospect } | null> {
    try {
      const { data: prospect, error: prospectError } = await supabase
        .from("prospects")
        .insert(data.prospectData)
        .select()
        .single();

      if (prospectError) throw prospectError;

      const cifData: CIFInsert = {
        prospect_id: prospect.id,
        section1_completed_by: data.createdBy,
        current_stage: "bdm_section",
        cif_status: "in_progress",
        business_background: data.bdmSectionData.business_background,
        project_overview: data.bdmSectionData.project_overview,
        primary_contact_name: data.bdmSectionData.primary_contact_name,
        primary_contact_email: data.bdmSectionData.primary_contact_email,
        primary_contact_phone: data.bdmSectionData.primary_contact_phone,
        rd_themes: data.bdmSectionData.rd_themes,
        expected_feasibility_date: data.bdmSectionData.expected_feasibility_date,
        bdm_last_updated: new Date().toISOString(),
      };

      const { data: cif, error: cifError } = await supabase
        .from("cif_records")
        .insert(cifData)
        .select()
        .single();

      if (cifError) throw cifError;

      return { cif, prospect };
    } catch (error) {
      console.error("Error creating CIF:", error);
      return null;
    }
  },

  /**
   * Complete technical feasibility section
   */
  async completeTechnicalSection(
    cifId: string,
    feasibilityData: {
      technical_understanding?: string;
      challenges_uncertainties?: string;
      qualifying_activities?: string[];
      rd_projects_list?: string[];
      feasibility_status: "qualified" | "not_qualified";
      estimated_claim_band?: string;
      risk_rating?: string;
      notes_for_finance?: string;
      missing_information_flags?: string[];
    },
    userId: string,
    organisationId: string
  ): Promise<CIFRecord | null> {
    try {
      const newStage = feasibilityData.feasibility_status === "qualified" 
        ? "financial_section"
        : "rejected";

      const { data: feasibility, error: feasError } = await supabase
        .from("feasibility_analyses")
        .insert({
          organisation_id: organisationId,
          user_id: userId,
          technical_understanding: feasibilityData.technical_understanding,
          challenges_uncertainties: feasibilityData.challenges_uncertainties,
          qualifying_activities: feasibilityData.qualifying_activities,
          rd_projects_list: feasibilityData.rd_projects_list,
          feasibility_status: feasibilityData.feasibility_status,
          estimated_claim_band: feasibilityData.estimated_claim_band,
          risk_rating: feasibilityData.risk_rating,
          notes_for_finance: feasibilityData.notes_for_finance,
          missing_information_flags: feasibilityData.missing_information_flags,
        })
        .select()
        .single();

      if (feasError) throw feasError;

      const { data, error } = await supabase
        .from("cif_records")
        .update({
          current_stage: newStage,
          section2_feasibility_id: feasibility.id,
          tech_last_updated: new Date().toISOString(),
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
    }
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
      const claimTitle = `${prospect.company_name} ${yearStr} Claim`;
      
      let orgId = prospect.org_id;
      if (!orgId) {
        const { data: org } = await supabase
          .from("organisations")
          .insert({
            name: prospect.company_name,
            organisation_code: prospect.company_name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000)
          })
          .select()
          .single();
        if (org) orgId = org.id;
      }

      if (!orgId) throw new Error("Could not create organisation for claim");

      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert({
          org_id: orgId,
          title: claimTitle,
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
          director_decided_at: new Date().toISOString()
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
   * Admin reject CIF
   */
  async rejectCIF(
    cifId: string,
    rejectToStage: "bdm_section" | "tech_feasibility" | "financial_section" | "rejected",
    reason?: string
  ): Promise<CIFRecord | null> {
    try {
      const updateData: any = {
        admin_last_updated: new Date().toISOString(),
      };
      
      if (rejectToStage === "rejected") {
        updateData.cif_status = "rejected";
        updateData.current_stage = "rejected";
        updateData.director_decision = "rejected";
      } else {
        updateData.current_stage = rejectToStage;
        updateData.cif_status = "in_progress";
      }

      const { data, error } = await supabase
        .from("cif_records")
        .update(updateData)
        .eq("id", cifId)
        .select()
        .single();

      if (error) throw error;
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
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email)
        `)
        .eq("current_stage", "bdm_section")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        created_by_profile: Array.isArray(item.created_by_profile) 
          ? item.created_by_profile[0] 
          : item.created_by_profile
      })) as CIFWithDetails[];
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
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email)
        `)
        .eq("current_stage", "tech_feasibility")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        created_by_profile: Array.isArray(item.created_by_profile) 
          ? item.created_by_profile[0] 
          : item.created_by_profile
      })) as CIFWithDetails[];
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
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email)
        `)
        .eq("current_stage", "financial_section")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        created_by_profile: Array.isArray(item.created_by_profile) 
          ? item.created_by_profile[0] 
          : item.created_by_profile
      })) as CIFWithDetails[];
    } catch (error) {
      console.error("Error fetching Job Board C:", error);
      return [];
    }
  },

  /**
   * Get rejected CIFs
   */
  async getRejectedCIFs(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email)
        `)
        .eq("current_stage", "rejected")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        created_by_profile: Array.isArray(item.created_by_profile) 
          ? item.created_by_profile[0] 
          : item.created_by_profile
      })) as CIFWithDetails[];
    } catch (error) {
      console.error("Error fetching rejected CIFs:", error);
      return [];
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
          created_by_profile:profiles!cif_records_section1_completed_by_fkey(full_name, email)
        `)
        .eq("id", cifId)
        .single();

      if (error) throw error;

      if (data) {
        return {
          ...data,
          created_by_profile: Array.isArray(data.created_by_profile) 
            ? data.created_by_profile[0] 
            : data.created_by_profile
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