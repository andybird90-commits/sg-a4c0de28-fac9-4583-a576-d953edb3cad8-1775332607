import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import {
  createTeamsMeetingEvent,
  refreshAccessToken,
} from "@/services/m365CalendarService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { prospectId, bdmUserId, startIso, durationMinutes } = req.body as {
    prospectId?: string;
    bdmUserId?: string;
    startIso?: string;
    durationMinutes?: number;
  };

  if (!prospectId || !bdmUserId || !startIso) {
    return res
      .status(400)
      .json({ message: "prospectId, bdmUserId and startIso are required" });
  }

  try {
    const { data: prospect, error: prospectError } = await (supabaseServer as any)
      .from("sdr_prospects")
      .select("id, company_name")
      .eq("id", prospectId)
      .maybeSingle();

    if (prospectError || !prospect) {
      console.error("Error loading SDR prospect for BDM call:", prospectError);
      return res.status(404).json({ message: "Prospect not found" });
    }

    const { data: bdmProfile, error: profileError } = await (supabaseServer as any)
      .from("profiles")
      .select("id, email")
      .eq("id", bdmUserId)
      .maybeSingle();

    if (profileError || !bdmProfile || !bdmProfile.email) {
      console.error("Error loading BDM profile for calendar booking:", profileError);
      return res
        .status(500)
        .json({ message: "BDM profile or email not available for booking" });
    }

    const organiserUserId: string = bdmProfile.id as string;

    const { data: rawCalendarAccount, error: calendarError } = await (supabaseServer as any)
      .from("calendar_accounts")
      .select("id, refresh_token, access_token, access_token_expires_at")
      .eq("user_id", organiserUserId)
      .eq("provider", "m365")
      .maybeSingle();

    if (calendarError) {
      console.error("Error loading calendar account for BDM:", calendarError);
      return res.status(500).json({ message: "Failed to load calendar account" });
    }

    if (!rawCalendarAccount) {
      return res
        .status(200)
        .json({ created: false, reason: "no_calendar_connected" });
    }

    const calendarAccount = rawCalendarAccount as {
      id: string;
      refresh_token: string | null;
      access_token: string | null;
      access_token_expires_at: string | null;
    };

    let accessToken: string | null = calendarAccount.access_token ?? null;
    const expiresAtRaw: string | null = calendarAccount.access_token_expires_at ?? null;
    const now = new Date();

    if (!accessToken || (expiresAtRaw && new Date(expiresAtRaw) <= now)) {
      const refreshed = await refreshAccessToken(calendarAccount.refresh_token as string);

      const newExpiresAt = new Date(
        Date.now() + (refreshed.expires_in || 3600) * 1000
      ).toISOString();

      const { error: updateError } = await (supabaseServer as any)
        .from("calendar_accounts")
        .update({
          access_token: refreshed.access_token,
          access_token_expires_at: newExpiresAt,
          refresh_token: refreshed.refresh_token || calendarAccount.refresh_token,
        })
        .eq("id", calendarAccount.id);

      if (updateError) {
        console.error("Error updating refreshed BDM calendar token:", updateError);
      }

      accessToken = refreshed.access_token;
    }

    if (!accessToken) {
      return res
        .status(500)
        .json({ message: "No valid access token for BDM calendar account" });
    }

    const start = new Date(startIso);
    const duration = typeof durationMinutes === "number" ? durationMinutes : 30;
    const end = new Date(start.getTime() + duration * 60000);

    const meetingDetails = {
      id: prospect.id as string,
      cif_case_id: `SDR-${prospect.id as string}`,
      meeting_date: start.toISOString().split("T")[0],
      meeting_start_time: start.toISOString(),
      meeting_end_time: end.toISOString(),
      client_teams_email: null as string | null,
      feasibility_user_email: null as string | null,
      bdm_user_email: bdmProfile.email as string | null,
      prospect_company_name: prospect.company_name as string | null,
    };

    const { eventId, joinUrl } = await createTeamsMeetingEvent(
      accessToken,
      bdmProfile.email as string,
      meetingDetails
    );

    const { data: updatedProspect, error: updateError } = await (supabaseServer as any)
      .from("sdr_prospects")
      .update({
        bdm_user_id: organiserUserId,
        bdm_call_scheduled_at: start.toISOString(),
        bdm_call_duration_minutes: duration,
        bdm_call_teams_link: joinUrl,
        bdm_call_event_id: eventId,
        status: "bdm_call_scheduled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", prospect.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating SDR prospect with BDM call:", updateError);
    }

    return res.status(200).json({
      created: true,
      eventId,
      joinUrl,
      updatedProspect,
    });
  } catch (error) {
    console.error("Unexpected SDR BDM call booking error:", error);
    return res.status(500).json({ message: "Failed to book BDM call" });
  }
}