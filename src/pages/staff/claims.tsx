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
  PoundSterling
} from "lucide-react";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { claimService, ClaimWithDetails } from "@/services/claimService";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const data = await claimService.getAllClaims();
      setClaims(data);
    } catch (error) {
      console.error("Error loading claims:", error);
      toast({
        title: "Error",
        description: "Failed to load claims",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      claim.organisations?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.status?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Claims</h2>
            <p className="text-muted-foreground">
              Manage R&D tax claims, track progress, and coordinate delivery.
            </p>
          </div>
          <Button onClick={() => router.push("/staff/claims/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Claim
          </Button>
        </div>

        {/* Filters */}
        <Card>
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
        <Card>
          <CardHeader>
            <CardTitle>Active Claims</CardTitle>
            <CardDescription>
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
                    <TableHead>Client</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
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