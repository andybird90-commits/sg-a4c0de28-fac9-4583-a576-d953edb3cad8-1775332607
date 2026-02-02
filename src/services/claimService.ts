import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Claim = Database["public"]["Tables"]["claims"]["Row"];
type ClaimInsert = Database["public"]["Tables"]["claims"]["Insert"];
type ClaimUpdate = Database["public"]["Tables"]["claims"]["Update"];

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];
type ClaimProjectInsert = Database["public"]["Tables"]["claim_projects"]["Insert"];
type ClaimProjectUpdate = Database["public"]["Tables"]["claim_projects"]["Update"];

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type ClaimCost = Database["public"]["Tables"]["claim_costs"]["Row"];
type ClaimCostInsert = Database["public"]["Tables"]["claim_costs"]["Insert"];

type ClaimDocument = Database["public"]["Tables"]["claim_documents"]["Row"];
type ClaimDocumentInsert = Database["public"]["Tables"]["claim_documents"]["Insert"];

export interface ClaimWithDetails extends Claim {
  organisations?: {
    name: string;
    organisation_code: string;
  } | null;
  projects?: ClaimProject[];
  costs?: ClaimCost[];
  documents?: ClaimDocument[];
  bd_owner?: Profile | null;
  technical_lead?: Profile | null;
  cost_lead?: Profile | null;
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
   * Import sidekick project as a claim project
   * Fetches the sidekick project and creates a new claim project record
   */
  async importSidekickProject(claimId: string, orgId: string, sidekickProjectId: string): Promise<ClaimProject> {
    try {
      // 1. Fetch the sidekick project
      const { data: sp, error: spError } = await supabase
        .from("sidekick_projects")
        .select("*")
        .eq("id", sidekickProjectId)
        .single();

      if (spError) throw spError;
      if (!sp) throw new Error("Sidekick project not found");

      // 2. Create the claim project
      const projectData: ClaimProjectInsert = {
        claim_id: claimId,
        org_id: orgId,
        name: sp.name,
        description: sp.description,
        rd_theme: sp.sector, // Map sector to rd_theme
        // We can map other fields if they exist or leave them null for the user to fill
      };

      return await this.createProject(projectData);
    } catch (error) {
      console.error("[claimService.importSidekickProject] Error:", error);
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

  // ============================================================================
  // PROJECT WORKFLOW MANAGEMENT
  // ============================================================================

  /**
   * Client sends project to team for R&D review
   */
  async sendProjectToTeam(projectId: string, userId: string): Promise<ClaimProject> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: "submitted_to_team",
          submitted_to_team_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      // Log status change
      await this.logStatusChange(projectId, "draft", "submitted_to_team", userId, "Client submitted project for team review");

      return data;
    } catch (error) {
      console.error("[claimService.sendProjectToTeam] Error:", error);
      throw error;
    }
  }

  /**
   * Team member claims a project for review
   */
  async claimProject(projectId: string, userId: string): Promise<ClaimProject> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: "team_in_progress",
          assigned_to_user_id: userId,
          team_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("workflow_status", "submitted_to_team")
        .is("assigned_to_user_id", null)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Project already claimed or not available");

      // Log status change
      await this.logStatusChange(projectId, "submitted_to_team", "team_in_progress", userId, "Team member claimed project");

