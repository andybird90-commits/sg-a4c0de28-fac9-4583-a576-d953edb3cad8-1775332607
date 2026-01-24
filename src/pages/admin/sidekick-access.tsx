import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { AdminNav } from "@/components/AdminNav";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Users, 
  Activity, 
  Eye, 
  Copy, 
  Check, 
  RefreshCw,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/NotificationContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Organisation = {
  id: string;
  name: string;
  organisation_code: string;
  sidekick_enabled: boolean;
  user_count: number;
  last_evidence_date: string | null;
};

type OrgUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  last_active: string | null;
};

export default function AdminSidekickAccess() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const { notify } = useNotifications();

  useEffect(() => {
    loadOrganisations();
  }, []);

  const loadOrganisations = async () => {
    try {
      const { data: orgs, error } = await supabase
        .from("organisations")
        .select("*")
        .order("name");

      if (error) throw error;

      const orgsWithStats = await Promise.all(
        (orgs || []).map(async (org) => {
          const { count } = await supabase
            .from("organisation_users")
            .select("*", { count: "exact", head: true })
            .eq("org_id", org.id);

          const { data: lastEvidence } = await supabase
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

  const loadOrgUsers = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("organisation_users")
        .select(`
          role,
          profiles!organisation_users_user_id_fkey (
            id,
            email,
            full_name
          )
        `)
        .eq("org_id", orgId);

      if (error) throw error;

      const users = (data || []).map((item: any) => ({
        id: item.profiles.id,
        email: item.profiles.email,
        full_name: item.profiles.full_name,
        role: item.role,
        last_active: null
      }));

      setOrgUsers(users);
    } catch (error: any) {
      notify({
        type: "error",
        title: "Failed to load users",
        message: error.message
      });
    }
  };

  const viewDetails = (org: Organisation) => {
    setSelectedOrg(org);
    loadOrgUsers(org.id);
    setDetailsOpen(true);
  };

  const toggleAccess = async (orgId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("organisations")
        .update({ sidekick_enabled: !currentStatus })
        .eq("id", orgId);

      if (error) throw error;

      notify({
        type: "success",
        title: "Access updated",
        message: `Sidekick ${!currentStatus ? "enabled" : "disabled"}`
      });

      loadOrganisations();
      if (selectedOrg?.id === orgId) {
        setSelectedOrg({ ...selectedOrg, sidekick_enabled: !currentStatus });
      }
    } catch (error: any) {
      notify({
        type: "error",
        title: "Failed to update access",
        message: error.message
      });
    }
  };

  const generateNewCode = async () => {
    if (!selectedOrg) return;

    setGeneratingCode(true);
    try {
      const chars = "abcdefghijklmnopqrstuvwxyz";
      let newCode = "";
      for (let i = 0; i < 8; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { error } = await supabase
        .from("organisations")
        .update({ organisation_code: newCode })
        .eq("id", selectedOrg.id);

      if (error) throw error;

      notify({
        type: "success",
        title: "New code generated",
        message: `Code: ${newCode}`
      });

      setSelectedOrg({ ...selectedOrg, organisation_code: newCode });
      loadOrganisations();
    } catch (error: any) {
      notify({
        type: "error",
        title: "Failed to generate code",
        message: error.message
      });
    } finally {
      setGeneratingCode(false);
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
            <p className="text-muted-foreground">Loading access control...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="RD Sidekick Access - Admin" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminNav />
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">RD Sidekick Access</h1>
                <p className="text-slate-600 mt-1">Control organisation access and manage codes</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Access</p>
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
                      {organisations.reduce((sum, o) => sum + o.user_count, 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Today</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {organisations.filter(o => {
                        if (!o.last_evidence_date) return false;
                        const diff = Date.now() - new Date(o.last_evidence_date).getTime();
                        return diff < 24 * 60 * 60 * 1000;
                      }).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organisations Table */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Manage Sidekick access for each organisation</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {organisations.map((org) => (
                  <div key={org.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{org.name}</h3>
                          <Badge variant={org.sidekick_enabled ? "default" : "secondary"} className="shadow-sm">
                            {org.sidekick_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{org.user_count} Sidekick users</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            <span>
                              {org.last_evidence_date
                                ? `Last: ${new Date(org.last_evidence_date).toLocaleDateString()}`
                                : "No evidence"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-6">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`access-${org.id}`} className="text-sm font-medium cursor-pointer">
                            Access
                          </Label>
                          <Switch
                            id={`access-${org.id}`}
                            checked={org.sidekick_enabled}
                            onCheckedChange={() => toggleAccess(org.id, org.sidekick_enabled)}
                          />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => viewDetails(org)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedOrg && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedOrg.name}</DialogTitle>
                <DialogDescription>
                  Manage organisation code and user access
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Organisation Code Section */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Organisation Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <code className="flex-1 bg-slate-100 px-4 py-3 rounded-lg text-lg font-mono font-semibold text-slate-900">
                        {selectedOrg.organisation_code}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyCode(selectedOrg.organisation_code)}
                      >
                        {copiedCode === selectedOrg.organisation_code ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateNewCode}
                        disabled={generatingCode}
                      >
                        {generatingCode ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Alert className="bg-blue-50 border-blue-200">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-800">
                        Share this code with clients to let them sign up to RD Sidekick
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Sidekick Users Section */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Sidekick Users ({orgUsers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orgUsers.length > 0 ? (
                      <div className="space-y-3">
                        {orgUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-slate-900">
                                {user.full_name || user.email}
                              </p>
                              <p className="text-sm text-slate-600">{user.email}</p>
                            </div>
                            <Badge variant="secondary">{user.role}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600">No users yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}