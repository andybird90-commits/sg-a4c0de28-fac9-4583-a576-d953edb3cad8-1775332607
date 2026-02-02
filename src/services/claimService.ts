import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Claim = Database["public"]["Tables"]["claims"]["Row"];
type ClaimInsert = Database["public"]["Tables"]["claims"]["Insert"];
type ClaimUpdate = Database["public"]["Tables"]["claims"]["Update"];

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];
type ClaimProjectInsert = Database["public"]["Tables"]["claim_projects"]["Insert"];
type ClaimProjectUpdate = Database["public"]["Tables"]["claim_projects"]["Update"];

type ClaimCost = Database["public"]["Tables"]["claim_costs"]["Row"];
type ClaimCostInsert = Database["public"]["Tables"]["claim_costs"]["Insert"];

type ClaimDocument = Database["public"]["Tables"]["claim_documents"]["Row"];
type ClaimDocumentInsert = Database["public"]["Tables"]["claim_documents"]["Insert"];

export interface ClaimWithDetails extends Claim {
  organisations?: {
    id: string;
    name: string;
    organisation_code: string;
  } | null;
  bd_owner?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  technical_lead?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  cost_lead?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  projects?: ClaimProject[];
  total_costs?: number;
  document_count?: number;
}

export class ClaimService {
  /**
   * Get all claims with filtering options
   */
  async getAllClaims(filters?: {
    status?: string;
    org_id?: string;
    claim_year?: number;
    assigned_to_me?: boolean;
  }): Promise<ClaimWithDetails[]> {
    try {
      let query = supabase
        .from("claims")
        .select(`
          *,
          organisations:org_id (id, name, organisation_code),
          bd_owner:bd_owner_id (id, full_name, email),
          technical_lead:technical_lead_id (id, full_name, email),
          cost_lead:cost_lead_id (id, full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.org_id) {
        query = query.eq("org_id", filters.org_id);
      }

      if (filters?.claim_year) {
        query = query.eq("claim_year", filters.claim_year);
      }

      if (filters?.assigned_to_me) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.or(`bd_owner_id.eq.${user.id},technical_lead_id.eq.${user.id},cost_lead_id.eq.${user.id},ops_owner_id.eq.${user.id}`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get project counts and total costs for each claim
      const claimsWithDetails = await Promise.all(
        (data as any[] || []).map(async (claim) => {
          const [projectsResult, costsResult, docsResult] = await Promise.all([
            supabase
              .from("claim_projects")
              .select("*")
              .eq("claim_id", claim.id),
            supabase
              .from("claim_costs")
              .select("amount")
              .eq("claim_id", claim.id),
            supabase
              .from("claim_documents")
              .select("id")
              .eq("claim_id", claim.id),
          ]);

          const totalCosts = costsResult.data?.reduce((sum, cost) => sum + Number(cost.amount || 0), 0) || 0;

          return {
            ...claim,
            projects: projectsResult.data || [],
            total_costs: totalCosts,
            document_count: docsResult.data?.length || 0,
          };
        })
      );

      return claimsWithDetails;
    } catch (error) {
      console.error("[claimService.getAllClaims] Error:", error);
      throw error;
    }
  }

  /**
   * Get single claim by ID with full details
   */
  async getClaimById(claimId: string): Promise<ClaimWithDetails | null> {
    try {
      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .select(`
          *,
          organisations:org_id (id, name, organisation_code),
          bd_owner:bd_owner_id (id, full_name, email, avatar_url),
          technical_lead:technical_lead_id (id, full_name, email, avatar_url),
          cost_lead:cost_lead_id (id, full_name, email, avatar_url),
          ops_owner:ops_owner_id (id, full_name, email, avatar_url),
          director:director_id (id, full_name, email, avatar_url)
        `)
        .eq("id", claimId)
        .single();

      if (claimError) throw claimError;
      if (!claim) return null;

      const typedClaim = claim as any;

      // Get related data
      const [projectsResult, costsResult, docsResult] = await Promise.all([
        supabase
          .from("claim_projects")
          .select("*")
          .eq("claim_id", claimId)
          .order("created_at", { ascending: false }),
        supabase
          .from("claim_costs")
          .select("amount")
          .eq("claim_id", claimId),
        supabase
          .from("claim_documents")
          .select("id")
          .eq("claim_id", claimId),
      ]);

      const totalCosts = costsResult.data?.reduce((sum, cost) => sum + Number(cost.amount || 0), 0) || 0;

      return {
        ...typedClaim,
        projects: projectsResult.data || [],
        total_costs: totalCosts,
        document_count: docsResult.data?.length || 0,
      };
    } catch (error) {
      console.error("[claimService.getClaimById] Error:", error);
      throw error;
    }
  }

  /**
   * Create new claim
   */
  async createClaim(claimData: ClaimInsert): Promise<Claim> {
    try {
      const { data, error } = await supabase
        .from("claims")
        .insert(claimData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[claimService.createClaim] Error:", error);
      throw error;
    }
  }

  /**
   * Update claim
   */
  async updateClaim(claimId: string, updates: ClaimUpdate): Promise<Claim> {
    try {
      const { data, error } = await supabase
        .from("claims")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", claimId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[claimService.updateClaim] Error:", error);
      throw error;
    }
  }

  /**
   * Delete claim
   */
  async deleteClaim(claimId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("claims")
        .delete()
        .eq("id", claimId);

      if (error) throw error;
    } catch (error) {
      console.error("[claimService.deleteClaim] Error:", error);
      throw error;
    }
  }

  // ============================================================================
  // PROJECTS
  // ============================================================================

  /**
   * Get all projects for a claim
   */
  async getClaimProjects(claimId: string): Promise<ClaimProject[]> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("[claimService.getClaimProjects] Error:", error);
      throw error;
    }
  }

  /**
   * Get single project by ID
   */
  async getProjectById(projectId: string): Promise<ClaimProject | null> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[claimService.getProjectById] Error:", error);
      throw error;
    }
  }

  /**
   * Create new project
   */
  async createProject(projectData: ClaimProjectInsert): Promise<ClaimProject> {
    try {
      // Ensure org_id is present if not provided in projectData
      const dataToInsert = { ...projectData };
      
      if (!dataToInsert.org_id) {
        // Fetch claim to get org_id
        const { data: claim } = await supabase
          .from("claims")
          .select("org_id")
          .eq("id", projectData.claim_id)
          .single();
          
        if (claim) {
          dataToInsert.org_id = claim.org_id;
        }
      }

      const { data, error } = await supabase
        .from("claim_projects")
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[claimService.createProject] Error:", error);
      throw error;
    }
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, updates: ClaimProjectUpdate): Promise<ClaimProject> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[claimService.updateProject] Error:", error);
      throw error;
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("claim_projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
    } catch (error) {
      console.error("[claimService.deleteProject] Error:", error);
      throw error;
    }
  }

  // ============================================================================
  // COSTS
  // ============================================================================

  /**
   * Get all costs for a claim
   */
  async getClaimCosts(claimId: string): Promise<ClaimCost[]> {
    try {
      const { data, error } = await supabase
        .from("claim_costs")
        .select("*")
        .eq("claim_id", claimId)
        .order("cost_date", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("[claimService.getClaimCosts] Error:", error);
      throw error;
    }
  }

  /**
   * Create new cost entry
   */
  async createCost(costData: ClaimCostInsert): Promise<ClaimCost> {
    try {
      // Ensure org_id is present
      const dataToInsert = { ...costData };
      
      if (!dataToInsert.org_id) {
        const { data: claim } = await supabase
          .from("claims")
          .select("org_id")
          .eq("id", costData.claim_id)
          .single();
          
        if (claim) {
          dataToInsert.org_id = claim.org_id;
        }
      }

      const { data, error } = await supabase
        .from("claim_costs")
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[claimService.createCost] Error:", error);
      throw error;
    }
  }

  /**
   * Update cost entry
   */
  async updateCost(costId: string, updates: Partial<ClaimCostInsert>): Promise<ClaimCost> {
    try {
      const { data, error } = await supabase
        .from("claim_costs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", costId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[claimService.updateCost] Error:", error);
      throw error;
    }
  }

  /**
   * Delete cost entry
   */
  async deleteCost(costId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("claim_costs")
        .delete()
        .eq("id", costId);

      if (error) throw error;
    } catch (error) {
      console.error("[claimService.deleteCost] Error:", error);
      throw error;
    }
  }

  /**
   * Approve cost entry
   */
  async approveCost(costId: string, approverId: string): Promise<ClaimCost> {
    try {
      const { data, error } = await supabase
        .from("claim_costs")
        .update({
          approved: true,
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", costId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[claimService.approveCost] Error:", error);
      throw error;
    }
  }

  // ============================================================================
  // DOCUMENTS
  // ============================================================================

  /**
   * Get all documents for a claim
   */
  async getClaimDocuments(claimId: string): Promise<ClaimDocument[]> {
    try {
      const { data, error } = await supabase
        .from("claim_documents")
        .select("*")
        .eq("claim_id", claimId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("[claimService.getClaimDocuments] Error:", error);
      throw error;
    }
  }

  /**
   * Create document record
   */
  async createDocument(docData: ClaimDocumentInsert): Promise<ClaimDocument> {
    try {
      // Ensure org_id is present
      const dataToInsert = { ...docData };
      
      if (!dataToInsert.org_id) {
        const { data: claim } = await supabase
          .from("claims")
          .select("org_id")
          .eq("id", docData.claim_id)
          .single();
          
        if (claim) {
          dataToInsert.org_id = claim.org_id;
        }
      }

      const { data, error } = await supabase
        .from("claim_documents")
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[claimService.createDocument] Error:", error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(docId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("claim_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;
    } catch (error) {
      console.error("[claimService.deleteDocument] Error:", error);
      throw error;
    }
  }
}

export const claimService = new ClaimService();