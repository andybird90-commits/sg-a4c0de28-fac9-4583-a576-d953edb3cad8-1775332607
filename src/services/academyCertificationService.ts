import { supabaseServer } from "@/integrations/supabase/serverClient";
import type { Database } from "@/integrations/supabase/types";

export type AcademyCertificateRow = Database["public"]["Tables"]["academy_certificates"]["Insert"];

export interface CertificationEligibility {
  eligible: boolean;
  reason?: string;
  completedModules: string[];
  requiredModules: string[];
}

export async function getCertificationEligibility(userId: string): Promise<CertificationEligibility> {
  if (!userId) {
    return {
      eligible: false,
      reason: "No user session.",
      completedModules: [],
      requiredModules: [],
    };
  }

  const requiredModules = [
    "rd-fundamentals",
    "claim-writing-mastery",
    "evidence-assessment",
    "permitted-costs",
    "hmrc-enquiry-simulator",
    "ai-claim-critique",
  ];

  const { data, error } = await supabaseServer
    .from("academy_module_progress")
    .select("module_id, quiz_passed, last_score")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching module progress", error);
    return {
      eligible: false,
      reason: "Unable to fetch academy progress.",
      completedModules: [],
      requiredModules,
    };
  }

  const rows = data ?? [];

  const completedModules = rows
    .filter(
      (row) =>
        row.quiz_passed ||
        (typeof row.last_score === "number" && row.last_score >= 70),
    )
    .map((row) => row.module_id);

  const allCompleted = requiredModules.every((id) => completedModules.includes(id));

  return {
    eligible: allCompleted,
    reason: allCompleted ? undefined : "All modules must be completed with quizzes passed.",
    completedModules,
    requiredModules,
  };
}

export async function createCertificateRecord(params: {
  userId: string;
  recipientName: string;
  certificateId: string;
  verificationCode: string;
  completedAt: string;
}): Promise<{ id: string | null; error: string | null }> {
  const { userId, recipientName, certificateId, verificationCode, completedAt } = params;

  const { data, error } = await supabaseServer
    .from("academy_certificates")
    .insert({
      user_id: userId,
      recipient_name: recipientName,
      certificate_id: certificateId,
      verification_code: verificationCode,
      completed_at: completedAt,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating certificate record", error);
    return { id: null, error: "Failed to store certificate record." };
  }

  return { id: data?.id ?? null, error: null };
}

export async function getCertificateByPublicId(certificateId: string) {
  const { data, error } = await supabaseServer
    .from("academy_certificates")
    .select("id, user_id, recipient_name, certificate_id, verification_code, completed_at")
    .eq("certificate_id", certificateId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching certificate by ID", error);
    return { data: null, error };
  }

  return { data, error: null };
}