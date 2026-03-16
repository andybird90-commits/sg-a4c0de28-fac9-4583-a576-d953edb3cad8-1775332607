import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ClientDossierRow = Database["public"]["Tables"]["client_dossiers"]["Row"];
type ClientContactRow = Database["public"]["Tables"]["client_contacts"]["Row"];
type ClientActivityRow = Database["public"]["Tables"]["client_activities"]["Row"];
type ClientActivityLinkRow = Database["public"]["Tables"]["client_activity_links"]["Row"];
type ClientTaskRow = Database["public"]["Tables"]["client_tasks"]["Row"];
type OrganisationRow = Database["public"]["Tables"]["organisations"]["Row"];
type ClaimRow = Database["public"]["Tables"]["claims"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

type ClientDossierInsert = Database["public"]["Tables"]["client_dossiers"]["Insert"];
type ClientContactInsert = Database["public"]["Tables"]["client_contacts"]["Insert"];
type ClientActivityInsert = Database["public"]["Tables"]["client_activities"]["Insert"];
type ClientTaskInsert = Database["public"]["Tables"]["client_tasks"]["Insert"];

export interface ClientSummary {
  organisation: OrganisationRow;
  primaryContact: ClientContactRow | null;
  latestActivity: ClientActivityRow | null;
  latestMessage: MessageRow | null;
  activeClaimsCount: number;
  nextFollowUp: ClientActivityRow | null;
}

export interface CrmKpiSummary {
  noContactIn30Days: number;
  followUpsDueToday: number;
  onboardingInProgress: number;
  activeClaimClients: number;
  highPriorityDossiers: number;
  overdueTasks: number;
}

export interface LogActivityInput {
  clientId: string;
  contactId?: string | null;
  type: ClientActivityRow["type"];
  direction: ClientActivityRow["direction"];
  subject?: string | null;
  summary?: string | null;
  body?: string | null;
  outcome?: string | null;
  followUpRequired?: boolean;
  followUpDate?: string | null;
  links?: Array<{
    entityType: ClientActivityLinkRow["entity_type"];
    entityId: string;
  }>;
}

export interface CreateTaskInput {
  clientId: string;
  relatedClaimId?: string | null;
  assignedToUserId: string;
  title: string;
  description?: string | null;
  taskType?: string | null;
  priority?: ClientTaskRow["priority"];
  dueAt?: string | null;
}

async function getClientDossier(clientId: string): Promise<ClientDossierRow | null> {
  const { data, error } = await supabase
    .from("client_dossiers")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    console.error("[clientCrmService.getClientDossier] Error:", error);
    return null;
  }

  return data;
}

async function upsertClientDossier(
  clientId: string,
  payload: Partial<ClientDossierInsert>
): Promise<ClientDossierRow | null> {
  const insertPayload: ClientDossierInsert = {
    client_id: clientId,
    ...payload
  };

  const { data, error } = await supabase
    .from("client_dossiers")
    .upsert(insertPayload, {
      onConflict: "client_id",
      ignoreDuplicates: false
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[clientCrmService.upsertClientDossier] Error:", error);
    throw error;
  }

  return data;
}

async function getClientContacts(clientId: string): Promise<ClientContactRow[]> {
  const { data, error } = await supabase
    .from("client_contacts")
    .select("*")
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[clientCrmService.getClientContacts] Error:", error);
    return [];
  }

  return data || [];
}

async function upsertClientContact(
  clientId: string,
  contact: Partial<ClientContactInsert>
): Promise<ClientContactRow | null> {
  const payload: ClientContactInsert = {
    client_id: clientId,
    ...contact
  };

  const { data, error } = await supabase
    .from("client_contacts")
    .upsert(payload, {
      onConflict: "id",
      ignoreDuplicates: false
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[clientCrmService.upsertClientContact] Error:", error);
    throw error;
  }

  return data;
}

async function logActivity(input: LogActivityInput): Promise<ClientActivityRow | null> {
  const {
    clientId,
    contactId,
    type,
    direction,
    subject,
    summary,
    body,
    outcome,
    followUpRequired,
    followUpDate,
    links
  } = input;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const activityPayload: ClientActivityInsert = {
    client_id: clientId,
    contact_id: contactId ?? null,
    type,
    direction,
    subject: subject ?? null,
    summary: summary ?? null,
    body: body ?? null,
    outcome: outcome ?? null,
    follow_up_required: followUpRequired ?? false,
    follow_up_date: followUpDate ?? null,
    created_by: user.id
  };

  const { data, error } = await supabase
    .from("client_activities")
    .insert(activityPayload)
    .select("*")
    .single();

  if (error) {
    console.error("[clientCrmService.logActivity] Error inserting activity:", error);
    throw error;
  }

  const createdActivity = data as ClientActivityRow;

  if (links && links.length > 0) {
    const linkInserts = links.map((link) => ({
      activity_id: createdActivity.id,
      entity_type: link.entityType,
      entity_id: link.entityId
    }));

    const { error: linkError } = await supabase
      .from("client_activity_links")
      .insert(linkInserts);

    if (linkError) {
      console.error("[clientCrmService.logActivity] Error inserting activity links:", linkError);
    }
  }

  return createdActivity;
}

async function getActivitiesForClient(clientId: string): Promise<ClientActivityRow[]> {
  const { data, error } = await supabase
    .from("client_activities")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[clientCrmService.getActivitiesForClient] Error:", error);
    return [];
  }

  return data || [];
}

