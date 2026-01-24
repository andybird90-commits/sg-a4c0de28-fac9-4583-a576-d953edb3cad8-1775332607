import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus, Copy, Check, Users, Activity, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/NotificationContext";

type Organisation = {
  id: string;
  name: string;
  organisation_code: string;
  sidekick_enabled: boolean;
  created_at: string;
  user_count?: number;
  last_activity?: string;
};

export default function OrganisationsPage() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { notify } = useNotifications();

  useEffect(() => {
    loadOrganisations();
  }, []);

  const loadOrganisations = async () => {
    try {
      const { data: orgs, error } = await supabase
        .from("organisations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user counts and last activity for each org
      const orgsWithStats = await Promise.all(
        (orgs || []).map(async (org) => {
          const { count } = await supabase
            .from("organisation_users")
            .select("*", { count: "exact", head: true })
            .eq("org_id", org.id);

          const { data: evidenceData } = await supabase
            .from("evidence_items")
            .select("created_at")
            .eq("org_id", org.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastEvidence = evidenceData && evidenceData.length > 0 
            ? evidenceData[0].created_at 
            : null;

          return {
            ...org,
            user_count: count || 0,
            last_activity: lastEvidence
          };
        })
      );

      setOrganisations(orgsWithStats);
    } catch (error: any) {
      notify({
        type: "error",
        title: "Failed to load organisations",
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const generateOrgCode = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createOrganisation = async () => {
    if (!newOrgName.trim()) {
      notify({
        type: "error",
        title: "Validation error",
        message: "Organisation name is required"
      });
      return;
    }

    setCreating(true);
    try {
      const code = generateOrgCode();

      const { data, error } = await supabase
        .from("organisations")
        .insert({
          name: newOrgName.trim(),
          organisation_code: code,
          sidekick_enabled: true
        })
        .select()
        .single();

      if (error) throw error;

      notify({
        type: "success",
        title: "Organisation created",
        message: `Code: ${code}`
      });

      setNewOrgName("");
      setDialogOpen(false);
      loadOrganisations();
    } catch (error: any) {
      notify({
        type: "error",
        title: "Failed to create organisation",
        message: error.message
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleSidekick = async (orgId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("organisations")
        .update({ sidekick_enabled: !currentStatus })
        .eq("id", orgId);

      if (error) throw error;

      notify({
        type: "success",
        title: "Updated",
        message: `Sidekick access ${!currentStatus ? "enabled" : "disabled"}`
      });

      loadOrganisations();
    } catch (error: any) {
      notify({
        type: "error",
        title: "Failed to update",
        message: error.message
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    notify({
      type: "success",
      title: "Copied",
      message: "Organisation code copied to clipboard"
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading organisations...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Organisations - Admin" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Organisations</h1>
                  <p className="text-slate-600 mt-1">Manage client organisations and access</p>
                </div>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all">
                  <Plus className="mr-2 h-4 w-4" />
                  New Organisation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Organisation</DialogTitle>
                  <DialogDescription>
                    Add a new client organisation with an auto-generated code
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organisation Name</Label>
                    <Input
                      id="org-name"
                      placeholder="e.g. ACME Corporation"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createOrganisation()}
                    />
                  </div>
                  <Alert className="bg-blue-50 border-blue-200">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      An 8-letter organisation code will be automatically generated
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createOrganisation} disabled={creating}>
                    {creating ? "Creating..." : "Create Organisation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Organisations</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{organisations.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Sidekick Enabled</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {organisations.filter(o => o.sidekick_enabled).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {organisations.reduce((sum, o) => sum + (o.user_count || 0), 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organisations List */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle>All Organisations</CardTitle>
              <CardDescription>Manage access and organisation codes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {organisations.map((org) => (
                  <div key={org.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-slate-900">{org.name}</h3>
                          <Badge variant={org.sidekick_enabled ? "default" : "secondary"} className="shadow-sm">
                            {org.sidekick_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Shield className="h-4 w-4" />
                            <span className="font-mono font-medium">{org.organisation_code}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyCode(org.organisation_code)}
                            >
                              {copiedCode === org.organisation_code ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="h-4 w-4" />
                            <span>{org.user_count || 0} users</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Activity className="h-4 w-4" />
                            <span>
                              {org.last_activity
                                ? `Active ${new Date(org.last_activity).toLocaleDateString()}`
                                : "No activity"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-6">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`toggle-${org.id}`} className="text-sm font-medium cursor-pointer">
                            Sidekick
                          </Label>
                          <Switch
                            id={`toggle-${org.id}`}
                            checked={org.sidekick_enabled}
                            onCheckedChange={() => toggleSidekick(org.id, org.sidekick_enabled)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}