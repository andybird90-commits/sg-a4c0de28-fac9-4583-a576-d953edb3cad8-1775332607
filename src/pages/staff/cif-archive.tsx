import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Archive, Search, RotateCcw, Eye } from "lucide-react";
import { cifService, type CIFWithDetails } from "@/services/cifService";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function CIFArchivePage() {
  const router = useRouter();
  const { isStaff } = useApp();
  const { toast } = useToast();

  const [archivedCIFs, setArchivedCIFs] = useState<CIFWithDetails[]>([]);
  const [filteredCIFs, setFilteredCIFs] = useState<CIFWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [selectedCIF, setSelectedCIF] = useState<CIFWithDetails | null>(null);
  const [reactivateStage, setReactivateStage] = useState<"bdm_section" | "tech_feasibility" | "financial_section" | "admin_approval">("bdm_section");

  useEffect(() => {
    if (!isStaff) {
      router.push("/home");
      return;
    }
    fetchArchivedCIFs();
  }, [isStaff]);

  useEffect(() => {
    filterCIFs();
  }, [searchQuery, archivedCIFs]);

  const fetchArchivedCIFs = async () => {
    setLoading(true);
    try {
      const data = await cifService.getArchivedCIFs();
      setArchivedCIFs(data);
      setFilteredCIFs(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load archived CIFs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterCIFs = () => {
    if (!searchQuery.trim()) {
      setFilteredCIFs(archivedCIFs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = archivedCIFs.filter(cif => {
      const companyName = cif.prospects?.company_name?.toLowerCase() || "";
      const companyNumber = cif.prospects?.company_number?.toLowerCase() || "";
      const reason = cif.rejection_reason?.toLowerCase() || "";
      
      return companyName.includes(query) || 
             companyNumber.includes(query) ||
             reason.includes(query);
    });
    
    setFilteredCIFs(filtered);
  };

  const handleReactivate = async () => {
    if (!selectedCIF) return;

    try {
      const result = await cifService.reactivateCIF(selectedCIF.id, reactivateStage);
      
      if (result) {
        toast({ 
          title: "Success", 
          description: `CIF reactivated and sent to ${reactivateStage.replace(/_/g, " ")}` 
        });
        setShowReactivateModal(false);
        setSelectedCIF(null);
        fetchArchivedCIFs();
      } else {
        toast({ title: "Error", description: "Failed to reactivate CIF", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reactivate CIF", variant: "destructive" });
    }
  };

  if (!isStaff || loading) {
    return (
      <StaffLayout>
        <div className="text-center py-12">Loading archived CIFs...</div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Archive className="h-8 w-8" />
              CIF Archive
            </h1>
            <p className="text-muted-foreground mt-1">
              Archived CIFs that may be reactivated in the future
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/staff/cif")}>
            Back to Pipeline
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Archive</CardTitle>
            <CardDescription>Find archived CIFs by company name, number, or rejection reason</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search archived CIFs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Archived CIFs ({filteredCIFs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCIFs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? "No archived CIFs match your search" : "No archived CIFs"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Company Number</TableHead>
                    <TableHead>Archived Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCIFs.map((cif) => (
                    <TableRow key={cif.id}>
                      <TableCell className="font-medium">
                        {cif.prospects?.company_name || "Unknown"}
                      </TableCell>
                      <TableCell>{cif.prospects?.company_number || "N/A"}</TableCell>
                      <TableCell>
                        {cif.rejected_at 
                          ? new Date(cif.rejected_at).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {cif.rejection_reason || "No reason provided"}
                      </TableCell>
                      <TableCell>
                        {cif.created_by_profile?.full_name || cif.created_by_profile?.email || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/staff/cif/${cif.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCIF(cif);
                              setShowReactivateModal(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reactivate Modal */}
        <AlertDialog open={showReactivateModal} onOpenChange={setShowReactivateModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reactivate CIF</AlertDialogTitle>
              <AlertDialogDescription>
                Choose which stage to send this CIF to after reactivation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 py-4">
              {selectedCIF && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-semibold">{selectedCIF.prospects?.company_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCIF.prospects?.company_number}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Send To Stage</label>
                <Select 
                  value={reactivateStage} 
                  onValueChange={(v: any) => setReactivateStage(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bdm_section">Job Board A (BDM Section)</SelectItem>
                    <SelectItem value="tech_feasibility">Job Board B (Technical Feasibility)</SelectItem>
                    <SelectItem value="financial_section">Job Board C (Financial Section)</SelectItem>
                    <SelectItem value="admin_approval">Admin Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowReactivateModal(false);
                setSelectedCIF(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleReactivate}>
                Reactivate CIF
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </StaffLayout>
  );
}