import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Users, 
  Calendar, 
  Copy, 
  RefreshCw, 
  Shield, 
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Eye,
  EyeOff
} from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/integrations/supabase/client";

interface Organisation {
  id: string;
  name: string;
  organisation_code: string;
  sidekick_enabled: boolean;
  user_count?: number;
  last_evidence_date?: string;
}

interface OrganisationUser {
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function SidekickAccessPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useApp();
  const { notify } = useNotifications();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [orgUsers, setOrgUsers] = useState<OrganisationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    } else if (user) {
      loadOrganisations();
    }
  }, [user, authLoading, router]);

  const loadOrganisations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organisations")
        .select(`
          id,
          name,
          organisation_code,
          sidekick_enabled
        `)
        .order("name");

      if (error) throw error;

      // Get user counts and last evidence dates
      const orgsWithStats = await Promise.all(
        (data || []).map(async (org) => {
          // Get user count
          const { count } = await supabase
            .from("organisation_users")
            .select("*", { count: "exact", head: true })
            .eq("org_id", org.id);

          // Get last evidence date from Sidekick schema
          const { data: evidenceData } = await (supabase as any)
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
            last_evidence_date: evidenceData?.created_at || null
          };
        })
      );

      setOrganisations(orgsWithStats);
    } catch (error: any) {
      console.error("Error loading organisations:", error);
      notify({
        type: "error",
        title: "Load failed",
        message: "Could not load organisations"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrganisationDetails = async (org: Organisation) => {
    setSelectedOrg(org);
    setDetailLoading(true);
    setShowCode(false);

    try {
      const { data, error } = await supabase
        .from("organisation_users")
        .select(`
          user_id,
          role,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("org_id", org.id);

      if (error) throw error;

      setOrgUsers((data || []) as any);
    } catch (error: any) {
      console.error("Error loading organisation details:", error);
      notify({
        type: "error",
        title: "Load failed",
        message: "Could not load organisation details"
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSidekickAccess = async (orgId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("organisations")
        .update({ sidekick_enabled: !currentStatus })
        .eq("id", orgId);

      if (error) throw error;

      notify({
        type: "success",
        title: "Access updated",
        message: `RD Sidekick ${!currentStatus ? "enabled" : "disabled"} for this organisation`
      });

      // Refresh the list
      loadOrganisations();
      
      // Update selected org if it's the one we just changed
      if (selectedOrg?.id === orgId) {
        setSelectedOrg({ ...selectedOrg, sidekick_enabled: !currentStatus });
      }
    } catch (error: any) {
      console.error("Error toggling access:", error);
      notify({
        type: "error",
        title: "Update failed",
        message: "Could not update Sidekick access"
      });
    }
  };

  const generateNewCode = async () => {
    if (!selectedOrg) return;

    setGeneratingCode(true);
    try {
      // Generate random 8-letter code
      const chars = "abcdefghijklmnopqrstuvwxyz";
      const newCode = Array.from({ length: 8 }, () => 
        chars[Math.floor(Math.random() * chars.length)]
      ).join("");

      const { error } = await supabase
        .from("organisations")
        .update({ organisation_code: newCode })
        .eq("id", selectedOrg.id);

      if (error) throw error;

      notify({
        type: "success",
        title: "Code generated",
        message: "New organisation code created successfully"
      });

      // Update local state
      setSelectedOrg({ ...selectedOrg, organisation_code: newCode });
      setShowCode(true);
      
      // Refresh the list
      loadOrganisations();
    } catch (error: any) {
      console.error("Error generating code:", error);
      notify({
        type: "error",
        title: "Generation failed",
        message: "Could not generate new code"
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify({
      type: "success",
      title: "Copied!",
      message: "Organisation code copied to clipboard"
    });
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <SEO title="RD Sidekick Access - Admin" />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="RD Sidekick Access - Admin" />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#001F3F] to-[#003366] text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8" />
              <h1 className="text-3xl font-bold">RD Sidekick Access</h1>
            </div>
            <p className="text-gray-300">
              Manage organisation access and invitation codes for RD Sidekick
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organisation List */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#001F3F]">Organisations</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadOrganisations}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>

                <div className="space-y-3">
                  {organisations.map((org) => (
                    <div
                      key={org.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedOrg?.id === org.id
                          ? "border-[#001F3F] bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() => loadOrganisationDetails(org)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="h-5 w-5 text-[#001F3F]" />
                            <h3 className="font-semibold text-gray-900">{org.name}</h3>
                            {org.sidekick_enabled ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Enabled
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                <XCircle className="h-3 w-3 mr-1" />
                                Disabled
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{org.user_count || 0} users</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {org.last_evidence_date
                                  ? new Date(org.last_evidence_date).toLocaleDateString()
                                  : "No evidence yet"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={org.sidekick_enabled}
                            onCheckedChange={() => toggleSidekickAccess(org.id, org.sidekick_enabled)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {organisations.length === 0 && (
                    <div className="text-center py-12">
                      <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500">No organisations found</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Organisation Details Panel */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6">
                {!selectedOrg ? (
                  <div className="text-center py-12">
                    <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No organisation selected</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Click an organisation to view details
                    </p>
                  </div>
                ) : detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-bold text-[#001F3F] mb-4">
                      {selectedOrg.name}
                    </h2>

                    {/* Organisation Code Section */}
                    <div className="mb-6">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                        Organisation Code
                      </label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <code className="text-2xl font-mono font-bold text-[#001F3F]">
                            {showCode ? selectedOrg.organisation_code : "••••••••"}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCode(!showCode)}
                          >
                            {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => copyToClipboard(selectedOrg.organisation_code)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={generateNewCode}
                            disabled={generatingCode}
                          >
                            {generatingCode ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            New Code
                          </Button>
                        </div>

                        <p className="text-xs text-gray-500 mt-3">
                          Share this code with your client to let them sign up to RD Sidekick.
                        </p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    {/* Sidekick Users Section */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase mb-3 block">
                        Sidekick Users ({orgUsers.length})
                      </label>

                      <div className="space-y-2">
                        {orgUsers.map((orgUser) => (
                          <div
                            key={orgUser.user_id}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                          >
                            <p className="font-medium text-sm text-gray-900">
                              {orgUser.profiles?.full_name || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500">{orgUser.profiles?.email}</p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {orgUser.role}
                            </Badge>
                          </div>
                        ))}

                        {orgUsers.length === 0 && (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                            <Users className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No users yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}