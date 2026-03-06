import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { supabaseServer } from "@/integrations/supabase/serverClient";

interface CreateVoiceNoteRequestBody {
  audioBase64?: string;
  mimeType?: string;
  organisationId?: string;
  additionalContext?: string | null;
  userId?: string;
}

interface CreateVoiceNoteResponse {
  success: boolean;
  error?: string;
  message?: string;
  projectId?: string | null;
  projectName?: string | null;
  needsConfirmation?: boolean;
}

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateVoiceNoteResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return;
  }

  try {
    const body = req.body as CreateVoiceNoteRequestBody;
    const { audioBase64, mimeType, organisationId, additionalContext, userId } = body;

    if (!audioBase64 || !organisationId) {
      res.status(400).json({
        success: false,
        error: "Missing required audio or organisation information.",
      });
      return;
    }

    if (!userId || !userId.trim()) {
      res.status(401).json({
        success: false,
        error: "Missing user information for voice note.",
      });
      return;
    }

    const audioMimeType = mimeType && mimeType.trim() ? mimeType : "audio/webm";
    const audioDataUrl = `data:${audioMimeType};base64,${audioBase64}`;

    let transcriptText: string | null = null;

    if (openai) {
      try {
        const buffer = Buffer.from(audioBase64, "base64");
        const file = await OpenAI.toFile(buffer, "voice-note.webm");

        const transcription = await openai.audio.transcriptions.create({
          file,
          model: "gpt-4o-mini-transcribe",
        });

        const text =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (transcription as any)?.text ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (transcription as any)?.results?.[0]?.alternatives?.[0]?.text ||
          "";

        transcriptText = text.trim() || null;
      } catch (err) {
        console.error("Voice note transcription failed:", err);
      }
    }

    // Heuristic project matching based on transcript + additional context.
    let detectedProjectId: string | null = null;
    let detectedProjectName: string | null = null;
    let detectionConfidence: number | null = null;

    try {
      const { data: projects, error: projectsError } = await supabaseServer
        .from("sidekick_projects")
        .select("id, name, description")
        .eq("company_id", organisationId);

      if (!projectsError && projects && projects.length > 0) {
        const haystack = `${additionalContext || ""}\n${transcriptText || ""}`
          .toLowerCase()
          .trim();

        if (haystack) {
          let bestMatch: { id: string; name: string; score: number } | null =
            null;

          // Simple name-in-text matching. If you say the exact project name,
          // it should be picked up.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (projects as any[]).forEach((p) => {
            const name = (p.name || "").toString().toLowerCase().trim();
            if (!name) return;

            const index = haystack.indexOf(name);
            const score = index === -1 ? 0 : name.length;

            if (score > 0 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { id: p.id, name: p.name, score };
            }
          });

          if (bestMatch) {
            detectedProjectId = bestMatch.id;
            detectedProjectName = bestMatch.name;
            detectionConfidence = 0.8;
          }
        }

        // If we still have no match but there is only one project, assume it.
        if (!detectedProjectId && projects.length === 1) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const only = projects[0] as any;
          detectedProjectId = only.id;
          detectedProjectName = only.name;
          detectionConfidence = 0.6;
        }
      }
    } catch (matchErr) {
      console.error("Error while matching voice note to project:", matchErr);
    }

    const { data: inserted, error: insertError } = await supabaseServer
      .from("project_voice_notes")
      .insert({
        project_id: detectedProjectId,
        org_id: organisationId,
        created_by_user_id: userId,
        original_audio_url: audioDataUrl,
        transcript_raw: transcriptText,
        transcript_cleaned: transcriptText,
        ai_summary: null,
        detected_project_name: detectedProjectName,
        detection_confidence: detectionConfidence,
        manually_confirmed: Boolean(detectedProjectId),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting project voice note:", insertError);
      res.status(500).json({
        success: false,
        error: insertError.message || "Failed to save voice note.",
      });
      return;
    }

    const message = detectedProjectName
      ? `Voice note saved to ${detectedProjectName}.`
      : "Voice note saved. Please confirm the correct project from the voice notes tab.";

    res.status(200).json({
      success: true,
      message,
      projectId: detectedProjectId,
      projectName: detectedProjectName,
      needsConfirmation: !detectedProjectId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while saving voice note.";
    console.error("Voice note create error:", error);
    res.status(500).json({ success: false, error: message });
  }
}