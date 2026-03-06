import type { NextApiRequest, NextApiResponse } from "next";

interface CreateVoiceNoteRequestBody {
  audioBase64?: string;
  mimeType?: string;
  organisationId?: string;
  additionalContext?: string | null;
}

interface CreateVoiceNoteResponse {
  success: boolean;
  error?: string;
  message?: string;
  projectName?: string | null;
  needsConfirmation?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<CreateVoiceNoteResponse>): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return;
  }

  try {
    const body = req.body as CreateVoiceNoteRequestBody;

    if (!body.audioBase64 || !body.organisationId) {
      res.status(400).json({ success: false, error: "Missing required audio or organisation information." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Voice note received. Processing pipeline to be connected.",
      projectName: null,
      needsConfirmation: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error while saving voice note.";
    res.status(500).json({ success: false, error: message });
  }
}