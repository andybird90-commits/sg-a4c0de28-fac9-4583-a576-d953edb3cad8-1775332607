import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, Building2, Shield, Edit, ChevronDown, User, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface OrganisationListItem {
  id: string;
  name: string;
  organisation_code: string;
  sidekick_enabled: boolean;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  internal_role: string | null;
  organisation: {
    id: string;
    name: string;
    organisation_code: string;
  } | null;
  organisation_role: string | null;
}

export default function AdminUsers() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("none");
  const [selectedInternalRole, setSelectedInternalRole] = useState<string>("none");
  const [saving, setSaving] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  const [organisations, setOrganisations] = useState<OrganisationListItem[]>([]);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string>("none");
  const [selectedOrganisationRole, setSelectedOrganisationRole] = useState<string>("client");
  const [replaceExistingMemberships, setReplaceExistingMemberships] = useState<boolean>(false);

  // Group users by organization
  const groupedUsers = useMemo(() => {
    const groups: Record<string, Profile[]> = {
      "No Organization": [],
    };

    users.forEach((user) => {
      const orgName = user.organisation?.name || "No Organization";
      if (!groups[orgName]) {
        groups[orgName] = [];
      }
      groups[orgName].push(user);
    });

    return groups;
  }, [users]);

  const toggleOrg = (orgName: string) => {
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgName)) {
        next.delete(orgName);
      } else {
        next.add(orgName);
      }
      return next;
    });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const getAccessToken = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (!profile?.internal_role || (profile.internal_role !== "admin" && profile.internal_role !== "director")) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage users.",
        variant: "destructive",
      });
      router.push("/staff");
      return;
    }

    setCurrentUser(profile);
    await Promise.all([loadUsers(), loadOrganisations()]);
  };

  const loadOrganisations = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch("/api/organisations/list", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const data = (await res.json()) as { ok: boolean; organisations?: OrganisationListItem[] };
      if (data.ok && Array.isArray(data.organisations)) {
        setOrganisations(data.organisations);
      }
    } catch {
      // Ignore; user list still usable
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      // First, fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, internal_role")
        .order("email", { ascending: true });

      if (profilesError) throw profilesError;

      // Then fetch organization memberships
      const { data: orgUsersData, error: orgUsersError } = await supabase
        .from("organisation_users")
        .select(`
          user_id,
          role,
          organisations (
            id,
            name,
            organisation_code
          )
        `);

      if (orgUsersError) throw orgUsersError;

      // Merge the data
      const usersWithOrgs =
        profilesData?.map((profile) => {
          const userMemberships =
            orgUsersData?.filter((ou: any) => ou.user_id === profile.id) || [];

          // Prefer RDTax (code 'uzmktkqt') if the user belongs to multiple organisations
          const primaryMembership =
            userMemberships.find(
              (ou: any) => ou.organisations?.organisation_code === "uzmktkqt"
            ) || userMemberships[0] || null;

          return {
            ...profile,
            organisation: primaryMembership?.organisations || null,
            organisation_role: (primaryMembership?.role as string | null) ?? null,
          };
        }) || [];

      setUsers(usersWithOrgs);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: Profile) => {
    setEditingUser(user);
    setSelectedRole(user.role || "none");
    setSelectedInternalRole(user.internal_role || "none");

    setSelectedOrganisationId(user.organisation?.id ?? "none");
    setSelectedOrganisationRole(user.organisation_role ?? "client");
    setReplaceExistingMemberships(false);

    setShowEditModal(true);
  };

  const assignOrganisation = async (targetUserId: string): Promise<void> => {
    if (selectedOrganisationId === "none") return;

    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch("/api/organisations/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orgId: selectedOrganisationId,
        userId: targetUserId,
        role: selectedOrganisationRole || "client",
        replaceExisting: replaceExistingMemberships,
      }),
    });

    if (!response.ok) {
      let message = "Failed to assign organisation";
      try {
        const data = (await response.json()) as { error?: string };
        if (data?.error) message = data.error;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: editingUser.id,
          internal_role: selectedInternalRole === "none" ? null : selectedInternalRole,
          role: selectedRole === "none" ? null : selectedRole,
        }),
      });

      const payload = (await res.json()) as any;
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.message || "Failed to update user.");
      }

      if (selectedOrganisationId !== (editingUser.organisation?.id ?? "none")) {
        await assignOrganisation(editingUser.id);
      } else if (selectedOrganisationId !== "none" && replaceExistingMemberships) {
        await assignOrganisation(editingUser.id);
      }

      toast({
        title: "Success",
        description: "User updated successfully.",
      });

      setShowEditModal(false);
      await loadUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: string | null) => {
    if (!role) return "outline";
    if (role === "admin" || role === "director") return "default";
    if (role === "technical" || role === "bdm") return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </StaffLayout>
    );
  }

  return (
    <>
      <Head>
        <title>User Management - RD Sidekick</title>
      </Head>
      <StaffLayout>
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">User Management</h1>
            <p className="text-muted-foreground">
              Manage user roles, permissions, and organisation access
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users ({users.length})
              </CardTitle>
              <CardDescription>
                Click on a user to edit their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedUsers)
                    .sort(([a], [b]) => {
                      // Sort: organizations alphabetically, "No Organization" last
                      if (a === "No Organization") return 1;
                      if (b === "No Organization") return -1;
                      return a.localeCompare(b);
                    })
                    .map(([orgName, orgUsers]) => {
                      const isExpanded = expandedOrgs.has(orgName);
                      const userCount = orgUsers.length;

                      return (
                        <div key={orgName} className="border rounded-lg overflow-hidden">
                          {/* Organization Header */}
                          <button
                            onClick={() => toggleOrg(orgName)}
                            className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                            type="button"
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                              <div className="text-left">
                                <h3 className="font-semibold">{orgName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {userCount} {userCount === 1 ? "user" : "users"}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`h-5 w-5 text-muted-foreground transition-transform ${
                                isExpanded ? "transform rotate-180" : ""
                              }`}
                            />
                          </button>

                          {/* Users List */}
                          {isExpanded && (
                            <div className="divide-y">
                              {orgUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">
                                        {user.full_name || "No name"}
                                      </div>
                                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Mail className="h-3 w-3" />
                                        <span className="truncate">{user.email}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 items-center flex-shrink-0">
                                    {user.internal_role ? (
                                      <Badge variant="default">
                                        {user.internal_role}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">No role</Badge>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditUser(user);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit User Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update roles and organisation access for {editingUser?.full_name || editingUser?.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label>Organisation</Label>
                <Select value={selectedOrganisationId} onValueChange={setSelectedOrganisationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No organisation</SelectItem>
                    {organisations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({org.organisation_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedOrganisationId !== "none" && (
                  <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
                    <div className="space-y-2">
                      <Label>Organisation role</Label>
                      <Select value={selectedOrganisationRole} onValueChange={setSelectedOrganisationRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organisation role" />
                        </SelectTrigger>
                        <SelectContent>
                          {["client", "employee", "admin"].map((r) => (
                            <SelectItem key={r} value={r}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={replaceExistingMemberships}
                        onChange={(e) => setReplaceExistingMemberships(e.target.checked)}
                      />
                      Replace existing organisation memberships
                    </label>

                    <p className="text-xs text-muted-foreground">
                      Use this when moving a user out of the wrong organisation. For a user in “No Organization” you can leave it off.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="internal-role">Internal Role</Label>
                <Select
                  value={selectedInternalRole}
                  onValueChange={setSelectedInternalRole}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select internal role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Internal Role</SelectItem>
                    {["admin", "director", "technical", "bd", "commercial", "ops"].map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Primary role for staff members
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Client Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Client Role</SelectItem>
                    {["bdm", "feasibility", "admin", "finance", "hybrid"].map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Role for client organization access
                </p>
              </div>

              <div className="bg-muted p-3 rounded-md text-sm">
                <strong>Role Permissions:</strong>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li><strong>Admin/Director:</strong> Full system access</li>
                  <li><strong>Technical:</strong> Feasibility calls, technical review</li>
                  <li><strong>BDM:</strong> Client onboarding, CIF management</li>
                  <li><strong>Finance:</strong> Claims processing, financial review</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </StaffLayout>
    </>
  );
}