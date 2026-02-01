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
      // Clean company number (remove spaces, convert to uppercase)
      const cleanNumber = companyNumber.replace(/\s/g, "").toUpperCase();

      // Call Companies House API via our Next.js API route (to hide API key)
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
   * Check if company is active (not dissolved/inactive)
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
      // 1. Create prospect record
      const { data: prospect, error: prospectError } = await supabase
        .from("prospects")
        .insert(data.prospectData)
        .select()
        .single();

      if (prospectError) throw prospectError;

      // 2. Create CIF record with BDM section completed
      const cifData: CIFInsert = {
        prospect_id: prospect.id,
        created_by: data.createdBy,
        stage: "awaiting_technical",
        section_a_complete: true,
        section_b_complete: false,
        section_c_complete: false,
        section_d_complete: false,
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
   * Complete technical feasibility section (TECH role)
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
    userId: string
  ): Promise<CIFRecord | null> {
    try {
      // Update CIF stage based on qualification
      const newStage = feasibilityData.feasibility_status === "qualified" 
        ? "awaiting_financial" 
        : "rejected";

      const { data, error } = await supabase
        .from("cif_records")
        .update({
          stage: newStage,
          section_b_complete: true,
          tech_last_updated: new Date().toISOString(),
        })
        .eq("id", cifId)
        .select()
        .single();

      if (error) throw error;

      // Create feasibility analysis record
      await supabase.from("feasibility_analyses").insert({
        prospect_id: data.prospect_id,
        analysed_by: userId,
        technical_understanding: feasibilityData.technical_understanding,
        challenges_uncertainties: feasibilityData.challenges_uncertainties,
        qualifying_activities: feasibilityData.qualifying_activities,
        rd_projects_list: feasibilityData.rd_projects_list,
        feasibility_status: feasibilityData.feasibility_status,
        estimated_claim_band: feasibilityData.estimated_claim_band,
        risk_rating: feasibilityData.risk_rating,
        notes_for_finance: feasibilityData.notes_for_finance,
        missing_information_flags: feasibilityData.missing_information_flags,
      });

      return data;
    } catch (error) {
      console.error("Error completing technical section:", error);
      return null;
    }
  },

  /**
   * Complete financial section (FINANCE role)
   */
  async completeFinancialSection(
    cifId: string,
    financialData: {
      financial_years?: string[];
      staff_cost_estimates?: number;
      subcontractor_estimates?: number;
      consumables_estimates?: number;
      software_estimates?: number;
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
          stage: "awaiting_admin",
          section_c_complete: true,
          financial_years: financialData.financial_years,
          staff_cost_estimates: financialData.staff_cost_estimates,
          subcontractor_estimates: financialData.subcontractor_estimates,
          consumables_estimates: financialData.consumables_estimates,
          software_estimates: financialData.software_estimates,
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
      // 1. Get CIF with prospect data
      const { data: cif, error: cifError } = await supabase
        .from("cif_records")
        .select("*, prospects(*)")
        .eq("id", cifId)
        .single();

      if (cifError) throw cifError;

      const prospect = Array.isArray(cif.prospects) ? cif.prospects[0] : cif.prospects;
      if (!prospect) throw new Error("Prospect not found");

      // 2. Determine claim year (use first financial year or current year)
      const claimYear = cif.financial_years && cif.financial_years.length > 0
        ? cif.financial_years[0]
        : new Date().getFullYear().toString();

      // 3. Create claim record
      const claimTitle = `${prospect.company_name} ${claimYear} Claim`;
      
      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert({
          prospect_id: prospect.id,
          title: claimTitle,
          claim_year: claimYear,
          status: "active",
          created_by: adminUserId,
        })
        .select()
        .single();

      if (claimError) throw claimError;

      // 4. Update CIF to approved and link claim
      const { data: updatedCif, error: updateError } = await supabase
        .from("cif_records")
        .update({
          stage: "approved",
          section_d_complete: true,
          linked_claim_id: claim.id,
          admin_last_updated: new Date().toISOString(),
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
   * Admin reject CIF back to a specific stage
   */
  async rejectCIF(
    cifId: string,
    rejectToStage: "awaiting_bdm" | "awaiting_technical" | "awaiting_financial" | "rejected",
    reason?: string
  ): Promise<CIFRecord | null> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .update({
          stage: rejectToStage,
          admin_last_updated: new Date().toISOString(),
        })
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
   * Get CIFs for Job Board A (Awaiting Technical)
   */
  async getJobBoardA(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_created_by_fkey(full_name, email)
        `)
        .eq("stage", "awaiting_technical")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching Job Board A:", error);
      return [];
    }
  },

  /**
   * Get CIFs for Job Board B (Awaiting Financial)
   */
  async getJobBoardB(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_created_by_fkey(full_name, email)
        `)
        .eq("stage", "awaiting_financial")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching Job Board B:", error);
      return [];
    }
  },

  /**
   * Get CIFs for Job Board C (Awaiting Admin)
   */
  async getJobBoardC(): Promise<CIFWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_created_by_fkey(full_name, email)
        `)
        .eq("stage", "awaiting_admin")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
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
          created_by_profile:profiles!cif_records_created_by_fkey(full_name, email)
        `)
        .eq("stage", "rejected")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching rejected CIFs:", error);
      return [];
    }
  },

  /**
   * Get single CIF by ID with all details
   */
  async getCIFById(cifId: string): Promise<CIFWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*),
          created_by_profile:profiles!cif_records_created_by_fkey(full_name, email)
        `)
        .eq("id", cifId)
        .single();

      if (error) throw error;
      return data;
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
    prospectId: string,
    file: File,
    documentType: "letter_of_authority" | "anti_slavery" | "accountant_docs" | "other",
    uploadedBy: string
  ): Promise<boolean> {
    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${cifId}_${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `cif_documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Create document record
      const { error: docError } = await supabase
        .from("cif_documents")
        .insert({
          prospect_id: prospectId,
          document_type: documentType,
          file_path: filePath,
          file_name: file.name,
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