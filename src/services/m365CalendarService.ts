const tenantId = process.env.M365_TENANT_ID;
const clientId = process.env.M365_CLIENT_ID;
const clientSecret = process.env.M365_CLIENT_SECRET;
const redirectUri = process.env.M365_REDIRECT_URI;

if (!tenantId || !clientId || !clientSecret || !redirectUri) {
  console.warn("Microsoft 365 environment variables are not fully configured");
}

interface TokenResponse {
  token_type: string;
  scope: string;
  expires_in: number;
  ext_expires_in?: number;
  access_token: string;
  refresh_token?: string;
}

export interface FeasibilityMeetingDetails {
  id: string;
  cif_case_id: string;
  meeting_date: string;
  meeting_start_time: string;
  meeting_end_time: string;
  client_teams_email: string | null;
  feasibility_user_email: string | null;
  bdm_user_email: string | null;
  prospect_company_name: string | null;
}

export function buildM365AuthUrl(state: string): string {
  if (!tenantId || !clientId || !redirectUri) {
    throw new Error("Microsoft 365 OAuth environment variables are not set");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "Calendars.ReadWrite"
    ].join(" "),
    state
  });

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  if (!tenantId || !clientId || !clientSecret || !redirectUri) {
    throw new Error("Microsoft 365 OAuth environment variables are not set");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    scope: "offline_access Calendars.ReadWrite"
  });

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const data = (await response.json()) as any;

  if (!response.ok) {
    console.error("Error exchanging code for tokens:", data);
    throw new Error("Failed to exchange authorization code for tokens");
  }

  return data as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  if (!tenantId || !clientId || !clientSecret || !redirectUri) {
    throw new Error("Microsoft 365 OAuth environment variables are not set");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: "offline_access Calendars.ReadWrite"
  });

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const data = (await response.json()) as any;

  if (!response.ok) {
    console.error("Error refreshing access token:", data);
    throw new Error("Failed to refresh Microsoft 365 access token");
  }

  return data as TokenResponse;
}

export async function createTeamsMeetingEvent(
  accessToken: string,
  organiserEmail: string,
  meeting: FeasibilityMeetingDetails
): Promise<{ eventId: string; joinUrl: string | null }> {
  const url = "https://graph.microsoft.com/v1.0/me/events";

  const attendees: Array<{ emailAddress: { address: string }; type: string }> = [];

  if (meeting.feasibility_user_email) {
    attendees.push({
      emailAddress: { address: meeting.feasibility_user_email },
      type: "required"
    });
  }

  if (meeting.bdm_user_email && meeting.bdm_user_email !== meeting.feasibility_user_email) {
    attendees.push({
      emailAddress: { address: meeting.bdm_user_email },
      type: "required"
    });
  }

  if (meeting.client_teams_email) {
    attendees.push({
      emailAddress: { address: meeting.client_teams_email },
      type: "required"
    });
  }

  const subjectParts: string[] = ["Feasibility Call"];
  if (meeting.prospect_company_name) {
    subjectParts.push(`- ${meeting.prospect_company_name}`);
  }

  const bodyContent = `Feasibility call generated from RD Companion for CIF case ${meeting.cif_case_id}.`;

  const payload = {
    subject: subjectParts.join(" "),
    body: {
      contentType: "HTML",
      content: bodyContent
    },
    start: {
      dateTime: meeting.meeting_start_time,
      timeZone: "UTC"
    },
    end: {
      dateTime: meeting.meeting_end_time,
      timeZone: "UTC"
    },
    attendees,
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
    organizer: organiserEmail
      ? {
          emailAddress: {
            address: organiserEmail
          }
        }
      : undefined
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as any;

  if (!response.ok) {
    console.error("Error creating Teams meeting via Microsoft Graph:", data);
    throw new Error("Failed to create Teams meeting in organiser calendar");
  }

  const eventId: string = data.id as string;
  const joinUrl: string | null =
    (data.onlineMeeting && data.onlineMeeting.joinUrl) ||
    (data.onlineMeeting && data.onlineMeeting.joinWebUrl) ||
    null;

  return { eventId, joinUrl };
}