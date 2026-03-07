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

type NewClaimCost = Omit<ClaimCostInsert, "org_id"> & {
  org_id?: string | null;
};

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
  qa_reviewer?: Profile | null;
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
        .is("deleted_at", null)
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
          const { data: projectRows, error: projectsError } = await supabase
            .from("claim_projects")
            .select("*")
            .eq("claim_id", claim.id)
            .order("created_at", { ascending: false });

          if (projectsError) {
            console.error(
              "[claimService.getAllClaims] Failed to load projects for claim",
              { claimId: claim.id, error: projectsError }
            );
          }

          const projects = (projectRows || []) as ClaimProject[];

          const projectIds = projects
            .map((p) => p.id)
            .filter((id): id is string => typeof id === "string" && id.length > 0);

          const sidekickIds = projects
            .map((p) => p.source_sidekick_project_id)
            .filter(
              (id): id is string =>
                typeof id === "string" && id.length > 0
            );

          const projectCostsTotal =
            projects.reduce(
              (sum, p) => sum + Number(p.total_qualifying_cost || 0),
              0
            ) || 0;

          const [costsByClaim, costsByProjects, costAdviceResult] = await Promise.all([
            supabase.from("claim_costs").select("*").eq("claim_id", claim.id),
            projectIds.length > 0
              ? supabase
                  .from("claim_costs")
                  .select("*")
                  .in("project_id", projectIds)
              : Promise.resolve({ data: null, error: null } as {
                  data: ClaimCost[] | null;
                  error: any;
                }),
            sidekickIds.length > 0
              ? supabase
                  .from("sidekick_project_cost_advice")
                  .select("amount, project_id")
                  .in("project_id", sidekickIds)
              : Promise.resolve({ data: null, error: null } as {
                  data: { amount: number | null; project_id: string | null }[] | null;
                  error: any;
                }),
          ]);

          if (costsByClaim.error) {
            console.error(
              "[claimService.getAllClaims] Failed to load claim-level costs",
              { claimId: claim.id, error: costsByClaim.error }
            );
          }
          if (costsByProjects.error) {
            console.error(
              "[claimService.getAllClaims] Failed to load project-level costs",
              { claimId: claim.id, error: costsByProjects.error }
            );
          }
          if (costAdviceResult.error) {
            console.error(
              "[claimService.getAllClaims] Failed to load sidekick cost advice for claim projects",
              { claimId: claim.id, error: costAdviceResult.error }
            );
          }

          const mergedCostsMap = new Map<string, ClaimCost>();
          (costsByClaim.data as ClaimCost[] | null)?.forEach((cost) => {
            if (cost.id) {
              mergedCostsMap.set(cost.id, cost);
            }
          });
          (costsByProjects.data as ClaimCost[] | null)?.forEach((cost) => {
            if (cost.id && !mergedCostsMap.has(cost.id)) {
              mergedCostsMap.set(cost.id, cost);
            }
          });
          const mergedCosts = Array.from(mergedCostsMap.values());

          const costsFromLines =
            mergedCosts.reduce(
              (sum, cost) => sum + Number(cost.amount || 0),
              0
            ) || 0;

          const clientCostsTotal =
            (costAdviceResult.data || []).reduce(
              (sum, row) => sum + Number(row.amount || 0),
              0
            ) || 0;

          const totalCosts = projectCostsTotal + costsFromLines + clientCostsTotal;

          const [docsByClaim, docsByProjects, evidenceResult] = await Promise.all([
            supabase
              .from("claim_documents")
              .select("*")
              .eq("claim_id", claim.id),
            projectIds.length > 0
              ? supabase
                  .from("claim_documents")
                  .select("*")
                  .in("project_id", projectIds)
              : Promise.resolve({ data: null, error: null } as {
                  data: ClaimDocument[] | null;
                  error: any;
                }),
            projectIds.length > 0
              ? supabase
                  .from("sidekick_evidence_items")
                  .select("id")
                  .in("project_id", projectIds)
              : Promise.resolve({ data: null, error: null } as {
                  data: { id: string }[] | null;
                  error: any;
                }),
          ]);

          if (docsByClaim.error) {
            console.error(
              "[claimService.getAllClaims] Failed to load claim-level documents",
              { claimId: claim.id, error: docsByClaim.error }
            );
          }
          if (docsByProjects.error) {
            console.error(
              "[claimService.getAllClaims] Failed to load project-level documents",
              { claimId: claim.id, error: docsByProjects.error }
            );
          }
          if (evidenceResult.error) {
            console.error(
              "[claimService.getAllClaims] Failed to load sidekick evidence for projects",
              { claimId: claim.id, error: evidenceResult.error }
            );
          }

          const mergedDocsMap = new Map<string, ClaimDocument>();
          (docsByClaim.data as ClaimDocument[] | null)?.forEach((doc) => {
            if (doc.id) {
              mergedDocsMap.set(doc.id, doc);
            }
          });
          (docsByProjects.data as ClaimDocument[] | null)?.forEach((doc) => {
            if (doc.id && !mergedDocsMap.has(doc.id)) {
              mergedDocsMap.set(doc.id, doc);
            }
          });
          const mergedDocuments = Array.from(mergedDocsMap.values());

          const evidenceCount =
            ((evidenceResult.data as { id: string }[] | null)?.length || 0);

          return {
            ...claim,
            projects,
            costs: mergedCosts,
            total_costs: totalCosts,
            document_count: mergedDocuments.length + evidenceCount,
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
   * Get trashed (soft-deleted) claims
   */
  async getDeletedClaims(): Promise<ClaimWithDetails[]> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error("[claimService.getDeletedClaims] No active session");
        return [];
      }

      const query = supabase
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
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

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
      console.error("[claimService.getDeletedClaims] Error:", error);
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
          director:director_id (id, full_name, email, avatar_url),
          qa_reviewer:qa_reviewer_id (id, full_name, email, avatar_url)
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
   * Soft-delete claim
   */
  async deleteClaim(claimId: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("claims")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
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
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    } catch (error) {
      console.error("[claimService.getProjectById] Error:", error);
      throw error;
    }
  }

  /**
   * Find claim project(s) linked to a sidekick project
   */
  async getProjectsBySidekickId(sidekickId: string): Promise<ClaimProject[]> {
    const { data, error } = await supabase
      .from("claim_projects")
      .select("*")
      .eq("source_sidekick_project_id", sidekickId);

    if (error) throw error;
    return data ?? [];
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

      const project = await this.createProject(projectData);

      const { error: linkError } = await supabase
        .from("sidekick_projects")
        .update({
          claim_id: claimId,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", sidekickProjectId);

      if (linkError) {
        console.error(
          "[claimService.importSidekickProject] Failed to link sidekick project to claim:",
          {
            sidekickProjectId,
            claimId,
            error: linkError,
          }
        );
      }

      return project;
    } catch (error) {
      console.error("[claimService.importSidekickProject] Error:", error);
      throw error;
    }
  }

  /**
   * Hard delete project (used only where safe)
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
  async createCost(costData: NewClaimCost): Promise<ClaimCost> {
    try {
      const dataToInsert: ClaimCostInsert = { ...(costData as ClaimCostInsert) };

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
   * Backwards-compatible helper used by some pages to add a cost to a claim
   */
  async addCostToClaim(costData: NewClaimCost): Promise<ClaimCost> {
    return this.createCost(costData);
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
   * Simple approval updater for client-side review flows
   */
  async updateProjectApproval(
    projectId: string,
    nextStatus: string,
    approvalSections: Record<string, string>,
    revisionFeedback: string | null
  ): Promise<ClaimProject> {
    try {
      const allApproved = Object.values(approvalSections).every(
        (status) => status === "approved"
      );

      const update: Record<string, any> = {
        workflow_status: nextStatus,
        approval_status: approvalSections,
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === "approved" && allApproved) {
        update.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("claim_projects")
        .update(update)
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      if (revisionFeedback) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await this.addProjectComment(
              projectId,
              user.id,
              "client_feedback",
              revisionFeedback
            );
          }
        } catch (commentError) {
          console.error(
            "[claimService.updateProjectApproval] Failed to add revision feedback comment:",
            commentError
          );
        }
      }

      return data;
    } catch (error) {
      console.error("[claimService.updateProjectApproval] Error:", error);
      throw error;
    }
  }

  /**
   * Client cancels project
   */
  async cancelProject(
    projectId: string,
    reason: string,
    userId: string
  ): Promise<ClaimProject> {
    try {
      const update: Record<string, any> = {
        workflow_status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };

      if (reason.trim()) {
        update.cancellation_reason = reason.trim();
      }

      const { data, error } = await supabase
        .from("claim_projects")
        .update(update)
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      await this.logStatusChange(
        projectId,
        data?.workflow_status ?? "unknown",
        "cancelled",
        userId,
        reason || "Client cancelled project"
      );

      return data;
    } catch (error) {
      console.error("[claimService.cancelProject] Error:", error);
      throw error;
    }
  }

  /**
   * Client recalls a project from the R&D team back to draft
   */
  async recallProjectToClient(
    projectId: string,
    userId: string
  ): Promise<ClaimProject> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("claim_projects")
        .select("workflow_status")
        .eq("id", projectId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      const fromStatus = existing?.workflow_status ?? "submitted_to_team";

      const { data, error } = await supabase
        .from("claim_projects")
        .update({
          workflow_status: "draft",
          assigned_to_user_id: null,
          team_started_at: null,
          sent_to_client_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      await this.logStatusChange(
        projectId,
        fromStatus,
        "draft",
        userId,
        "Client recalled project from R&D team"
      );

      return data;
    } catch (error) {
      console.error("[claimService.recallProjectToClient] Error:", error);
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