import React, { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Plus,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Download,
  Loader2
} from "lucide-react";
import { organisationService, type Organisation } from "@/services/organisationService";
import {
  organisationNotificationStatusService,
  type OrganisationNotificationStatus
} from "@/services/organisationNotificationStatusService";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type StatusWithOrg = OrganisationNotificationStatus & {
  organisation?: {
    id: string;
    name: string | null;
    organisation_code?: string | null;
    sidekick_enabled?: boolean | null;
    created_at?: string;
  } | null;
};

export default function StaffPreNotificationsPage() {
  const { isStaff } = useApp();
  const router = useRouter();
  const { toast } = useToast();

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [statuses, setStatuses] = useState<StatusWithOrg[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formOrgId, setFormOrgId] = useState<string>("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formUtr, setFormUtr] = useState("");
  const [formPeriodStart, setFormPeriodStart] = useState("");
  const [formPeriodEnd, setFormPeriodEnd] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formContactRole, setFormContactRole] = useState("");
  const [formAgentName, setFormAgentName] = useState("RD Companion");
  const [formSummary, setFormSummary] = useState("");

  useEffect(() => {
    if (!isStaff) {
      router.replace("/home");
      return;
    }

    const load = async () => {
      try {
        setLoadingOrgs(true);
        setLoadingStatuses(true);
        const [orgs, statusRows] = await Promise.all([
          organisationService.getAllOrganisations(),
          organisationNotificationStatusService.getAllStatusesWithOrg()
        ]);
        setOrganisations(orgs);
        setStatuses(statusRows);
      } catch (error: any) {
        console.error("Failed to load pre-notification data", error);
        toast({
          title: "Load failed",
          description: error?.message || "Could not load pre-notifications.",
          variant: "destructive"
        });
      } finally {
        setLoadingOrgs(false);
        setLoadingStatuses(false);
      }
    };

    load();
  }, [isStaff, router, toast]);

  const resetForm = () => {
    setFormOrgId("");
    setFormCompanyName("");
    setFormUtr("");
    setFormPeriodStart("");
    setFormPeriodEnd("");
    setFormContactName("");
    setFormContactRole("");
    setFormAgentName("RD Companion");
    setFormSummary("");
  };

  const handleCreate = async () => {
    if (!formOrgId || !formCompanyName || !formPeriodStart || !formPeriodEnd || !formContactName) {
      toast({
        title: "Missing fields",
        description: "Organisation, company name, accounting period, and contact name are required.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const created = await organisationNotificationStatusService.createPreNotification({
        organisation_id: formOrgId,
        accounting_period_start: formPeriodStart,
        accounting_period_end: formPeriodEnd,
        has_claimed_before: null,
        claimed_within_last_3_years: null,
        notification_required: true,
        status: "required",
        internal_rd_contact_name: formContactName,
        internal_rd_contact_email: null,
        organisation_rd_summary: formSummary || null,
        notes: `Company: ${formCompanyName}\nUTR: ${formUtr || "N/A"}\nContact role: ${
          formContactRole || "N/A"
        }\nAgent: ${formAgentName || "RD Companion"}`
      });

      toast({
        title: "Pre-notification created",
        description: "A new pre-notification record has been created."
      });

      // Trigger PDF export in a new tab
      if (created?.id) {
        window.open(`/api/pre-notifications/${created.id}/pdf`, "_blank");
      }

      const refreshed = await organisationNotificationStatusService.getAllStatusesWithOrg();
      setStatuses(refreshed);
      resetForm();
      setCreateOpen(false);
    } catch (error: any) {
      console.error("Failed to create pre-notification", error);
      toast({
        title: "Create failed",
        description: error?.message || "Could not create pre-notification.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkCompleted = async (id: string) => {
    setSubmitting(true);
    try {
      await organisationNotificationStatusService.markSubmitted(id);
      toast({
        title: "Marked as completed",
        description: "Pre-notification marked as completed."
      });
      const refreshed = await organisationNotificationStatusService.getAllStatusesWithOrg();
      setStatuses(refreshed);
    } catch (error: any) {
      console.error("Failed to mark pre-notification as completed", error);
      toast({
        title: "Update failed",
        description: error?.message || "Could not update pre-notification.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
      setConfirmId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      await organisationNotificationStatusService.deleteStatus(id);
      toast({
        title: "Deleted",
        description: "Pre-notification record deleted."
      });
      const refreshed = await organisationNotificationStatusService.getAllStatusesWithOrg();
      setStatuses(refreshed);
    } catch (error: any) {
      console.error("Failed to delete pre-notification", error);
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete pre-notification.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
      setDeleteId(null);
    }
  };

  if (!isStaff) {
    return null;
  }

  const outstanding = statuses.filter((s) =>
    s.status === "required" || s.status === "overdue" || s.status === "unclear"
  );
  const completed = statuses.filter((s) =>
    s.status === "submitted" || s.status === "not_required"
  );

  const renderRow = (row: StatusWithOrg, isOutstanding: boolean) => {
    const orgName = row.organisation?.name || "Unknown org";
    const companyLabel = orgName;
    const statusLabel =
      row.status === "required"
        ? "Required"
        : row.status === "overdue"
        ? "Overdue"
        : row.status === "submitted"
        ? "Submitted"
        : row.status === "not_required"
        ? "Not required"
        : "Unclear";

    return (
      <TableRow key={row.id}>
        <TableCell className="font-medium">{companyLabel}</TableCell>
        <TableCell>
          {row.accounting_period_start && row.accounting_period_end ? (
            <>
              {new Date(row.accounting_period_start).toLocaleDateString("en-GB")} –{" "}
              {new Date(row.accounting_period_end).toLocaleDateString("en-GB")}
            </>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell>{row.internal_rd_contact_name || "—"}</TableCell>
        <TableCell>
          <Badge
            variant={
              row.status === "required" || row.status === "overdue"
                ? "destructive"
                : row.status === "submitted"
                ? "default"
                : "outline"
            }
          >
            {statusLabel}
          </Badge>
        </TableCell>
        <TableCell className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Download PDF"
            onClick={() => window.open(`/api/pre-notifications/${row.id}/pdf`, "_blank")}
          >
            <Download className="h-4 w-4" />
          </Button>
          {isOutstanding ? (
            <Button
              variant="default"
              size="sm"
              className="h-8"
              onClick={() => setConfirmId(row.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark completed
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500"
            onClick={() => setDeleteId(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <StaffLayout title="Pre-notifications">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">HMRC Pre-notifications</h1>
            <p className="text-muted-foreground mt-1">
              Track organisations that must pre-notify HMRC before an R&amp;D claim can be filed.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create pre-notification
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-400" />
              Pre-notification workflow
            </CardTitle>
            <CardDescription>
              Use this page to generate a pre-notification PDF, record that it has been completed,
              and keep a clear audit trail separate from onboarding and claims.
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="outstanding" className="w-full">
          <TabsList>
            <TabsTrigger value="outstanding">
              Outstanding
              {outstanding.length > 0 && (
                <Badge className="ml-2 h-5 px-2 rounded-full">{outstanding.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              {completed.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-2 rounded-full">
                  {completed.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outstanding" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Outstanding pre-notifications</CardTitle>
                <CardDescription>
                  Organisations that still need to pre-notify HMRC before a claim can be submitted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStatuses ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading…
                  </div>
                ) : outstanding.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <AlertTriangle className="h-10 w-10 mb-3 text-slate-500" />
                    <p>No outstanding pre-notifications.</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Organisation</TableHead>
                          <TableHead>Accounting period</TableHead>
                          <TableHead>Internal R&amp;D contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{outstanding.map((row) => renderRow(row, true))}</TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Completed pre-notifications</CardTitle>
                <CardDescription>
                  Records where the client has confirmed pre-notification has been completed or is
                  not required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStatuses ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading…
                  </div>
                ) : completed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <AlertTriangle className="h-10 w-10 mb-3 text-slate-500" />
                    <p>No completed pre-notifications yet.</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Organisation</TableHead>
                          <TableHead>Accounting period</TableHead>
                          <TableHead>Internal R&amp;D contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{completed.map((row) => renderRow(row, false))}</TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !submitting && setCreateOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create pre-notification</DialogTitle>
            <DialogDescription>
              Capture the key details needed to generate the HMRC pre-notification PDF and track its
              status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Organisation <span className="text-red-500">*</span>
              </label>
              <Select
                value={formOrgId}
                onValueChange={(value) => {
                  setFormOrgId(value);
                  const org = organisations.find((o) => o.id === value);
                  if (org && !formCompanyName) {
                    setFormCompanyName(org.name);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingOrgs ? "Loading…" : "Select organisation"} />
                </SelectTrigger>
                <SelectContent>
                  {organisations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Company name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formCompanyName}
                  onChange={(e) => setFormCompanyName(e.target.value)}
                  placeholder="XYZ Ltd"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">UTR</label>
                <Input
                  value={formUtr}
                  onChange={(e) => setFormUtr(e.target.value)}
                  placeholder="1234567890"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Accounting period start <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formPeriodStart}
                  onChange={(e) => setFormPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Accounting period end <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formPeriodEnd}
                  onChange={(e) => setFormPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Contact name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formContactName}
                  onChange={(e) => setFormContactName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact role</label>
                <Input
                  value={formContactRole}
                  onChange={(e) => setFormContactRole(e.target.value)}
                  placeholder="Head of Engineering"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Agent</label>
              <Input
                value={formAgentName}
                onChange={(e) => setFormAgentName(e.target.value)}
                placeholder="RD Advisory Ltd"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Summary of R&amp;D activities</label>
              <Textarea
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                className="min-h-[120px]"
                placeholder="During the accounting period the company undertook research and development activities relating to..."
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center gap-2">
            <p className="text-xs text-muted-foreground">
              After saving, a PDF will open in a new tab which you can download or send to the
              client/agent.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!submitting) {
                    setCreateOpen(false);
                    resetForm();
                  }
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create &amp; export PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm complete dialog */}
      <Dialog open={!!confirmId} onOpenChange={(open) => !submitting && !open && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark pre-notification as completed?</DialogTitle>
            <DialogDescription>
              Confirm only after the client has confirmed that pre-notification has been submitted
              to HMRC. This will move the record to the Completed tab and remove PRE warnings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmId(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmId && handleMarkCompleted(confirmId)}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, mark completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !submitting && !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete pre-notification record?</DialogTitle>
            <DialogDescription>
              This will permanently delete the pre-notification tracking record. It does not affect
              any existing claims.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}