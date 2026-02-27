import type { NextApiRequest, NextApiResponse } from "next";
import { exchangeCodeForTokens } from "@/services/m365CalendarService";
import { supabaseServer } from "@/integrations/supabase/serverClient";

interface StatePayload {
  userId: string;
  returnTo?: string;
}

function decodeState(state: string): StatePayload | null {
  try {
    const json = Buffer.from(state, "base64url").toString("utf-8");
    return JSON.parse(json) as StatePayload;
  } catch (error) {
    console.error("Failed to decode Microsoft 365 OAuth state:", error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error("Microsoft 365 OAuth error:", error, error_description);
    res.status(400).send("Microsoft 365 authorisation failed");
    return;
  }

  if (!code || typeof code !== "string" || !state || typeof state !== "string") {
    res.status(400).send("Missing code or state");
    return;
  }

  const decoded = decodeState(state);
  if (!decoded || !decoded.userId) {
    res.status(400).send("Invalid state parameter");
    return;
  }

  const returnTo = decoded.returnTo || "/staff/feasibility-calls";

  try {
    const tokenResponse = await exchangeCodeForTokens(code);

    const idToken = (tokenResponse as any).id_token as string | undefined;
    let azureOid: string | null = null;

    if (idToken) {
      const [, payloadPart] = idToken.split(".");
      if (payloadPart) {
        try {
          const payloadJson = Buffer.from(payloadPart, "base64").toString("utf-8");
          const payload = JSON.parse(payloadJson) as { oid?: string };
          if (payload.oid) {
            azureOid = payload.oid;
          }
        } catch (parseError) {
          console.warn("Failed to parse id_token payload for oid:", parseError);
        }
      }
    }

    if (!azureOid) {
      azureOid = decoded.userId;
    }

    const expiresIn = tokenResponse.expires_in;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertError } = await (supabaseServer as any)
      .from("calendar_accounts")
      .upsert(
        {
          user_id: decoded.userId,
          provider: "m365",
          azure_oid: azureOid,
          refresh_token: tokenResponse.refresh_token || "",
          access_token: tokenResponse.access_token,
          access_token_expires_at: expiresAt
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Error upserting calendar_accounts:", upsertError);
      res.status(500).send("Failed to save calendar connection");
      return;
    }

    res.writeHead(302, { Location: `${returnTo}?calendar=connected` });
    res.end();
  } catch (callbackError) {
    console.error("Error handling Microsoft 365 OAuth callback:", callbackError);
    res.status(500).send("Microsoft 365 callback error");
  }
}