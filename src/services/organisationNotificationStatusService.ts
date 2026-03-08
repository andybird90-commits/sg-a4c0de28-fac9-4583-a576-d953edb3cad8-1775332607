import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OrganisationNotificationStatusRow =
  Database["public"]["Tables"]["organisation_notification_status"]["Row"];
type OrganisationNotificationStatusInsert =
  Database["public"]["Tables"]["organisation_notification_status"]["Insert"];

export type NotificationStatusState =
  | "not_required"
  | "required"
  | "submitted"
  | "overdue"
  | "unclear";

export interface NotificationCheckAnswers {
  hasClaimedBefore: "yes" | "no" | "dont_know";
  claimedWithinLast3Years: "yes" | "no" | "dont_know";
  accountingPeriodStart?: string | null;
  accountingPeriodEnd?: string | null;
  internalRdContactName?: string | null;
  internalRdContactEmail?: string | null;
  organisationRdSummary?: string | null;
}

export interface NotificationCheckResult {
  notificationRequired: boolean | null;
  status: NotificationStatusState;
  deadlineDate: string | null;
}

function parseBoolean(value: "yes" | "no" | "dont_know"): boolean | null {
  if (value === "yes") {
    return true;
  }
  if (value === "no") {
    return false;
  }
  return null;
}

export function computeNotificationOutcome(
  answers: NotificationCheckAnswers
): NotificationCheckResult {
  const hasClaimedBeforeBool = parseBoolean(answers.hasClaimedBefore);
  const within3YearsBool = parseBoolean(answers.claimedWithinLast3Years);

  let notificationRequired: boolean | null = null;
  let status: NotificationStatusState = "unclear";

  if (hasClaimedBeforeBool === false) {
    notificationRequired = true;
    status = "required";
  } else if (hasClaimedBeforeBool === true && within3YearsBool === true) {
    notificationRequired = false;
    status = "not_required";
  } else if (hasClaimedBeforeBool === true && within3YearsBool === false) {
    notificationRequired = true;
    status = "required";
  } else {
    notificationRequired = null;
    status = "unclear";
  }

  let deadlineDate: string | null = null;
  if (answers.accountingPeriodEnd) {
    const end = new Date(answers.accountingPeriodEnd);
    if (!Number.isNaN(end.getTime())) {
      const deadline = new Date(end);
      deadline.setMonth(deadline.getMonth() + 6);
      deadlineDate = deadline.toISOString().slice(0, 10);
    }
  }

  return {
    notificationRequired,
    status,
    deadlineDate,
  };
}

export async function upsertOrganisationNotificationStatus(params: {
  organisationId: string;
  answers: NotificationCheckAnswers;
}): Promise<OrganisationNotificationStatusRow> {
  const outcome = computeNotificationOutcome(params.answers);

  const insert: OrganisationNotificationStatusInsert = {
    organisation_id: params.organisationId,
    accounting_period_start: params.answers.accountingPeriodStart
      ? params.answers.accountingPeriodStart
      : null,
    accounting_period_end: params.answers.accountingPeriodEnd
      ? params.answers.accountingPeriodEnd
      : null,
    has_claimed_before: parseBoolean(params.answers.hasClaimedBefore),
    claimed_within_last_3_years: parseBoolean(
      params.answers.claimedWithinLast3Years
    ),
    notification_required: outcome.notificationRequired,
    status: outcome.status,
    deadline_date: outcome.deadlineDate,
    internal_rd_contact_name: params.answers.internalRdContactName ?? null,
    internal_rd_contact_email: params.answers.internalRdContactEmail ?? null,
    organisation_rd_summary: params.answers.organisationRdSummary ?? null,
  };

  const { data, error } = await supabase
    .from("organisation_notification_status")
    .upsert(
      {
        ...insert,
        updated_at: new Date().toISOString(),
      } as OrganisationNotificationStatusInsert,
      { onConflict: "organisation_id" }
    )
    .select("*")
    .single();

  if (error) {
    console.error(
      "[organisationNotificationStatusService.upsert] Error:",
      error
    );
    throw error;
  }

  return data as OrganisationNotificationStatusRow;
}

export async function getOrganisationNotificationStatus(
  organisationId: string
): Promise<OrganisationNotificationStatusRow | null> {
  const { data, error } = await supabase
    .from("organisation_notification_status")
    .select("*")
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) {
    console.error(
      "[organisationNotificationStatusService.get] Error:",
      error
    );
    return null;
  }

  return data as OrganisationNotificationStatusRow | null;
}

export const organisationNotificationStatusService = {
  computeNotificationOutcome,
  upsertOrganisationNotificationStatus,
  getOrganisationNotificationStatus,
};