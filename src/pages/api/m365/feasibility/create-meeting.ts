import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import { createTeamsMeetingEvent, refreshAccessToken } from "@/services/m365CalendarService";

const supabaseAdmin = supabaseServer as any;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { meetingId } = req.body as { meetingId?: string };

  if (!meetingId) {
    res.status(400).json({ error: "Missing meetingId in request body" });
    return;
  }

  try {
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from("feasibility_meetings")
      .select(
        `
        id,
        cif_case_id,
        meeting_date,
        meeting_start_time,
        meeting_end_time,
        client_teams_email,
        feasibility_user_id,
        bdm_user_id,
        teams_meeting_link,
        profiles_feasibility:profiles!feasibility_meetings_feasibility_user_id_fkey(email),
        profiles_bdm:profiles!feasibility_meetings_bdm_user_id_fkey(email),
        cif_records!feasibility_meetings_cif_case_id_fkey(
          id,
          prospect_id,
          prospects!cif_records_prospect_id_fkey(
            company_name
          )
        )
      `
      )
      .eq("id", meetingId)
      .maybeSingle();

    if (meetingError || !meeting) {
      console.error("Error loading feasibility meeting:", meetingError);
      res.status(404).json({ error: "Meeting not found" });
      return;
    }

    const feasibilityEmail: string | null =
      Array.isArray(meeting.profiles_feasibility) && meeting.profiles_feasibility[0]
        ? meeting.profiles_feasibility[0].email
        : meeting.profiles_feasibility?.email ?? null;

    const bdmEmail: string | null =
      Array.isArray(meeting.profiles_bdm) && meeting.profiles_bdm[0]
        ? meeting.profiles_bdm[0].email
        : meeting.profiles_bdm?.email ?? null;

    const cifRecord = Array.isArray(meeting.cif_records) ? meeting.cif_records[0] : meeting.cif_records;
    const prospect =
      cifRecord && Array.isArray(cifRecord.prospects) ? cifRecord.prospects[0] : cifRecord?.prospects;
    const companyName: string | null = prospect?.company_name ?? null;

    const organiserUserId: string = meeting.feasibility_user_id as string;

    const { data: rawCalendarAccount, error: calendarError } = await supabaseAdmin
      .from("calendar_accounts")
      .select("id, refresh_token, access_token, access_token_expires_at")
      .eq("user_id", organiserUserId)
      .eq("provider", "m365")
      .maybeSingle();

    if (calendarError) {
      console.error("Error loading calendar account:", calendarError);
      res.status(500).json({ error: "Failed to load calendar account" });
      return;
    }

    if (!rawCalendarAccount) {
      res.status(200).json({ created: false, reason: "no_calendar_connected" });
      return;
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

      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

      const { error: updateError } = await supabaseAdmin
        .from("calendar_accounts")
        .update({
          access_token: refreshed.access_token,
          access_token_expires_at: newExpiresAt,
          refresh_token: refreshed.refresh_token || calendarAccount.refresh_token
        })
        .eq("id", calendarAccount.id);

      if (updateError) {
        console.error("Error updating refreshed calendar token:", updateError);
      }

      accessToken = refreshed.access_token;
    }

    if (!accessToken) {
      res.status(500).json({ error: "No valid access token for calendar account" });
      return;
    }

    const meetingDetails = {
      id: meeting.id as string,
      cif_case_id: meeting.cif_case_id as string,
      meeting_date: meeting.meeting_date as string,
      meeting_start_time: meeting.meeting_start_time as string,
      meeting_end_time: meeting.meeting_end_time as string,
      client_teams_email: meeting.client_teams_email as string | null,
      feasibility_user_email: feasibilityEmail,
      bdm_user_email: bdmEmail,
      prospect_company_name: companyName
    };

    const { eventId, joinUrl } = await createTeamsMeetingEvent(
      accessToken,
      feasibilityEmail || "",
      meetingDetails
    );

    const { error: updateMeetingError } = await supabaseAdmin
      .from("feasibility_meetings")
      .update({
        teams_meeting_link: joinUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", meeting.id);

    if (updateMeetingError) {
      console.error("Error updating feasibility meeting with Teams link:", updateMeetingError);
    }

    res.status(200).json({
      created: true,
      eventId,
      joinUrl
    });
  } catch (handlerError) {
    console.error("Unexpected error creating Teams meeting:", handlerError);
    res.status(500).json({ error: "Unexpected error creating Teams meeting" });
  }
}