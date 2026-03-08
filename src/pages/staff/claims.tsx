import React, { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Clock, 
  AlertCircle,
  Building2,
  Calendar,
  ChevronRight,
  PoundSterling,
  Trash2
} from "lucide-react";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { claimService, ClaimWithDetails } from "@/services/claimService";
import { MessageWidget } from "@/components/MessageWidget";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ClaimsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [deletedClaims, setDeletedClaims] = useState<ClaimWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [activeClaims, deletedClaims] = await Promise.all([
          claimService.getAllClaims(),
          claimService.getDeletedClaims(),
        ]);
        setClaims(activeClaims);
        setDeletedClaims(deletedClaims);
      } catch (err) {
        console.error("[StaffClaims] Failed to load claims", err);
        toast({
          title: "Error loading claims",
          description: "We could not load the claims list. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [toast]);

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      claim.organisations?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.status?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDeleteClaim = async (claimId: string) => {
    try {
      setDeletingId(claimId);
      await claimService.deleteClaim(claimId);
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
      toast({
        title: "Claim deleted",
        description: "The claim has been permanently removed.",
      });
    } catch (error) {
      console.error("Error deleting claim:", error);
      toast({
        title: "Error",
        description: "Failed to delete claim.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'intake':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Intake</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">In Progress</Badge>;
      case 'review':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Review</Badge>;
      case 'submitted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Submitted</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <StaffLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-100">
              Claims
            </h2>
            <p className="text-slate-300">
              Manage R&D tax claims, track progress, and coordinate delivery.
            </p>
          </div>
          <Button onClick={() => router.push("/staff/claims/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Claim
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/70 border border-slate-800">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button 
                  variant={statusFilter === "intake" ? "default" : "outline"}
                  onClick={() => setStatusFilter("intake")}
                >
                  Intake
                </Button>
                <Button 
                  variant={statusFilter === "in_progress" ? "default" : "outline"}
                  onClick={() => setStatusFilter("in_progress")}
                >
                  In Progress
                </Button>
                <Button 
                  variant={statusFilter === "review" ? "default" : "outline"}
                  onClick={() => setStatusFilter("review")}
                >
                  Review
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claims List */}
        <Card className="bg-slate-900/80 border border-slate-800 shadow-professional-md">
          <CardHeader>
            <CardTitle className="text-slate-100">Active Claims</CardTitle>
            <CardDescription className="text-slate-300">
              {filteredClaims.length} claims found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading claims...</div>
            ) : filteredClaims.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No claims found matching your criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100">
                      Client
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100">
                      Year
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100">
                      Projects
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100">
                      Documents
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100">
                      Total Cost
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100">
                      Team
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => (
                    <TableRow 
                      key={claim.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/staff/claims/${claim.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{claim.organisations?.name || "Unknown Client"}</div>
                        <div className="text-xs text-muted-foreground">{claim.organisations?.organisation_code}</div>
                      </TableCell>
                      <TableCell>{claim.claim_year}</TableCell>
                      <TableCell>{getStatusBadge(claim.status || "draft")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{claim.projects?.length || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          <span>{claim.document_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          {formatCurrency(claim.total_costs || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex -space-x-2">
                          {claim.bd_owner && (
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-background text-xs" title={`BD: ${claim.bd_owner.full_name}`}>
                              {claim.bd_owner.full_name?.charAt(0)}
                            </div>
                          )}
                          {claim.technical_lead && (
                            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center border-2 border-background text-xs" title={`Tech: ${claim.technical_lead.full_name}`}>
                              {claim.technical_lead.full_name?.charAt(0)}
                            </div>
                          )}
                          {claim.cost_lead && (
                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center border-2 border-background text-xs" title={`Cost: ${claim.cost_lead.full_name}`}>
                              {claim.cost_lead.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => e.stopPropagation()}
                                disabled={deletingId === claim.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete claim?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this claim and its associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    await handleDeleteClaim(claim.id);
                                  }}
                                  disabled={deletingId === claim.id}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <MessageWidget
                            entityType="claim"
                            entityId={claim.id}
                            entityName={`${claim.organisations?.name || "Claim"} - FY ${claim.claim_year}`}
                          />
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-100">Trashed Claims</h2>
          <p className="text-sm text-slate-300">
            Claims in the trash are kept for 28 days and then permanently deleted.
          </p>
          {deletedClaims.length === 0 ? (
            <p className="text-sm text-slate-300">
              No claims are currently in the trash.
            </p>
          ) : (
            <div className="space-y-3">
              {deletedClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="rounded-lg border bg-muted/40 p-4 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {claim.organisations?.name || "Unknown organisation"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Claim year {claim.claim_year} • Status {claim.status}
                      </div>
                    </div>
                    <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                      In trash
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Moved to trash{" "}
                    {claim.deleted_at
                      ? new Date(claim.deleted_at).toLocaleDateString()
                      : "recently"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </StaffLayout>
  );
}