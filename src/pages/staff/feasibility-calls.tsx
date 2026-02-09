import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { feasibilityBookingService, MeetingWithDetails } from "@/services/feasibilityBookingService";
import { Calendar, Clock, ExternalLink, Copy, CheckCircle, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

export default function FeasibilityCallsPage() {
  const router = useRouter();
  const { profileWithOrg: profile, isStaff } = useApp();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithDetails | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  
  // Outcome form state
  const [outcomeStatus, setOutcomeStatus] = useState<"booked" | "completed" | "no_show" | "cancelled">("completed");
  const [outcome, setOutcome] = useState<"go" | "no_rd" | "undecided">("undecided");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
        description: "Only feasibility consultants can view this page",
        variant: "destructive"
      });
      router.push("/staff");
      return;
    }

    loadMeetings();
  }, [isStaff, profile?.id]);

  const loadMeetings = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const data = await feasibilityBookingService.getUserMeetings(profile.id);
      setMeetings(data);
    } catch (error) {
      console.error("Error loading meetings:", error);
      toast({
        title: "Error",
        description: "Failed to load feasibility calls",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMeetingDetails = (meeting: MeetingWithDetails) => {
    const clientName = meeting.prospect?.contact_name || "Client";
    const companyName = meeting.prospect?.company_name || "Company";
    const bdmName = meeting.bdm_profile?.full_name || "BDM";
    const feasName = meeting.feasibility_profile?.full_name || "Feasibility Consultant";
    
    const details = `
Feasibility Call - ${companyName}

Date: ${format(new Date(meeting.meeting_date), "EEEE, d MMMM yyyy")}
Time: ${format(new Date(meeting.meeting_start_time), "h:mm a")} - ${format(new Date(meeting.meeting_end_time), "h:mm a")}

Attendees:
- ${clientName} (${meeting.client_teams_email})
- ${feasName} (Feasibility Consultant)
- ${bdmName} (Business Development Manager)

Purpose: R&D Tax Credit Feasibility Assessment

This call is to assess the company's R&D activities and determine eligibility for UK R&D tax credits.
    `.trim();

    navigator.clipboard.writeText(details);
    toast({
      title: "Copied",
      description: "Meeting details copied to clipboard"
    });
  };

  const handleOpenOutcomeModal = (meeting: MeetingWithDetails) => {
    setSelectedMeeting(meeting);
    setOutcomeStatus(meeting.meeting_status || "completed");
    setOutcome(meeting.outcome || "undecided");
    setOutcomeNotes(meeting.outcome_notes || "");
    setShowOutcomeModal(true);
  };

  const handleSaveOutcome = async () => {
    if (!selectedMeeting || !profile?.id) return;

    setSaving(true);
    try {
      await feasibilityBookingService.updateMeetingOutcome(
        selectedMeeting.id,
        outcomeStatus,
        outcome,
        outcomeNotes,
        profile.id
      );

      toast({
        title: "Success",
        description: outcome === "no_rd" 
          ? "Meeting outcome saved and CIF archived" 
          : "Meeting outcome saved successfully"
      });

      setShowOutcomeModal(false);
      loadMeetings();
    } catch (error) {
      console.error("Error saving outcome:", error);
      toast({
        title: "Error",
        description: "Failed to save outcome",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const upcomingMeetings = meetings.filter(m => 
    new Date(m.meeting_date) >= new Date(new Date().setHours(0, 0, 0, 0)) &&
    m.meeting_status === "booked"
  );

  const pastMeetings = meetings.filter(m => 
    new Date(m.meeting_date) < new Date(new Date().setHours(0, 0, 0, 0)) ||
    m.meeting_status !== "booked"
  );

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
            <h1 className="text-3xl font-bold">My Feasibility Calls</h1>
            <p className="text-muted-foreground">Manage your feasibility assessments</p>
          </div>
          <Button onClick={() => router.push("/staff/availability")} variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Manage Availability
          </Button>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastMeetings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {upcomingMeetings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No upcoming feasibility calls</p>
                </CardContent>
              </Card>
            ) : (
              upcomingMeetings.map((meeting) => (
                <Card key={meeting.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{meeting.prospect?.company_name || "Unknown Company"}</CardTitle>
                        <CardDescription>
                          {meeting.prospect?.contact_name} • {meeting.client_teams_email}
                        </CardDescription>
                      </div>
                      <Badge>{meeting.meeting_status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{format(new Date(meeting.meeting_date), "EEEE, d MMMM yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>
                          {format(new Date(meeting.meeting_start_time), "h:mm a")} - {format(new Date(meeting.meeting_end_time), "h:mm a")}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyMeetingDetails(meeting)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Details
                      </Button>
                      <Link href={`/staff/cif/${meeting.cif_case_id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="mr-2 h-4 w-4" />
                          View CIF
                        </Button>
                      </Link>
                      <Button 
                        size="sm"
                        onClick={() => handleOpenOutcomeModal(meeting)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Log Outcome
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            {pastMeetings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No past feasibility calls</p>
                </CardContent>
              </Card>
            ) : (
              pastMeetings.map((meeting) => (
                <Card key={meeting.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{meeting.prospect?.company_name || "Unknown Company"}</CardTitle>
                        <CardDescription>
                          {format(new Date(meeting.meeting_date), "d MMM yyyy")} • {meeting.prospect?.contact_name}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={meeting.meeting_status === "completed" ? "default" : "secondary"}>
                          {meeting.meeting_status}
                        </Badge>
                        {meeting.outcome && (
                          <Badge variant={
                            meeting.outcome === "go" ? "default" : 
                            meeting.outcome === "no_rd" ? "destructive" : 
                            "secondary"
                          }>
                            {meeting.outcome === "go" ? "Proceed" : meeting.outcome === "no_rd" ? "No R&D" : "Undecided"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {meeting.outcome_notes && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{meeting.outcome_notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link href={`/staff/cif/${meeting.cif_case_id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="mr-2 h-4 w-4" />
                          View CIF
                        </Button>
                      </Link>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenOutcomeModal(meeting)}
                      >
                        Edit Outcome
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Outcome Modal */}
        <Dialog open={showOutcomeModal} onOpenChange={setShowOutcomeModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Log Meeting Outcome</DialogTitle>
              <DialogDescription>
                {selectedMeeting?.prospect?.company_name} • {format(new Date(selectedMeeting?.meeting_date || new Date()), "d MMM yyyy")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Meeting Status</Label>
                <Select value={outcomeStatus} onValueChange={(v) => setOutcomeStatus(v as "booked" | "completed" | "no_show" | "cancelled")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {outcomeStatus === "completed" && (
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Select value={outcome} onValueChange={(v) => setOutcome(v as "go" | "no_rd" | "undecided")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="go">Go - Proceed with Claim</SelectItem>
                      <SelectItem value="no_rd">No R&D - Archive CIF</SelectItem>
                      <SelectItem value="undecided">Undecided - Needs More Info</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {outcome === "no_rd" && (
                    <p className="text-sm text-orange-600 mt-2">
                      ⚠️ Selecting "No R&D" will automatically archive the CIF case
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add notes about the meeting outcome..."
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOutcomeModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveOutcome} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Outcome
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StaffLayout>
  );
}