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
import { Copy, RefreshCw, Users, Calendar, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/NotificationContext";

type Organisation = {
  id: string;
  name: string;
  sidekick_enabled: boolean;
  user_count?: number;
  last_evidence_date?: string;
};

type InviteCode = {
  id: string;
  org_id: string;
  code: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
};

export default function SidekickAccessAdmin() {
  const router = useRouter();
  const { user, loading } = useApp();
  const { notify } = useNotifications();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

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

  const loadOrganisations = async () => {
    try {
      const { data, error } = await supabase
        .from("organisations")
        .select("id, name, sidekick_enabled")
        .order("name");

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

  const loadInviteCode = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("org_invite_codes")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setInviteCode(data || null);
    } catch (error) {
      console.error("Error loading invite code:", error);
    }
  };

  const handleSelectOrg = async (org: Organisation) => {
    setSelectedOrg(org);
    await loadInviteCode(org.id);
  };

  const generateNewCode = async () => {
    if (!selectedOrg) return;

    try {
      if (inviteCode) {
        await supabase
          .from("org_invite_codes")
          .update({ is_active: false })
          .eq("id", inviteCode.id);
      }

      const newCode = `RDSK-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      const { data, error } = await supabase
        .from("org_invite_codes")
        .insert({
          org_id: selectedOrg.id,
          code: newCode,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setInviteCode(data);
      notify({
        type: "success",
        title: "Code generated",
        message: "New organisation code created"
      });
    } catch (error) {
      console.error("Error generating code:", error);
      notify({
        type: "error",
        title: "Generation failed",
        message: "Could not generate new code"
      });
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
      <SEO title="RD Sidekick Access - Admin" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#001F3F] mb-2">RD Sidekick Access</h1>
          <p className="text-gray-600">Manage organisation access and invite codes</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Organisations</h2>
            <div className="space-y-3">
              {organisations.map((org) => (
                <div
                  key={org.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedOrg?.id === org.id
                      ? "border-[#FF6B35] bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleSelectOrg(org)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[#001F3F]">{org.name}</h3>
                    <Badge variant={org.sidekick_enabled ? "default" : "secondary"}>
                      {org.sidekick_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
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
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-gray-600">Access:</span>
                    <Switch
                      checked={org.sidekick_enabled}
                      onCheckedChange={() => toggleOrgAccess(org)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            {selectedOrg ? (
              <>
                <h2 className="text-xl font-semibold mb-4">{selectedOrg.name}</h2>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={20} className="text-[#FF6B35]" />
                    <h3 className="font-semibold">Organisation Code</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Share this code with your client to let them sign up to RD Sidekick.
                  </p>

                  {inviteCode ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-lg font-mono font-bold text-[#001F3F]">
                          {inviteCode.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(inviteCode.code)}
                        >
                          <Copy size={16} />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Expires: {new Date(inviteCode.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4 italic">
                      No active code – generate one below
                    </p>
                  )}

                  <Button onClick={generateNewCode} className="w-full">
                    <RefreshCw size={16} className="mr-2" />
                    Generate New Code
                  </Button>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Access Status</h3>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">RD Sidekick Access</span>
                    <Badge variant={selectedOrg.sidekick_enabled ? "default" : "secondary"}>
                      {selectedOrg.sidekick_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  {!selectedOrg.sidekick_enabled && (
                    <p className="text-xs text-gray-500 mt-2">
                      Users from this organisation cannot access RD Sidekick while disabled.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Shield size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select an organisation to manage access</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}