      return data;
    } catch (error) {
      console.error("[claimService.claimProject] Error:", error);
      throw error;
    }
  }

  /**
   * Team sends project to client for review
   */
  async sendProjectToClient(projectId: string, userId: string): Promise<ClaimProject> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: "awaiting_client_review",
          sent_to_client_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      // Log status change
      await this.logStatusChange(projectId, "team_in_progress", "awaiting_client_review", userId, "Team submitted project for client review");

      return data;
    } catch (error) {
      console.error("[claimService.sendProjectToClient] Error:", error);
      throw error;
    }
  }

  /**
   * Client approves project (full or partial)
   */
  async approveProject(
    projectId: string, 
    userId: string, 
    approvalSections: Record<string, string>
  ): Promise<ClaimProject> {
    try {
      const allApproved = Object.values(approvalSections).every(status => status === "approved");
      
      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: allApproved ? "approved" : "revision_requested",
          approval_sections: approvalSections,
          approved_at: allApproved ? new Date().toISOString() : null,
          sla_met: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      // Log status change
      const statusMessage = allApproved ? "Client approved all sections" : "Client requested revisions on some sections";
      await this.logStatusChange(projectId, "awaiting_client_review", allApproved ? "approved" : "revision_requested", userId, statusMessage);

      return data;
    } catch (error) {
      console.error("[claimService.approveProject] Error:", error);
      throw error;
    }
  }

  /**
   * Client requests changes to project
   */
  async requestRevisions(
    projectId: string,
    userId: string,
    feedback: string,
    sectionsNeedingRevision: string[]
  ): Promise<ClaimProject> {
    try {
      // Get current approval sections
      const { data: project } = await supabase
        .from("claim_projects")
        .select("approval_sections")
        .eq("id", projectId)
        .single();

      const approvalSections = project?.approval_sections || {};
      
      // Mark requested sections as needs_revision
      sectionsNeedingRevision.forEach(section => {
        approvalSections[section] = "needs_revision";
      });

      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: "revision_requested",
          approval_sections: approvalSections,
          revision_count: supabase.raw("revision_count + 1"),
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      // Add feedback comment
      await this.addProjectComment(projectId, userId, "client_feedback", feedback);

      // Log status change
      await this.logStatusChange(projectId, "awaiting_client_review", "revision_requested", userId, `Client requested revisions: ${sectionsNeedingRevision.join(", ")}`);

      return data;
    } catch (error) {
      console.error("[claimService.requestRevisions] Error:", error);
      throw error;
    }
  }

  /**
   * Team resubmits project after revisions
   */
  async resubmitProject(projectId: string, userId: string): Promise<ClaimProject> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: "awaiting_client_review",
          sent_to_client_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      // Log status change
      await this.logStatusChange(projectId, "revision_requested", "awaiting_client_review", userId, "Team resubmitted project after revisions");

      return data;
    } catch (error) {
      console.error("[claimService.resubmitProject] Error:", error);
      throw error;
    }
  }

  /**
   * Cancel/withdraw project
   */
  async cancelProject(projectId: string, userId: string, reason: string): Promise<ClaimProject> {
    try {
      const { data: project } = await supabase
        .from("claim_projects")
        .select("workflow_status")
        .eq("id", projectId)
        .single();

      const previousStatus = project?.workflow_status || "draft";

      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      // Add cancellation comment
      await this.addProjectComment(projectId, userId, "cancellation", reason);

      // Log status change
      await this.logStatusChange(projectId, previousStatus, "cancelled", userId, `Project cancelled: ${reason}`);

      return data;
    } catch (error) {
      console.error("[claimService.cancelProject] Error:", error);
      throw error;
    }
  }

  // ============================================================================
  // COLLABORATORS
  // ============================================================================

  /**
   * Add collaborator to project
   */
  async addCollaborator(projectId: string, userId: string, addedBy: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("project_collaborators")
        .insert({
          claim_project_id: projectId,
          user_id: userId,
          added_by: addedBy,
        });

      if (error) throw error;
    } catch (error) {
      console.error("[claimService.addCollaborator] Error:", error);
      throw error;
    }
  }

  /**
   * Remove collaborator from project
   */
  async removeCollaborator(projectId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("project_collaborators")
        .delete()
        .eq("claim_project_id", projectId)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error) {
      console.error("[claimService.removeCollaborator] Error:", error);
      throw error;
    }
  }

  /**
   * Get project collaborators
   */
  async getCollaborators(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("project_collaborators")
        .select(`
          *,
          user:user_id (id, full_name, email, avatar_url)
        `)
        .eq("claim_project_id", projectId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("[claimService.getCollaborators] Error:", error);
      throw error;
    }
  }

  // ============================================================================
  // COMMENTS & FEEDBACK
  // ============================================================================

  /**
   * Add comment/feedback to project
   */
  async addProjectComment(
    projectId: string,
    userId: string,
    commentType: string,
    commentText: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("project_comments")
        .insert({
          claim_project_id: projectId,
          user_id: userId,
          comment_type: commentType,
          comment_text: commentText,
        });

      if (error) throw error;
    } catch (error) {
      console.error("[claimService.addProjectComment] Error:", error);
      throw error;
    }
  }

  /**
   * Get project comments
   */
  async getProjectComments(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("project_comments")
        .select(`
          *,
          user:user_id (id, full_name, email, avatar_url)
        `)
        .eq("claim_project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("[claimService.getProjectComments] Error:", error);
      throw error;
    }
  }

  // ============================================================================
  // STATUS HISTORY
  // ============================================================================

  /**
   * Log status change to history
   */
  private async logStatusChange(
    projectId: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("project_status_history")
        .insert({
          claim_project_id: projectId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: changedBy,
          notes: notes,
        });

      if (error) throw error;
    } catch (error) {
      console.error("[claimService.logStatusChange] Error:", error);
      // Don't throw - logging failures shouldn't break main flow
    }
  }

  /**
   * Get status history for project
   */
  async getStatusHistory(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("project_status_history")
        .select(`
          *,
          user:changed_by (id, full_name, email, avatar_url)
        `)
        .eq("claim_project_id", projectId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("[claimService.getStatusHistory] Error:", error);
      throw error;
    }
  }

  /**
   * Get projects by workflow status (for filtered views)
   */
  async getProjectsByStatus(claimId: string, status: string): Promise<ClaimProject[]> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .select("*")
        .eq("claim_id", claimId)
        .eq("workflow_status", status)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("[claimService.getProjectsByStatus] Error:", error);
      throw error;
    }
  }

  /**
   * Get overdue projects (SLA breach)
   */
  async getOverdueProjects(claimId: string): Promise<ClaimProject[]> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .select("*")
        .eq("claim_id", claimId)
        .lt("due_date", new Date().toISOString())
        .in("workflow_status", ["submitted_to_team", "team_in_progress"])
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("[claimService.getOverdueProjects] Error:", error);
      throw error;
    }
  }
}

export const claimService = new ClaimService();