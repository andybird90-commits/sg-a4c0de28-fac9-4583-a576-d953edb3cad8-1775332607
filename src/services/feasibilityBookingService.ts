import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FeasibilityAvailability = Database["public"]["Tables"]["feasibility_availability"]["Row"];
type FeasibilityAvailabilityInsert = Database["public"]["Tables"]["feasibility_availability"]["Insert"];
type FeasibilityMeeting = Database["public"]["Tables"]["feasibility_meetings"]["Row"];
type FeasibilityMeetingInsert = Database["public"]["Tables"]["feasibility_meetings"]["Insert"];

export interface AvailabilitySlot extends FeasibilityAvailability {
  user_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface MeetingWithDetails extends FeasibilityMeeting {
  cif?: {
    id: string;
    prospect_id: string;
  };
  prospect?: {
    company_name: string;
    contact_name: string | null;
    contact_email: string | null;
  };
  bdm_profile?: {
    full_name: string | null;
    email: string | null;
  };
  feasibility_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export const feasibilityBookingService = {
  /**
   * Create availability slots for a feasibility user
   */
  async createAvailabilitySlots(
    userId: string,
    startTime: Date,
    endTime: Date,
    slotLengthMinutes: number = 30
  ): Promise<FeasibilityAvailability[]> {
    try {
      const slots: FeasibilityAvailabilityInsert[] = [];
      let currentTime = new Date(startTime);

      while (currentTime < endTime) {
        const slotEnd = new Date(currentTime.getTime() + slotLengthMinutes * 60000);
        if (slotEnd > endTime) break;

        slots.push({
          user_id: userId,
          start_time: currentTime.toISOString(),
          end_time: slotEnd.toISOString(),
          slot_length_minutes: slotLengthMinutes,
          is_booked: false,
          slot_type: "feasibility_call"
        });

        currentTime = slotEnd;
      }

      const { data, error } = await supabase
        .from("feasibility_availability")
        .insert(slots)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error creating availability slots:", error);
      throw error;
    }
  },

  /**
   * Get available slots (not booked, future times only)
   */
  async getAvailableSlots(
    feasibilityUserId?: string,
    startDate?: Date
  ): Promise<AvailabilitySlot[]> {
    try {
      const now = startDate || new Date();
      
      let query = supabase
        .from("feasibility_availability")
        .select(`
          *,
          user_profile:profiles!feasibility_availability_user_id_fkey(full_name, email)
        `)
        .eq("is_booked", false)
        .gte("start_time", now.toISOString())
        .order("start_time", { ascending: true });

      if (feasibilityUserId) {
        query = query.eq("user_id", feasibilityUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(slot => ({
        ...slot,
        user_profile: Array.isArray(slot.user_profile) ? slot.user_profile[0] : slot.user_profile
      })) as AvailabilitySlot[];
    } catch (error) {
      console.error("Error fetching available slots:", error);
      throw error;
    }
  },

  /**
   * Get user's own availability slots
   */
  async getUserAvailability(userId: string): Promise<AvailabilitySlot[]> {
    try {
      const { data, error } = await supabase
        .from("feasibility_availability")
        .select("*")
        .eq("user_id", userId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching user availability:", error);
      throw error;
    }
  },

  /**
   * Delete availability slot
   */
  async deleteAvailabilitySlot(slotId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("feasibility_availability")
        .delete()
        .eq("id", slotId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting availability slot:", error);
      return false;
    }
  },

  /**
   * Book a feasibility meeting
   */
  async bookFeasibilityMeeting(
    cifId: string,
    clientId: string | null,
    bdmUserId: string,
    slotId: string,
    clientEmail: string
  ): Promise<FeasibilityMeeting | null> {
    try {
      // Get slot details
      const { data: slot, error: slotError } = await supabase
        .from("feasibility_availability")
        .select("*")
        .eq("id", slotId)
        .single();

      if (slotError || !slot) throw slotError || new Error("Slot not found");
      if (slot.is_booked) throw new Error("Slot already booked");

      // Create meeting
      const meetingData: FeasibilityMeetingInsert = {
        cif_case_id: cifId,
        client_id: clientId,
        bdm_user_id: bdmUserId,
        feasibility_user_id: slot.user_id,
        slot_id: slotId,
        meeting_date: new Date(slot.start_time).toISOString().split("T")[0],
        meeting_start_time: slot.start_time,
        meeting_end_time: slot.end_time,
        meeting_status: "booked",
        client_teams_email: clientEmail
      };

      const { data: meeting, error: meetingError } = await supabase
        .from("feasibility_meetings")
        .insert(meetingData)
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Mark slot as booked
      const { error: updateError } = await supabase
        .from("feasibility_availability")
        .update({ is_booked: true, cif_case_id: cifId })
        .eq("id", slotId);

      if (updateError) throw updateError;

      // Update CIF stage
      const { error: cifError } = await supabase
        .from("cif_records")
        .update({ current_stage: "feasibility_booked" })
        .eq("id", cifId);

      if (cifError) throw cifError;

      // Create notification for feasibility user
      await this.createBookingNotification(
        slot.user_id,
        cifId,
        meeting.id,
        clientEmail
      );

      return meeting;
    } catch (error) {
      console.error("Error booking feasibility meeting:", error);
      throw error;
    }
  },

  /**
   * Create notification for feasibility booking
   */
  async createBookingNotification(
    feasibilityUserId: string,
    cifId: string,
    meetingId: string,
    clientEmail: string
  ): Promise<void> {
    try {
      // Get CIF and prospect details
      const { data: cif, error: cifError } = await supabase
        .from("cif_records")
        .select(`
          id,
          prospect_id,
          prospects(company_name, contact_name)
        `)
        .eq("id", cifId)
        .single();

      if (cifError || !cif) return;

      const prospect = Array.isArray(cif.prospects) ? cif.prospects[0] : cif.prospects;

      await supabase.from("notifications").insert({
        user_id: feasibilityUserId,
        type: "feasibility_booking_request",
        payload_json: {
          entity_type: "cif",
          entity_id: cifId,
          meeting_id: meetingId,
          company_name: prospect?.company_name || "Unknown Company",
          contact_name: prospect?.contact_name,
          client_email: clientEmail,
          message: `New feasibility call booked for ${prospect?.company_name || "a prospect"}`
        }
      });
    } catch (error) {
      console.error("Error creating booking notification:", error);
    }
  },

  /**
   * Get meetings for a user (feasibility or BDM)
   */
  async getUserMeetings(userId: string): Promise<MeetingWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("feasibility_meetings")
        .select(`
          *,
          cif:cif_records!feasibility_meetings_cif_case_id_fkey(id, prospect_id),
          prospect:prospects!cif_records_prospect_id_fkey(company_name, contact_name, contact_email),
          bdm_profile:profiles!feasibility_meetings_bdm_user_id_fkey(full_name, email),
          feasibility_profile:profiles!feasibility_meetings_feasibility_user_id_fkey(full_name, email)
        `)
        .or(`feasibility_user_id.eq.${userId},bdm_user_id.eq.${userId}`)
        .order("meeting_date", { ascending: false });

      if (error) throw error;

      return (data || []).map(meeting => ({
        ...meeting,
        cif: Array.isArray(meeting.cif) ? meeting.cif[0] : meeting.cif,
        prospect: Array.isArray(meeting.prospect) ? meeting.prospect[0] : meeting.prospect,
        bdm_profile: Array.isArray(meeting.bdm_profile) ? meeting.bdm_profile[0] : meeting.bdm_profile,
        feasibility_profile: Array.isArray(meeting.feasibility_profile) ? meeting.feasibility_profile[0] : meeting.feasibility_profile
      })) as MeetingWithDetails[];
    } catch (error) {
      console.error("Error fetching user meetings:", error);
      throw error;
    }
  },

  /**
   * Update meeting outcome
   */
  async updateMeetingOutcome(
    meetingId: string,
    status: "booked" | "completed" | "no_show" | "cancelled",
    outcome?: "go" | "no_rd" | "undecided",
    outcomeNotes?: string,
    userId?: string
  ): Promise<FeasibilityMeeting | null> {
    try {
      // Get meeting details
      const { data: meeting, error: fetchError } = await supabase
        .from("feasibility_meetings")
        .select("*")
        .eq("id", meetingId)
        .single();

      if (fetchError || !meeting) throw fetchError || new Error("Meeting not found");

      // Update meeting
      const { data, error } = await supabase
        .from("feasibility_meetings")
        .update({
          meeting_status: status,
          outcome: outcome,
          outcome_notes: outcomeNotes
        })
        .eq("id", meetingId)
        .select()
        .single();

      if (error) throw error;

      // Handle archival if outcome is no_rd
      if (status === "completed" && outcome === "no_rd") {
        await supabase
          .from("cif_records")
          .update({
            current_stage: "feasibility_complete_no_rd_archived",
            archived: true,
            archived_reason: "No qualifying R&D identified at feasibility stage.",
            archived_by_user_id: userId || meeting.feasibility_user_id,
            archived_at: new Date().toISOString()
          })
          .eq("id", meeting.cif_case_id);
      } else if (status === "completed" && outcome === "go") {
        await supabase
          .from("cif_records")
          .update({
            current_stage: "feasibility_complete_go"
          })
          .eq("id", meeting.cif_case_id);
      }

      return data;
    } catch (error) {
      console.error("Error updating meeting outcome:", error);
      throw error;
    }
  },

  /**
   * Get meeting by CIF ID
   */
  async getMeetingByCIF(cifId: string): Promise<MeetingWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from("feasibility_meetings")
        .select(`
          *,
          bdm_profile:profiles!feasibility_meetings_bdm_user_id_fkey(full_name, email),
          feasibility_profile:profiles!feasibility_meetings_feasibility_user_id_fkey(full_name, email)
        `)
        .eq("cif_case_id", cifId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return {
        ...data,
        bdm_profile: Array.isArray(data.bdm_profile) ? data.bdm_profile[0] : data.bdm_profile,
        feasibility_profile: Array.isArray(data.feasibility_profile) ? data.feasibility_profile[0] : data.feasibility_profile
      } as MeetingWithDetails;
    } catch (error) {
      console.error("Error fetching meeting by CIF:", error);
      return null;
    }
  },

  /**
   * Get feasibility users (users with feasibility role or technical internal_role)
   */
  async getFeasibilityUsers(): Promise<Array<{ id: string; full_name: string | null; email: string | null }>> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or("role.in.(feasibility,admin,hybrid),internal_role.in.(technical,admin)")
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching feasibility users:", error);
      return [];
    }
  }
};