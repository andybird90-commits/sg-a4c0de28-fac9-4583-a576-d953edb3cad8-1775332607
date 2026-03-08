import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OrganisationNotificationStatus =
  Database["public"]["Tables"]["organisation_notification_status"]["Row"];

export type NotificationStatusState = OrganisationNotificationStatus["status"];

type InsertOrganisationNotificationStatus =
  Database["public"]["Tables"]["organisation_notification_status"]["Insert"];

export const organisationNotificationStatusService = {
  async getOrganisationNotificationStatus(
    organisationId: string
  ): Promise<OrganisationNotificationStatus | null> {
    const { data, error } = await supabase
      .from("organisation_notification_status")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching organisation notification status:", error);
      throw error;
    }

    return data ?? null;
  },

  async upsertOrganisationNotificationStatus(
    payload: InsertOrganisationNotificationStatus
  ): Promise<OrganisationNotificationStatus> {
    const { data, error } = await supabase
      .from("organisation_notification_status")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Error upserting organisation notification status:", error);
      throw error;
    }

    return data;
  },

  async getAllStatusesWithOrg(): Promise<
    (OrganisationNotificationStatus & { organisation: { id: string; name: string } | null })[]
  > {
    const { data, error } = await supabase
      .from("organisation_notification_status")
      .select(
        `
        *,
        organisation:organisations(id, name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all organisation notification statuses:", error);
      throw error;
    }

    return (data || []) as (OrganisationNotificationStatus & {
      organisation: { id: string; name: string } | null;
    })[];
  },

  async createPreNotification(
    payload: Omit<
      InsertOrganisationNotificationStatus,
      "id" | "created_at" | "updated_at"
    >
  ): Promise<OrganisationNotificationStatus> {
    const insertPayload: InsertOrganisationNotificationStatus = {
      ...payload,
    };

    const { data, error } = await supabase
      .from("organisation_notification_status")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("Error creating pre-notification record:", error);
      throw error;
    }

    return data;
  },

  async markSubmitted(id: string): Promise<void> {
    const { error } = await supabase
      .from("organisation_notification_status")
      .update({
        status: "submitted",
        notification_required: false,
        submission_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", id);

    if (error) {
      console.error("Error marking pre-notification as submitted:", error);
      throw error;
    }
  },

  async deleteStatus(id: string): Promise<void> {
    const { error } = await supabase
      .from("organisation_notification_status")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting organisation notification status:", error);
      throw error;
    }
  },
};