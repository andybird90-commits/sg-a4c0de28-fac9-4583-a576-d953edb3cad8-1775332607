import type { NextApiRequest, NextApiResponse } from "next";
import { buildM365AuthUrl } from "@/services/m365CalendarService";

interface StatePayload {
  userId: string;
  returnTo?: string;
}

function encodeState(payload: StatePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  const { userId, returnTo } = req.query;

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing userId query parameter" });
    return;
  }

  const state = encodeState({ userId, returnTo: typeof returnTo === "string" ? returnTo : undefined });
  const authUrl = buildM365AuthUrl(state);

  res.writeHead(302, { Location: authUrl });
  res.end();
}