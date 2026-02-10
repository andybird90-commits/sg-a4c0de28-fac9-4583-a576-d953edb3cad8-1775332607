import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AvailabilitySlot = Database["public"]["Tables"]["feasibility_availability"]["Row"];
type AvailabilityInsert = Database["public"]["Tables"]["feasibility_availability"]["Insert"];

/**
 * Generate 30-minute slots for a given date range and time range
 */
export function generateTimeSlots(
  dates: Date[],
  startHour: number = 10,
  endHour: number = 16
): { start: Date; end: Date }[] {
  const slots: { start: Date; end: Date }[] = [];

  dates.forEach((date) => {
    for (let hour = startHour; hour < endHour; hour++) {
      // Two 30-minute slots per hour
      const slot1Start = new Date(date);
      slot1Start.setHours(hour, 0, 0, 0);
      const slot1End = new Date(date);
      slot1End.setHours(hour, 30, 0, 0);

      const slot2Start = new Date(date);
      slot2Start.setHours(hour, 30, 0, 0);
      const slot2End = new Date(date);
      slot2End.setHours(hour + 1, 0, 0, 0);

      slots.push({ start: slot1Start, end: slot1End });
      slots.push({ start: slot2Start, end: slot2End });
    }
  });

  return slots;
}

/**
 * Get weekday dates for the next N weeks (Monday-Friday only)
 */
export function getWeekdayDates(weeksAhead: number = 4): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + weeksAhead * 7);

  const current = new Date(today);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // 1-5 = Monday-Friday
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Fetch all availability slots for a user
 */
export async function fetchUserAvailability(userId: string) {
  const { data, error } = await supabase
    .from("feasibility_availability")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching availability:", error);
    throw error;
  }

  return data as AvailabilitySlot[];
}

/**
 * Fetch available (unbooked) slots for booking flow
 */
export async function fetchAvailableSlots(feasibilityUserId?: string) {
  let query = supabase
    .from("feasibility_availability")
    .select(`
      *,
      profiles!feasibility_availability_user_id_fkey(id, full_name, email)
    `)
    .eq("is_booked", false)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  if (feasibilityUserId) {
    query = query.eq("user_id", feasibilityUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching available slots:", error);
    throw error;
  }

  return data;
}

/**
 * Create multiple availability slots at once
 */
export async function createAvailabilitySlots(slots: AvailabilityInsert[]) {
  const { data, error } = await supabase
    .from("feasibility_availability")
    .insert(slots)
    .select();

  if (error) {
    console.error("Error creating availability slots:", error);
    throw error;
  }

  return data;
}

/**
 * Delete multiple availability slots
 */
export async function deleteAvailabilitySlots(slotIds: string[]) {
  const { error } = await supabase
    .from("feasibility_availability")
    .delete()
    .in("id", slotIds);

  if (error) {
    console.error("Error deleting availability slots:", error);
    throw error;
  }
}

/**
 * Toggle a single slot's availability (useful for individual slot management)
 */
export async function toggleSlotAvailability(slotId: string, isBooked: boolean) {
  const { data, error } = await supabase
    .from("feasibility_availability")
    .update({ is_booked: isBooked, updated_at: new Date().toISOString() })
    .eq("id", slotId)
    .select()
    .single();

  if (error) {
    console.error("Error toggling slot availability:", error);
    throw error;
  }

  return data;
}

/**
 * Bulk update user availability for a week
 * Useful for setting weekly recurring patterns
 */
export async function setWeeklyAvailability(
  userId: string,
  weekdays: number[], // 1=Mon, 2=Tue, ..., 5=Fri
  startHour: number = 10,
  endHour: number = 16,
  weeksAhead: number = 4
) {
  // Get all weekday dates for the next N weeks
  const allDates = getWeekdayDates(weeksAhead);
  
  // Filter to only selected weekdays
  const selectedDates = allDates.filter((date) =>
    weekdays.includes(date.getDay())
  );

  // Generate slots
  const timeSlots = generateTimeSlots(selectedDates, startHour, endHour);

  // Convert to insert format
  const slotsToInsert: AvailabilityInsert[] = timeSlots.map((slot) => ({
    user_id: userId,
    start_time: slot.start.toISOString(),
    end_time: slot.end.toISOString(),
    slot_length_minutes: 30,
    is_booked: false,
    slot_type: "feasibility_call",
  }));

  return createAvailabilitySlots(slotsToInsert);
}