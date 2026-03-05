import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, PoundSterling } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { claimService, ClaimWithDetails } from "@/services/claimService";
import { format } from "date-fns";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function SubmittedClaimsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true);
        const all = await claimService.getAllClaims();
        const submittedStatuses = new Set([
          "submitted_hmrc",
          "hmrc_feedback",
          "completed",
        ]);
        const filtered = all.filter((c) =>
          submittedStatuses.has((c.status || "").toString())
        );
        setClaims(filtered);
      } catch (error) {
        console.error("[SubmittedClaims] Failed to load claims", error);
        toast({
          title: "Error loading submitted claims",
          description: "We could not load the submitted claims list. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [toast]);

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-100">
            Submitted Claims
          </h2>
          <p className="text-slate-300">
            Track claims issued to HMRC, manage feedback, and monitor outcomes.
          </p>
        </div>

        <Card className="bg-slate-900/80 border border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">HMRC Submitted Claims</CardTitle>
            <CardDescription className="text-slate-300">
              {claims.length} claim{claims.length === 1 ? "" : "s"} submitted to HMRC or awaiting feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-slate-300">Loading submitted claims...</div>
            ) : claims.length === 0 ? (
              <div className="py-8 text-center text-slate-300">
                No claims have been submitted to HMRC yet.
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
                      Submitted
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100">
                      Submitted Value
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100">
                      Received Value
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-slate-100 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow
                      key={claim.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => router.push(`/staff/claims/${claim.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {claim.organisations?.name || "Unknown Client"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {claim.organisations?.organisation_code}
                        </div>
                      </TableCell>
                      <TableCell>{claim.claim_year}</TableCell>
                      <TableCell>
                        {claim.status === "submitted_hmrc" && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Submitted to HMRC
                          </Badge>
                        )}
                        {claim.status === "hmrc_feedback" && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            HMRC feedback
                          </Badge>
                        )}
                        {claim.status === "completed" && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                            Completed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {claim.actual_submission_date
                          ? format(new Date(claim.actual_submission_date), "dd/MM/yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PoundSterling className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {formatCurrency(
                              claim.submitted_claim_value ? Number(claim.submitted_claim_value) : 0
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PoundSterling className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {formatCurrency(
                              claim.received_claim_value ? Number(claim.received_claim_value) : 0
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/staff/claims/${claim.id}`);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}