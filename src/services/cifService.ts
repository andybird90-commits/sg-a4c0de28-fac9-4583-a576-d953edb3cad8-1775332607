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
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
    };
    bdmSectionData: {
      primary_contact_name?: string;
      primary_contact_position?: string;
      primary_contact_email?: string;
      primary_contact_phone?: string;
      primary_contact_landline?: string;
      number_of_employees?: number;
      rd_themes?: string[];
      expected_feasibility_date?: string;
      has_claimed_before?: boolean | null;
      previous_claim_year_end_date?: string;
      previous_claim_value?: string | number;
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
    // 1. Create Prospect
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
        contact_name: prospectData.contact_name,
        contact_email: prospectData.contact_email,
        contact_phone: prospectData.contact_phone,
        bd_owner_id: createdBy,
      })
      .select()
      .single();

    if (prospectError) throw prospectError;

    // 2. Create CIF Record
    const { data: cif, error: cifError } = await supabase
      .from("cif_records")
      .insert({
        prospect_id: prospect.id,
        created_by: createdBy,
        current_stage: "bdm_section",
        
        // BDM Section Data
        bdm_primary_contact_name: bdmSectionData.primary_contact_name,
        bdm_primary_contact_position: bdmSectionData.primary_contact_position,
        bdm_primary_contact_email: bdmSectionData.primary_contact_email,
        bdm_primary_contact_phone: bdmSectionData.primary_contact_phone,
        bdm_primary_contact_landline: bdmSectionData.primary_contact_landline,
        bdm_rd_themes: bdmSectionData.rd_themes,
        bdm_expected_feasibility_date: bdmSectionData.expected_feasibility_date,
        has_claimed_before: bdmSectionData.has_claimed_before,
        previous_claim_year_end_date: bdmSectionData.previous_claim_year_end_date,
        previous_claim_value: bdmSectionData.previous_claim_value ? Number(bdmSectionData.previous_claim_value) : null,
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
   * Complete Feasibility Section (Merged Technical + Financial)
   */
  async completeFeasibilitySection(
    cifId: string,
    feasibilityData: {
      completed_by_name: string;
      feasibility_call_date: string;
      any_issues_gathering_info: "yes" | "no";
      issues_gathering_info_details?: string;
      utr?: string;
      turnover?: number;
      payroll?: number;
      vat_number?: string;
      paye_reference?: string;
      competent_professional_1_name?: string;
      competent_professional_1_position?: string;
      competent_professional_1_mobile?: string;
      competent_professional_1_email?: string;
      competent_professional_2_name?: string;
      competent_professional_2_position?: string;
      competent_professional_2_mobile?: string;
      competent_professional_2_email?: string;
      competent_professional_3_name?: string;
      competent_professional_3_position?: string;
      competent_professional_3_mobile?: string;
      competent_professional_3_email?: string;
      technical_understanding?: string;
      challenges_uncertainties?: string;
      qualifying_activities?: string[];
      rd_projects_list?: string[];
      feasibility_status?: "qualified" | "not_qualified" | "needs_more_info";
      estimated_claim_band?: "0-25k" | "25k-50k" | "50k-100k" | "100k-250k" | "250k+";
      risk_rating?: "low" | "medium" | "high";
      notes_for_finance?: string;
      missing_information_flags?: string[];
    }
  ) {
    const { data, error } = await supabase
      .from("cif_records")
      .update({
        current_stage: "feasibility_complete",
        feasibility_completed_by_name: feasibilityData.completed_by_name,
        feasibility_call_date: feasibilityData.feasibility_call_date,
        any_issues_gathering_info: feasibilityData.any_issues_gathering_info,
        issues_gathering_info_details: feasibilityData.issues_gathering_info_details,
        utr: feasibilityData.utr,
        turnover: feasibilityData.turnover,
        payroll: feasibilityData.payroll,
        vat_number: feasibilityData.vat_number,
        paye_reference: feasibilityData.paye_reference,
        competent_professional_1_name: feasibilityData.competent_professional_1_name,
        competent_professional_1_position: feasibilityData.competent_professional_1_position,
        competent_professional_1_mobile: feasibilityData.competent_professional_1_mobile,
        competent_professional_1_email: feasibilityData.competent_professional_1_email,
        competent_professional_2_name: feasibilityData.competent_professional_2_name,
        competent_professional_2_position: feasibilityData.competent_professional_2_position,
        competent_professional_2_mobile: feasibilityData.competent_professional_2_mobile,
        competent_professional_2_email: feasibilityData.competent_professional_2_email,
        competent_professional_3_name: feasibilityData.competent_professional_3_name,
        competent_professional_3_position: feasibilityData.competent_professional_3_position,
        competent_professional_3_mobile: feasibilityData.competent_professional_3_mobile,
        competent_professional_3_email: feasibilityData.competent_professional_3_email,
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
      .eq("id", cifId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all CIF records with prospect details
   */
  async getAllCIFs() {
    const { data, error } = await supabase
      .from("cif_records")
      .select(`
        *,
        prospects (*),
        created_by_profile:profiles!cif_records_created_by_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as CIFWithDetails[];
  },

  /**
   * Get single CIF record by ID
   */
  async getCIFById(id: string) {
    const { data, error } = await supabase
      .from("cif_records")
      .select(`
        *,
        prospects (*),
        created_by_profile:profiles!cif_records_created_by_fkey(full_name, email),
        claim:claims(*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as CIFWithDetails;
  },

  /**
   * Update CIF record
   */
  async updateCIF(id: string, updates: Partial<CIFUpdate>) {
    const { data, error } = await supabase
      .from("cif_records")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete CIF record
   */
  async deleteCIF(id: string) {
    const { error } = await supabase
      .from("cif_records")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Archive CIF record
   */
  async archiveCIF(id: string) {
    const { data, error } = await supabase
      .from("cif_records")
      .update({ archived: true })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get archived CIF records
   */
  async getArchivedCIFs() {
    const { data, error } = await supabase
      .from("cif_records")
      .select(`
        *,
        prospects (*),
        created_by_profile:profiles!cif_records_created_by_fkey(full_name, email)
      `)
      .eq("archived", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as CIFWithDetails[];
  },
};