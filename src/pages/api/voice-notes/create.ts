import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { supabaseServer } from "@/integrations/supabase/serverClient";

interface CreateVoiceNoteRequestBody {
  audioBase64?: string;
  mimeType?: string;
  organisationId?: string;
  additionalContext?: string | null;
  userId?: string;
  projectId?: string | null;
  projectName?: string | null;
}

interface CreateVoiceNoteResponse {
  success: boolean;
  error?: string;
  message?: string;
  projectId?: string | null;
  projectName?: string | null;
  needsConfirmation?: boolean;
  transcript?: string | null;
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
    const { audioBase64, mimeType, organisationId, additionalContext, userId, projectId, projectName } = body;

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
          (transcription as any)?.text ||
          (transcription as any)?.results?.[0]?.alternatives?.[0]?.text ||
          "";

        transcriptText = text.trim() || null;
      } catch (err) {
        console.error("Voice note transcription failed:", err);
        transcriptText = null;
      }
    }

    const providedProjectId = typeof projectId === "string" ? projectId.trim() : null;
    const providedProjectName = typeof projectName === "string" ? projectName.trim() : null;

    let detectedProjectId: string | null =
      providedProjectId && providedProjectId.length > 0 ? providedProjectId : null;
    let detectedProjectName: string | null =
      providedProjectName && providedProjectName.length > 0 ? providedProjectName : null;
    let detectionConfidence: number | null = null;

    // Heuristic project matching based on transcript + additional context,
    // but only if the user has not already chosen a project explicitly.
    if (!detectedProjectId) {
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
            let bestMatch: { id: string; name: string; score: number } | null = null;

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

          if (!detectedProjectId && projects.length === 1) {
            const only = projects[0] as any;
            detectedProjectId = only.id;
            detectedProjectName = only.name;
            detectionConfidence = 0.6;
          }
        }
      } catch (matchErr) {
        console.error("Error while matching voice note to project:", matchErr);
      }
    } else {
      // User explicitly chose a project from the dropdown; treat as fully confident.
      detectionConfidence = 1;
    }

    if (!detectedProjectId) {
      const hasTranscript =
        Boolean(transcriptText && transcriptText.trim().length > 0);

      const friendlyError = hasTranscript
        ? "We couldn't automatically find a project for this voice note. Please add the project name into the transcript box and save again, then press Save Voice Note."
        : "We couldn't reliably transcribe this voice note. Please type a short summary, including the exact project name, into the transcript box and save again, then press Save Voice Note.";

      res.status(400).json({
        success: false,
        error: friendlyError,
        transcript: transcriptText,
      });
      return;
    }

    const transcriptToStore =
      (transcriptText && transcriptText.trim().length > 0
        ? transcriptText.trim()
        : additionalContext?.trim() || null);

    const { data: inserted, error: insertError } = await supabaseServer
      .from("project_voice_notes")
      .insert({
        project_id: detectedProjectId,
        org_id: organisationId,
        created_by_user_id: userId,
        original_audio_url: audioDataUrl,
        transcript_raw: transcriptText,
        transcript_cleaned: transcriptToStore,
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
      needsConfirmation: false,
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