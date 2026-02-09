import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { feasibilityBookingService, AvailabilitySlot } from "@/services/feasibilityBookingService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";

interface BookFeasibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  cifId: string;
  clientId: string | null;
  clientEmail: string | null;
  bdmUserId: string;
  onSuccess: () => void;
}

export function BookFeasibilityModal({
  isOpen,
  onClose,
  cifId,
  clientId,
  clientEmail,
  bdmUserId,
  onSuccess
}: BookFeasibilityModalProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [feasibilityUsers, setFeasibilityUsers] = useState<Array<{ id: string; full_name: string | null }>>([]);
  const [filterUserId, setFilterUserId] = useState<string>("all");

  // Load feasibility users and slots
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [users, slots] = await Promise.all([
        feasibilityBookingService.getFeasibilityUsers(),
        feasibilityBookingService.getAvailableSlots(undefined, new Date())
      ]);
      setFeasibilityUsers(users);
      setAvailableSlots(slots);
    } catch (error) {
      console.error("Error loading booking data:", error);
      toast({
        title: "Error",
        description: "Failed to load availability. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter slots based on selection
  const filteredSlots = availableSlots.filter(slot => {
    if (!selectedDate) return false;
    const slotDate = new Date(slot.start_time);
    const matchesDate = isSameDay(slotDate, selectedDate);
    const matchesUser = filterUserId === "all" || slot.user_id === filterUserId;
    return matchesDate && matchesUser;
  });

  const handleBook = async () => {
    if (!selectedSlotId || !clientEmail) return;

    setSubmitting(true);
    try {
      await feasibilityBookingService.bookFeasibilityMeeting(
        cifId,
        clientId,
        bdmUserId,
        selectedSlotId,
        clientEmail
      );

      toast({
        title: "Success",
        description: "Feasibility call booked successfully.",
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error booking meeting:", error);
      toast({
        title: "Error",
        description: "Failed to book meeting. The slot may have been taken.",
        variant: "destructive"
      });
      // Reload slots to show current state
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Feasibility Call</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left Column: Date & Filters */}
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Filter by Feasibility Consultant</Label>
              <Select value={filterUserId} onValueChange={setFilterUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Consultant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Consultant</SelectItem>
                  {feasibilityUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md p-4 bg-white">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border shadow-sm w-full"
              />
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Client Email: <span className="font-medium text-gray-900">{clientEmail || "N/A"}</span></p>
              <p className="text-xs mt-1">Invitation will be sent to this address.</p>
            </div>
          </div>

          {/* Right Column: Time Slots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Available Slots
              </h3>
              {selectedDate && (
                <span className="text-sm text-gray-500">
                  {format(selectedDate, "EEE, d MMM yyyy")}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                <CalendarIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No available slots for this date.</p>
                {filterUserId !== "all" && (
                  <Button 
                    variant="link" 
                    onClick={() => setFilterUserId("all")}
                    className="mt-2"
                  >
                    Try viewing all consultants
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {filteredSlots.map(slot => (
                  <div
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all
                      flex items-center justify-between group
                      ${selectedSlotId === slot.id 
                        ? "border-primary bg-primary/5 ring-1 ring-primary" 
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {format(new Date(slot.start_time), "h:mm a")} - {format(new Date(slot.end_time), "h:mm a")}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {slot.user_profile?.full_name || "Consultant"}
                      </div>
                    </div>
                    {selectedSlotId === slot.id && (
                      <div className="text-primary text-sm font-medium">Selected</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleBook} 
            disabled={!selectedSlotId || submitting || !clientEmail}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}