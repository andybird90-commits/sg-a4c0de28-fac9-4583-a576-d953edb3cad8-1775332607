import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ClaimCompletionStatusRow =
  Database["public"]["Tables"]["claim_completion_status"]["Row"];
type ClaimCompletionStatusInsert =
  Database["public"]["Tables"]["claim_completion_status"]["Insert"];
type ClaimCompletionStatusUpdate =
  Database["public"]["Tables"]["claim_completion_status"]["Update"];

export type ClaimStepStatus = "not_started" | "in_progress" | "complete";

export type ClaimCompletionStatus = ClaimCompletionStatusRow;

class ClaimCompletionStatusService {
  async getForClaim(claimId: string): Promise<ClaimCompletionStatus | null> {
    const { data, error } = await supabase
      .from("claim_completion_status")
      .select("*")
      .eq("claim_id", claimId)
      .maybeSingle();

    if (error) {
      console.error("[claimCompletionStatusService.getForClaim] Error:", error);
      throw error;
    }

    return (data ?? null) as ClaimCompletionStatus | null;
  }

  async upsertForClaim(
    claimId: string,
    updates: Partial<ClaimCompletionStatusInsert | ClaimCompletionStatusUpdate>
  ): Promise<ClaimCompletionStatus> {
    const payload: ClaimCompletionStatusInsert = {
      claim_id: claimId,
      ...(updates as ClaimCompletionStatusInsert),
    };

    const { data, error } = await supabase
      .from("claim_completion_status")
      .upsert(payload, { onConflict: "claim_id" })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error(
        "[claimCompletionStatusService.upsertForClaim] Error:",
        error
      );
      throw error ?? new Error("Failed to upsert claim_completion_status");
    }

    return data as ClaimCompletionStatus;
  }

  async getForClaims(
    claimIds: string[]
  ): Promise<Record<string, ClaimCompletionStatus>> {
    if (!claimIds.length) return {};

    const { data, error } = await supabase
      .from("claim_completion_status")
      .select("*")
      .in("claim_id", claimIds);

    if (error) {
      console.error(
        "[claimCompletionStatusService.getForClaims] Error:",
        error
      );
      throw error;
    }

    const map: Record<string, ClaimCompletionStatus> = {};
    (data || []).forEach((row) => {
      if (row.claim_id) {
        map[row.claim_id] = row as ClaimCompletionStatus;
      }
    });

    return map;
  }
}

export const claimCompletionStatusService =
  new ClaimCompletionStatusService();