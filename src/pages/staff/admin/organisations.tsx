import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Check, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Organisation {
  id: string;
  name: string;
  organisation_code: string;
  created_at: string;
}

export default function OrganisationsAdmin() {
  const { toast } = useToast();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [editOrgName, setEditOrgName] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadOrganisations();
  }, []);

  const loadOrganisations = async () => {
    try {
      const { data, error } = await supabase
        .from("organisations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganisations(data || []);
    } catch (error) {
      console.error("Error loading organisations:", error);
      toast({
        title: "Error",
        description: "Failed to load organisations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateOrgCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateOrganisation = async () => {
    if (!newOrgName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an organisation name",
        variant: "destructive"
      });
      return;
    }

    try {
      const orgCode = generateOrgCode();
      
      const { error } = await supabase
        .from("organisations")
        .insert({
          name: newOrgName.trim(),
          organisation_code: orgCode
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Organisation created with code: ${orgCode}`
      });

      setShowCreateDialog(false);
      setNewOrgName("");
      loadOrganisations();
    } catch (error) {
      console.error("Error creating organisation:", error);
      toast({
        title: "Error",
        description: "Failed to create organisation",
        variant: "destructive"
      });
    }
  };

  const handleUpdateOrganisation = async () => {
    if (!selectedOrg || !editOrgName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an organisation name",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("organisations")
        .update({ name: editOrgName.trim() })
        .eq("id", selectedOrg.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organisation updated successfully"
      });

      setShowEditDialog(false);
      setSelectedOrg(null);
      setEditOrgName("");
      loadOrganisations();
    } catch (error) {
      console.error("Error updating organisation:", error);
      toast({
        title: "Error",
        description: "Failed to update organisation",
        variant: "destructive"
      });
    }
  };

  const handleDeleteOrganisation = async (org: Organisation) => {
    if (!confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("organisations")
        .delete()
        .eq("id", org.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organisation deleted successfully"
      });

      loadOrganisations();
    } catch (error) {
      console.error("Error deleting organisation:", error);
      toast({
        title: "Error",
        description: "Failed to delete organisation. It may have associated users.",
        variant: "destructive"
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Copied!",
      description: "Organisation code copied to clipboard"
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openEditDialog = (org: Organisation) => {
    setSelectedOrg(org);
    setEditOrgName(org.name);
    setShowEditDialog(true);
  };

  return (
    <StaffLayout title="Organisation Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organisations</h1>
            <p className="text-muted-foreground mt-2">
              Manage organisations and their access codes
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Organisation
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Organisations</CardTitle>
            <CardDescription>
              8-character codes are used by clients during registration to join the correct organisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : organisations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No organisations found. Create your first organisation to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Organisation Code</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organisations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                            {org.organisation_code}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(org.organisation_code)}
                          >
                            {copiedCode === org.organisation_code ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(org)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOrganisation(org)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
      </div>

      {/* Create Organisation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organisation</DialogTitle>
            <DialogDescription>
              A unique 8-character code will be automatically generated for this organisation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organisation Name</Label>
              <Input
                id="orgName"
                placeholder="e.g., Acme Corporation"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateOrganisation();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrganisation}>
              Create Organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organisation Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
            <DialogDescription>
              Update the organisation name. The organisation code cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editOrgName">Organisation Name</Label>
              <Input
                id="editOrgName"
                placeholder="e.g., Acme Corporation"
                value={editOrgName}
                onChange={(e) => setEditOrgName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateOrganisation();
                  }
                }}
              />
            </div>
            {selectedOrg && (
              <div className="space-y-2">
                <Label>Organisation Code (Read-only)</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                    {selectedOrg.organisation_code}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOrganisation}>
              Update Organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}