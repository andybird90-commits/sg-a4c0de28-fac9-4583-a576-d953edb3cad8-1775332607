import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { feasibilityBookingService, AvailabilitySlot } from "@/services/feasibilityBookingService";
import { Calendar as CalendarIcon, Plus, Trash2, Clock, Loader2 } from "lucide-react";
import { format, addDays, setHours, setMinutes } from "date-fns";

export default function AvailabilityPage() {
  const router = useRouter();
  const { profileWithOrg: profile, isStaff } = useApp();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  
  // Form state for creating new slots
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotLength, setSlotLength] = useState(30);

  useEffect(() => {
    if (!isStaff || !profile?.id) {
      router.push("/home");
      return;
    }

    const isFeasibilityUser = profile.internal_role === "feasibility" || 
                              profile.internal_role === "admin" || 
                              profile.internal_role === "hybrid";
    
    if (!isFeasibilityUser) {
      toast({
        title: "Access Denied",
        description: "Only feasibility consultants can manage availability",
        variant: "destructive"
      });
      router.push("/staff");
      return;
    }

    loadAvailability();
  }, [isStaff, profile?.id]);

  const loadAvailability = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const data = await feasibilityBookingService.getUserAvailability(profile.id);
      setSlots(data);
    } catch (error) {
      console.error("Error loading availability:", error);
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlots = async () => {
    if (!profile?.id || !selectedDate) return;

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const start = setMinutes(setHours(selectedDate, startHour), startMinute);
    const end = setMinutes(setHours(selectedDate, endHour), endMinute);

    if (start >= end) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      await feasibilityBookingService.createAvailabilitySlots(
        profile.id,
        start,
        end,
        slotLength
      );

      toast({
        title: "Success",
        description: `Created availability slots for ${format(selectedDate, "d MMM yyyy")}`
      });

      loadAvailability();
    } catch (error) {
      console.error("Error creating slots:", error);
      toast({
        title: "Error",
        description: "Failed to create availability slots",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    setSaving(true);
    try {
      const success = await feasibilityBookingService.deleteAvailabilitySlot(slotId);
      
      if (success) {
        toast({
          title: "Success",
          description: "Availability slot deleted"
        });
        loadAvailability();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete slot",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting slot:", error);
      toast({
        title: "Error",
        description: "Failed to delete slot",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const date = format(new Date(slot.start_time), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  if (!isStaff || loading) {
    return (
      <StaffLayout>
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Availability</h1>
            <p className="text-muted-foreground">Manage your feasibility call availability</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Availability
              </CardTitle>
              <CardDescription>Create new time slots for feasibility calls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot-length">Slot Length (minutes)</Label>
                <Input
                  id="slot-length"
                  type="number"
                  min="15"
                  step="15"
                  value={slotLength}
                  onChange={(e) => setSlotLength(parseInt(e.target.value) || 30)}
                />
              </div>

              <Button 
                onClick={handleCreateSlots} 
                disabled={!selectedDate || saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Slots
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Current Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Your Availability
              </CardTitle>
              <CardDescription>Manage your existing time slots</CardDescription>
            </CardHeader>
            <CardContent>
              {slots.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg border-slate-700 bg-slate-900/60">
                  <Clock className="h-10 w-10 mx-auto mb-2 text-slate-500" />
                  <p className="text-slate-300">No availability slots created yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {Object.keys(slotsByDate)
                    .sort()
                    .map((date) => (
                      <div key={date} className="space-y-2">
                        <h3 className="sticky top-0 py-2 text-sm font-semibold bg-slate-950/80 text-slate-100">
                          {format(new Date(date), "EEEE, d MMMM yyyy")}
                        </h3>
                        <div className="space-y-2">
                          {slotsByDate[date]
                            .sort(
                              (a, b) =>
                                new Date(a.start_time).getTime() -
                                new Date(b.start_time).getTime()
                            )
                            .map((slot) => (
                              <div
                                key={slot.id}
                                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                                  slot.is_booked
                                    ? "bg-emerald-500/15 border-emerald-400/70"
                                    : "bg-slate-950/70 border-slate-700/80 hover:border-primary/70 hover:bg-slate-900/80"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Clock className="h-4 w-4 text-slate-300" />
                                  <div>
                                    <div className="font-medium text-slate-100">
                                      {format(new Date(slot.start_time), "h:mm a")} -{" "}
                                      {format(new Date(slot.end_time), "h:mm a")}
                                    </div>
                                    {slot.is_booked && (
                                      <div className="mt-1 text-xs text-emerald-300">
                                        Booked
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {!slot.is_booked && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    disabled={saving}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
      </div>
    </StaffLayout>
  );
}