async function createTask(input: CreateTaskInput): Promise<ClientTaskRow | null> {
  const {
    clientId,
    relatedClaimId,
    assignedToUserId,
    title,
    description,
    taskType,
    priority,
    dueAt
  } = input;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const payload: ClientTaskInsert = {
    client_id: clientId,
    related_claim_id: relatedClaimId ?? null,
    assigned_to_user_id: assignedToUserId,
    title,
    description: description ?? null,
    task_type: taskType ?? null,
    priority: priority ?? "medium",
    due_at: dueAt ?? null,
    status: "open",
    created_by: user.id
  };

  const { data, error } = await supabase
    .from("client_tasks")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[clientCrmService.createTask] Error:", error);
    throw error;
  }

  return data as ClientTaskRow;
}

async function getTasksForClient(clientId: string): Promise<ClientTaskRow[]> {
  const { data, error } = await supabase
    .from("client_tasks")
    .select("*")
    .eq("client_id", clientId)
    .order("due_at", { ascending: true });

  if (error) {
    console.error("[clientCrmService.getTasksForClient] Error:", error);
    return [];
  }

  return data || [];
}

async function getCrmKpis(): Promise<CrmKpiSummary> {
  const now = new Date();
  const isoToday = now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    noContactRes,
    followUpsRes,
    onboardingRes,
    activeClaimsRes,
    highPriorityDossiersRes,
    overdueTasksRes
  ] = await Promise.all([
    supabase
      .from("client_activities")
      .select("client_id, created_at", { count: "exact", head: false })
      .lt("created_at", thirtyDaysAgo),
    supabase
      .from("client_activities")
      .select("id", { count: "exact", head: true })
      .eq("follow_up_required", true)
      .gte("follow_up_date", isoToday)
      .lt("follow_up_date", isoToday + "T23:59:59Z"),
    supabase
      .from("cif_records")
      .select("id", { count: "exact", head: true })
      .neq("cif_status", "approved")
      .eq("archived", false),
    supabase
      .from("claims")
      .select("org_id, status, deleted_at")
      .is("deleted_at", null)
      .neq("status", "completed")
      .neq("status", "cancelled"),
    supabase
      .from("client_dossiers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("confidence_score", 70),
    supabase
      .from("client_tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "completed")
      .lt("due_at", isoToday + "T00:00:00Z")
  ]);

  const noContactIn30Days = (noContactRes.data || []).length;
  const followUpsDueToday = followUpsRes.count || 0;
  const onboardingInProgress = onboardingRes.count || 0;

  const activeClaimOrgIds = Array.isArray(activeClaimsRes.data)
    ? Array.from(
        new Set(
          (activeClaimsRes.data as { org_id: string | null }[])
            .map((row) => row.org_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        )
      )
    : [];

  const activeClaimClients = activeClaimOrgIds.length;

  const highPriorityDossiers = highPriorityDossiersRes.count || 0;
  const overdueTasks = overdueTasksRes.count || 0;

  return {
    noContactIn30Days,
    followUpsDueToday,
    onboardingInProgress,
    activeClaimClients,
    highPriorityDossiers,
    overdueTasks
  };
}

async function getClientSummary(clientId: string): Promise<ClientSummary | null> {
  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (orgError || !org) {
    if (orgError) {
      console.error("[clientCrmService.getClientSummary] Error loading organisation:", orgError);
    }
    return null;
  }

  const [contacts, activities, claims, messages] = await Promise.all([
    getClientContacts(clientId),
    getActivitiesForClient(clientId),
    supabase
      .from("claims")
      .select("*")
      .eq("org_id", clientId)
      .neq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*")
      .eq("org_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
  ]);

  const primaryContact =
    contacts.find((c) => c.is_primary && c.active) ||
    contacts.find((c) => c.active) ||
    null;

  const latestActivity = activities.length > 0 ? activities[0] : null;
  const latestMessage =
    (messages.data && messages.data.length > 0 ? (messages.data[0] as MessageRow) : null) ||
    null;

  const activeClaimsCount = (claims.data || []).length;

  const nextFollowUp =
    activities
      .filter((a) => a.follow_up_required && a.follow_up_date !== null)
      .sort((a, b) => {
        const ad = a.follow_up_date || "";
        const bd = b.follow_up_date || "";
        return ad.localeCompare(bd);
      })[0] || null;

  return {
    organisation: org as OrganisationRow,
    primaryContact,
    latestActivity,
    latestMessage,
    activeClaimsCount,
    nextFollowUp
  };
}

export const clientCrmService = {
  getClientDossier,
  upsertClientDossier,
  getClientContacts,
  upsertClientContact,
  logActivity,
  getActivitiesForClient,
  createTask,
  getTasksForClient,
  getCrmKpis,
  getClientSummary
};