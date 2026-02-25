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

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  internal_role: string | null;
  organisation: {
    name: string;
    organisation_code: string;
  } | null;
}

export default function AdminUsers() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedInternalRole, setSelectedInternalRole] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  // Group users by organization
  const groupedUsers = useMemo(() => {
    const groups: Record<string, Profile[]> = {
      'No Organization': []
    };

    users.forEach(user => {
      const orgName = user.organisation?.name || 'No Organization';
      if (!groups[orgName]) {
        groups[orgName] = [];
      }
      groups[orgName].push(user);
    });

    return groups;
  }, [users]);

  const toggleOrg = (orgName: string) => {
    setExpandedOrgs(prev => {
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
    loadUsers();
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
          organisations (
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
    setSelectedRole(user.role || "");
    setSelectedInternalRole(user.internal_role || "");
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: selectedRole || null,
          internal_role: selectedInternalRole || null,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User roles updated successfully.",
      });

      setShowEditModal(false);
      loadUsers();
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
              Manage user roles and permissions
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
                      if (a === 'No Organization') return 1;
                      if (b === 'No Organization') return -1;
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
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                              <div className="text-left">
                                <h3 className="font-semibold">{orgName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {userCount} {userCount === 1 ? 'user' : 'users'}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`h-5 w-5 text-muted-foreground transition-transform ${
                                isExpanded ? 'transform rotate-180' : ''
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
                                        {user.full_name || 'No name'}
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
              <DialogTitle>Edit User Roles</DialogTitle>
              <DialogDescription>
                Assign roles to {editingUser?.full_name || editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="internal-role">Internal Role</Label>
                <Select
                  value={editingUser?.internal_role || "none"}
                  onValueChange={(value) =>
                    setEditingUser({
                      ...editingUser!,
                      internal_role: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select internal role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Internal Role</SelectItem>
                    {["admin", "director", "technical", "bdm", "finance"]
                      .filter(Boolean)
                      .map((role) => (
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

              <div>
                <Label htmlFor="role">Client Role</Label>
                <Select
                  value={editingUser?.role || "none"}
                  onValueChange={(value) =>
                    setEditingUser({
                      ...editingUser!,
                      role: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Client Role</SelectItem>
                    {["admin", "member", "viewer"]
                      .filter(Boolean)
                      .map((role) => (
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