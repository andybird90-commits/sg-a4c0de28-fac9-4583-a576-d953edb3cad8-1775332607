import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { pipelineService } from "./pipelineService";

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error("[claimService.getAllClaims] No active session");
        return [];
      }

      let query = supabase
        .from("claims")
        .select(
          `
          *,
          organisations:org_id (id, name, organisation_code),
          bd_owner:bd_owner_id (id, full_name, email),
          technical_lead:technical_lead_id (id, full_name, email),
          cost_lead:cost_lead_id (id, full_name, email)
        `
        )
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          query = query.or(
            `bd_owner_id.eq.${user.id},technical_lead_id.eq.${user.id},cost_lead_id.eq.${user.id},ops_owner_id.eq.${user.id}`
          );
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const claimsWithDetails = await Promise.all(
        ((data as any[]) || []).map(async (claim) => {
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

          const totalCosts =
            costsResult.data?.reduce(
              (sum, cost) => sum + Number(cost.amount || 0),
              0
            ) || 0;

          return {
            ...claim,
            projects: projectsResult.data || [],
            costs: costsResult.data || [],
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error("[claimService.getClaimById] No active session");
        return null;
      }

      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .select(
          `
          *,
          organisations:org_id (id, name, organisation_code),
          bd_owner:bd_owner_id (id, full_name, email, avatar_url),
          technical_lead:technical_lead_id (id, full_name, email, avatar_url),
          cost_lead:cost_lead_id (id, full_name, email, avatar_url),
          ops_owner:ops_owner_id (id, full_name, email, avatar_url),
          director:director_id (id, full_name, email, avatar_url)
        `
        )
        .eq("id", claimId)
        .maybeSingle();

      if (claimError) throw claimError;
      if (!claim) return null;

      const typedClaim = claim as any;

      const [projects, costsResult, docsResult] = await Promise.all([
        this.getClaimProjects(claimId),
        supabase.from("claim_costs").select("*").eq("claim_id", claimId),
        supabase
          .from("claim_documents")
          .select("*")
          .eq("claim_id", claimId)
          .order("uploaded_at", { ascending: false }),
      ]);

      const totalCosts =
        costsResult.data?.reduce(
          (sum, cost) => sum + Number(cost.amount || 0),
          0
        ) || 0;

      return {
        ...typedClaim,
        projects: projects,
        costs: costsResult.data || [],
        documents: docsResult.data || [],
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

      if (data && data.status === "active") {
        const { data: prospectRows } = await supabase
          .from("prospects")
          .select("company_number")
          .eq("org_id", data.org_id);

        const companyNumber =
          Array.isArray(prospectRows) && prospectRows.length > 0
            ? prospectRows[0]?.company_number || null
            : null;

        await pipelineService.autoCreatePipelineEntry(
          data.id,
          data.org_id,
          companyNumber
        );
      }

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

      if (data && updates.status === "active") {
        const { data: prospectRows } = await supabase
          .from("prospects")
          .select("company_number")
          .eq("org_id", data.org_id);

        const companyNumber =
          Array.isArray(prospectRows) && prospectRows.length > 0
            ? prospectRows[0]?.company_number || null
            : null;

        await pipelineService.autoCreatePipelineEntry(
          data.id,
          data.org_id,
          companyNumber
        );
      }

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
      const { error } = await supabase.from("claims").delete().eq("id", claimId);

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
   * This will auto-sync key fields from linked sidekick_projects
   * so staff always see up-to-date client-side details.
   */
  async getClaimProjects(claimId: string): Promise<ClaimProject[]> {
    try {
      const { data, error } = await supabase
        .from("claim_projects")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const projects: ClaimProject[] = data || [];

      const linkedProjects = projects.filter((p) => {
        const autoSynced = p.auto_synced;
        const isAutoSynced =
          autoSynced === null || autoSynced === undefined || autoSynced === true;
        return p.source_sidekick_project_id && isAutoSynced;
      });

      if (linkedProjects.length === 0) {
        return projects;
      }

      const sidekickIds = linkedProjects
        .map((p) => p.source_sidekick_project_id)
        .filter((id): id is string => typeof id === "string");

      if (sidekickIds.length === 0) {
        return projects;
      }

      const { data: sidekickData, error: sidekickError } = await supabase
        .from("sidekick_projects")
        .select("id, name, description, sector, start_date, end_date")
        .in("id", sidekickIds);

      if (sidekickError) throw sidekickError;

      const sidekickById = new Map<string, any>(
        (sidekickData || []).map((sp: any) => [sp.id as string, sp])
      );

      const updates: { id: string; [key: string]: any }[] = [];
      const syncedProjects: ClaimProject[] = projects.map((project) => {
        const sourceId = project.source_sidekick_project_id;
        if (!sourceId) return project;

        const sidekick = sidekickById.get(sourceId);
        if (!sidekick) return project;

        const patch: Partial<ClaimProject> = {};

        if (sidekick.name && sidekick.name !== project.name) {
          patch.name = sidekick.name;
        }

        if (sidekick.description && sidekick.description !== project.description) {
          patch.description = sidekick.description;
        }

        if (sidekick.sector && sidekick.sector !== project.rd_theme) {
          patch.rd_theme = sidekick.sector;
        }

        if (sidekick.start_date && sidekick.start_date !== project.start_date) {
          patch.start_date = sidekick.start_date;
        }

        if (sidekick.end_date && sidekick.end_date !== project.end_date) {
          patch.end_date = sidekick.end_date;
        }

        if (Object.keys(patch).length === 0) {
          return project;
        }

        updates.push({ id: project.id, ...patch });
        return { ...project, ...patch };
      });

      if (updates.length > 0) {
        await Promise.all(
          updates.map(async (update) => {
            const { id, ...rest } = update;
            const { error: updateError } = await supabase
              .from("claim_projects")
              .update(rest)
              .eq("id", id);

            if (updateError) {
              console.error(
                "[claimService.getClaimProjects] Failed to sync claim_project from sidekick:",
                {
                  projectId: id,
                  error: updateError,
                }
              );
            }
          })
        );
      }

      return syncedProjects;
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
   * Find claim project linked to a sidekick project
   */
  async getProjectsBySidekickId(sidekickId: string) {
    const { data, error } = await supabase
      .from("claim_projects")
      .select("*")
      .eq("source_sidekick_project_id", sidekickId);

    if (error) throw error;
    return data;
  }

  /**
   * Create new project
   */
  async createProject(projectData: ClaimProjectInsert): Promise<ClaimProject> {
    try {
      const dataToInsert = { ...projectData };

      if (!dataToInsert.org_id) {
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
  async updateProject(
    projectId: string,
    updates: ClaimProjectUpdate
  ): Promise<ClaimProject> {
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
   */
  async importSidekickProject(
    claimId: string,
    orgId: string,
    sidekickProjectId: string
  ): Promise<ClaimProject> {
    try {
      const { data: sp, error: spError } = await supabase
        .from("sidekick_projects")
        .select("*")
        .eq("id", sidekickProjectId)
        .single();

      if (spError) throw spError;
      if (!sp) throw new Error("Sidekick project not found");

      const projectData: ClaimProjectInsert = {
        claim_id: claimId,
        org_id: orgId,
        name: sp.name,
        description: sp.description,
        rd_theme: sp.sector,
        source_sidekick_project_id: sp.id,
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
  async updateCost(
    costId: string,
    updates: Partial<ClaimCostInsert>
  ): Promise<ClaimCost> {
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
  async sendProjectToTeam(
    projectId: string,
    userId: string
  ): Promise<ClaimProject> {
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

      await this.logStatusChange(
        projectId,
        "draft",
        "submitted_to_team",
        userId,
        "Client submitted project for team review"
      );

      return data;
    } catch (error) {
      console.error("[claimService.sendProjectToTeam] Error:", error);
      throw error;
    }
  }

  /**
   * Team member claims a project for review
   */
  async claimProject(
    projectId: string,
    userId: string
  ): Promise<ClaimProject> {
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

      await this.logStatusChange(
        projectId,
        "submitted_to_team",
        "team_in_progress",
        userId,
        "Team member claimed project"
      );

      return data;
    } catch (error) {
      console.error("[claimService.claimProject] Error:", error);
      throw error;
    }
  }

  /**
   * Team sends project to client for review
   */
  async sendProjectToClient(
    projectId: string,
    userId: string
  ): Promise<ClaimProject> {
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

      await this.logStatusChange(
        projectId,
        "team_in_progress",
        "awaiting_client_review",
        userId,
        "Team submitted project for client review"
      );

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
      const allApproved = Object.values(approvalSections).every(
        (status) => status === "approved"
      );

      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: allApproved ? "approved" : "revision_requested",
          approval_status: approvalSections,
          approved_at: allApproved ? new Date().toISOString() : null,
          sla_met: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      const statusMessage = allApproved
        ? "Client approved all sections"
        : "Client requested revisions on some sections";
      await this.logStatusChange(
        projectId,
        "awaiting_client_review",
        allApproved ? "approved" : "revision_requested",
        userId,
        statusMessage
      );

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
      const { data: project } = await supabase
        .from("claim_projects")
        .select("approval_status, revision_count")
        .eq("id", projectId)
        .single();

      const approvalSections =
        (project?.approval_status as Record<string, string>) || {};
      const currentRevisionCount = project?.revision_count || 0;

      sectionsNeedingRevision.forEach((section) => {
        approvalSections[section] = "needs_revision";
      });

      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: "revision_requested",
          approval_status: approvalSections,
          revision_count: currentRevisionCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      await this.addProjectComment(
        projectId,
        userId,
        "client_feedback",
        feedback
      );

      await this.logStatusChange(
        projectId,
        "awaiting_client_review",
        "revision_requested",
        userId,
        `Client requested revisions: ${sectionsNeedingRevision.join(", ")}`
      );

      return data;
    } catch (error) {
      console.error("[claimService.requestRevisions] Error:", error);
      throw error;
    }
  }

  /**
   * Team resubmits project after revisions
   */
  async resubmitProject(
    projectId: string,
    userId: string
  ): Promise<ClaimProject> {
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

      await this.logStatusChange(
        projectId,
        "revision_requested",
        "awaiting_client_review",
        userId,
        "Team resubmitted project after revisions"
      );

      return data;
    } catch (error) {
      console.error("[claimService.resubmitProject] Error:", error);
      throw error;
    }
  }

  /**
   * Cancel/withdraw project
   */
  async cancelProject(
    projectId: string,
    userId: string,
    reason: string
  ): Promise<ClaimProject> {
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

      await this.addProjectComment(projectId, userId, "cancellation", reason);

      await this.logStatusChange(
        projectId,
        previousStatus,
        "cancelled",
        userId,
        `Project cancelled: ${reason}`
      );

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
  async addCollaborator(
    projectId: string,
    userId: string,
    addedBy: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from("project_collaborators").insert({
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
  async removeCollaborator(
    projectId: string,
    userId: string
  ): Promise<void> {
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
        .select(
          `
          *,
          user:user_id (id, full_name, email, avatar_url)
        `
        )
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
      const { error } = await supabase.from("project_comments").insert({
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
        .select(
          `
          *,
          user:user_id (id, full_name, email, avatar_url)
        `
        )
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
      const { error } = await supabase.from("project_status_history").insert({
        claim_project_id: projectId,
        from_status: oldStatus,
        to_status: newStatus,
        changed_by: changedBy,
        notes: notes,
      });

      if (error) throw error;
    } catch (error) {
      console.error("[claimService.logStatusChange] Error:", error);
    }
  }

  /**
   * Get status history for project
   */
  async getStatusHistory(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("project_status_history")
        .select(
          `
          *,
          user:changed_by (id, full_name, email, avatar_url)
        `
        )
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
  async getProjectsByStatus(
    claimId: string,
    status: string
  ): Promise<ClaimProject[]> {
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