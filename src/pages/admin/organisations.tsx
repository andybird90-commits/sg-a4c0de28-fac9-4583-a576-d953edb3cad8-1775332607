import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Copy, Plus, Building2, Users, Calendar, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Organisation = {
  id: string;
  name: string;
  organisation_code: string;
  sidekick_enabled: boolean;
  created_at: string;
  user_count?: number;
  last_evidence_date?: string;
};

export default function OrganisationsAdmin() {
  const router = useRouter();
  const { user, loading } = useApp();
  const { notify } = useNotifications();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgCode, setNewOrgCode] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadOrganisations();
    }
  }, [user]);

  const generateCode = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewOrgCode(code);
  };

  const loadOrganisations = async () => {
    try {
      const { data, error } = await supabase
        .from("organisations")
        .select("id, name, organisation_code, sidekick_enabled, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const orgsWithStats = await Promise.all(
        (data || []).map(async (org) => {
          const { count } = await supabase
            .from("organisation_users")
            .select("*", { count: "exact", head: true })
            .eq("org_id", org.id);

          const { data: lastEvidence } = await (supabase as any)
            .schema("sidekick")
            .from("evidence_items")
            .select("created_at")
            .eq("org_id", org.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...org,
            user_count: count || 0,
            last_evidence_date: lastEvidence?.created_at || null
          };
        })
      );

      setOrganisations(orgsWithStats);
    } catch (error) {
      console.error("Error loading organisations:", error);
      notify({
        type: "error",
        title: "Load failed",
        message: "Could not load organisations"
      });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !newOrgCode.trim()) {
      notify({
        type: "error",
        title: "Validation error",
        message: "Please provide both organisation name and code"
      });
      return;
    }

    if (newOrgCode.length !== 8) {
      notify({
        type: "error",
        title: "Invalid code",
        message: "Organisation code must be exactly 8 characters"
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("organisations")
        .insert({
          name: newOrgName.trim(),
          organisation_code: newOrgCode.toLowerCase(),
          sidekick_enabled: true
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("This organisation code is already in use");
        }
        throw error;
      }

      notify({
        type: "success",
        title: "Organisation created",
        message: `${newOrgName} has been created successfully`
      });

      setNewOrgName("");
      setNewOrgCode("");
      setCreateDialogOpen(false);
      await loadOrganisations();
    } catch (error: any) {
      console.error("Error creating organisation:", error);
      notify({
        type: "error",
        title: "Creation failed",
        message: error.message || "Could not create organisation"
      });
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify({
      type: "success",
      title: "Copied",
      message: "Code copied to clipboard"
    });
  };

  const toggleOrgAccess = async (org: Organisation) => {
    try {
      const { error } = await supabase
        .from("organisations")
        .update({ sidekick_enabled: !org.sidekick_enabled })
        .eq("id", org.id);

      if (error) throw error;

      await loadOrganisations();
      if (selectedOrg?.id === org.id) {
        setSelectedOrg({ ...org, sidekick_enabled: !org.sidekick_enabled });
      }

      notify({
        type: "success",
        title: "Access updated",
        message: `RD Sidekick ${!org.sidekick_enabled ? "enabled" : "disabled"} for ${org.name}`
      });
    } catch (error) {
      console.error("Error toggling access:", error);
      notify({
        type: "error",
        title: "Update failed",
        message: "Could not update access"
      });
    }
  };

  if (loading || loadingOrgs) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Organisations - Admin" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#001F3F] mb-2">Organisations</h1>
            <p className="text-gray-600">Manage organisations and access codes</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#FF6B35] hover:bg-[#E67510]">
                <Plus size={16} className="mr-2" />
                Add Organisation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organisation</DialogTitle>
                <DialogDescription>
                  Add a new organisation with a unique 8-letter code
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organisation Name</Label>
                  <Input
                    id="orgName"
                    placeholder="ACME Corporation"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgCode">Organisation Code (8 letters)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="orgCode"
                      placeholder="abcdefgh"
                      value={newOrgCode}
                      onChange={(e) => setNewOrgCode(e.target.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 8))}
                      disabled={creating}
                      maxLength={8}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={generateCode}
                      disabled={creating}
                      size="icon"
                    >
                      <RefreshCw size={16} />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    This code will be shared with users to sign up
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrg}
                  disabled={!newOrgName.trim() || newOrgCode.length !== 8 || creating}
                  className="bg-[#FF6B35] hover:bg-[#E67510]"
                >
                  {creating ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                  Create Organisation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">All Organisations</h2>
            <div className="space-y-3">
              {organisations.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No organisations yet</p>
              ) : (
                organisations.map((org) => (
                  <div
                    key={org.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedOrg?.id === org.id
                        ? "border-[#FF6B35] bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedOrg(org)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-[#001F3F]" />
                        <h3 className="font-semibold text-[#001F3F]">{org.name}</h3>
                      </div>
                      <Badge variant={org.sidekick_enabled ? "default" : "secondary"}>
                        {org.sidekick_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {org.user_count} users
                      </span>
                      {org.last_evidence_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Last: {new Date(org.last_evidence_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 rounded px-3 py-2">
                      <code className="text-sm font-mono font-semibold flex-1">
                        {org.organisation_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(org.organisation_code);
                        }}
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            {selectedOrg ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">{selectedOrg.name}</h2>
                  <Badge variant={selectedOrg.sidekick_enabled ? "default" : "secondary"} className="text-sm">
                    {selectedOrg.sidekick_enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-sm text-gray-600 uppercase tracking-wide">
                      Organisation Code
                    </h3>
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <code className="text-2xl font-mono font-bold text-[#001F3F]">
                          {selectedOrg.organisation_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedOrg.organisation_code)}
                        >
                          <Copy size={16} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Share this code with users to allow them to sign up to your organisation
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-sm text-gray-600 uppercase tracking-wide">
                      RD Sidekick Access
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium">Access Control</p>
                        <p className="text-sm text-gray-500">
                          {selectedOrg.sidekick_enabled 
                            ? "Users can access RD Sidekick features"
                            : "RD Sidekick access is disabled"}
                        </p>
                      </div>
                      <Switch
                        checked={selectedOrg.sidekick_enabled}
                        onCheckedChange={() => toggleOrgAccess(selectedOrg)}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-sm text-gray-600 uppercase tracking-wide">
                      Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Users size={20} className="text-[#FF6B35] mb-2" />
                        <p className="text-2xl font-bold text-[#001F3F]">{selectedOrg.user_count}</p>
                        <p className="text-sm text-gray-600">Users</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Calendar size={20} className="text-[#FF6B35] mb-2" />
                        <p className="text-sm font-medium text-[#001F3F]">
                          {selectedOrg.last_evidence_date
                            ? new Date(selectedOrg.last_evidence_date).toLocaleDateString()
                            : "No activity"}
                        </p>
                        <p className="text-sm text-gray-600">Last Evidence</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-sm text-gray-600 uppercase tracking-wide">
                      Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Created</span>
                        <span className="font-medium">
                          {new Date(selectedOrg.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Organisation ID</span>
                        <span className="font-mono text-xs">{selectedOrg.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Building2 size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select an organisation to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}