import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Trash2, Plus } from "lucide-react";
import {
  fetchUserAvailability,
  setWeeklyAvailability,
  deleteAvailabilitySlots,
  getWeekdayDates,
} from "@/services/availabilityService";

export default function MyAvailability() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  
  // Weekly pattern selection
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [weeksAhead, setWeeksAhead] = useState(4);

  const weekdayLabels = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (!profile?.internal_role) {
      router.push("/home");
      return;
    }

    // Check if user has feasibility role
    const canManageAvailability =
      profile.role === "feasibility" ||
      profile.role === "admin" ||
      profile.role === "hybrid" ||
      profile.internal_role === "technical" ||
      profile.internal_role === "admin";

    if (!canManageAvailability) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage availability.",
        variant: "destructive",
      });
      router.push("/staff");
      return;
    }

    setCurrentUser(profile);
    loadAvailability(session.user.id);
  };

  const loadAvailability = async (userId: string) => {
    try {
      const slots = await fetchUserAvailability(userId);
      setAvailabilitySlots(slots);
    } catch (error) {
      console.error("Error loading availability:", error);
      toast({
        title: "Error",
        description: "Failed to load availability slots.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSlots = async () => {
    if (selectedDays.length === 0) {
      toast({
        title: "No Days Selected",
        description: "Please select at least one weekday.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await setWeeklyAvailability(
        currentUser.id,
        selectedDays,
        10, // Start at 10 AM
        16, // End at 4 PM
        weeksAhead
      );

      toast({
        title: "Success",
        description: `Generated availability slots for the next ${weeksAhead} weeks.`,
      });

      // Reload availability
      loadAvailability(currentUser.id);
    } catch (error: any) {
      console.error("Error generating slots:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate availability slots.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllSlots = async () => {
    if (!window.confirm("Are you sure you want to delete all your availability slots? This cannot be undone.")) {
      return;
    }

    setSaving(true);
    try {
      const slotIds = availabilitySlots.map((slot) => slot.id);
      await deleteAvailabilitySlots(slotIds);

      toast({
        title: "Success",
        description: "All availability slots have been deleted.",
      });

      setAvailabilitySlots([]);
    } catch (error: any) {
      console.error("Error clearing slots:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete availability slots.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // Group slots by date for display
  const groupedSlots = availabilitySlots.reduce((acc: any, slot) => {
    const date = new Date(slot.start_time).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </StaffLayout>
    );
  }

  return (
    <>
      <Head>
        <title>My Availability - RD Sidekick</title>
      </Head>
      <StaffLayout>
        <div className="container mx-auto py-8 px-4 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Availability</h1>
            <p className="text-muted-foreground">
              Manage your availability for feasibility call bookings
            </p>
          </div>

          {/* Weekly Pattern Generator */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Generate Availability Slots
              </CardTitle>
              <CardDescription>
                Create 30-minute slots for selected weekdays from 10:00 AM to 4:00 PM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">Select Weekdays</Label>
                <div className="flex flex-wrap gap-4">
                  {weekdayLabels.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={selectedDays.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <Label
                        htmlFor={`day-${day.value}`}
                        className="cursor-pointer font-normal"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="weeks-ahead" className="mb-2 block">
                  Number of Weeks
                </Label>
                <select
                  id="weeks-ahead"
                  value={weeksAhead}
                  onChange={(e) => setWeeksAhead(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value={2}>2 weeks</option>
                  <option value={4}>4 weeks</option>
                  <option value={6}>6 weeks</option>
                  <option value={8}>8 weeks</option>
                </select>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerateSlots}
                  disabled={saving || selectedDays.length === 0}
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Slots
                </Button>
                {availabilitySlots.length > 0 && (
                  <Button
                    onClick={handleClearAllSlots}
                    disabled={saving}
                    variant="destructive"
                    size="lg"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Slots
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Availability Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Current Availability ({availabilitySlots.length} slots)
              </CardTitle>
              <CardDescription>
                Booked slots are shown in a different style
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availabilitySlots.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No availability slots created yet.</p>
                  <p className="text-sm mt-2">
                    Use the form above to generate your weekly availability.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedSlots).map(([date, slots]: [string, any]) => (
                    <div key={date}>
                      <h3 className="font-semibold mb-3 text-lg">{date}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {slots.map((slot: any) => (
                          <div
                            key={slot.id}
                            className={`px-3 py-2 rounded-md text-sm ${
                              slot.is_booked
                                ? "bg-green-100 border border-green-300 text-green-900"
                                : "bg-muted border border-border"
                            }`}
                          >
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(slot.start_time).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {slot.is_booked && (
                              <span className="ml-2 text-xs font-medium">(Booked)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StaffLayout>
    </>
  );
}