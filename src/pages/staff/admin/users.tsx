import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, Building2, Shield, Edit } from "lucide-react";
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

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  internal_role: string | null;
  organisation_users: {
    organisations: {
      name: string;
      organisation_code: string;
    } | null;
  }[];
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
      // Cast to any to avoid "Type instantiation is excessively deep" error with complex joins
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          role,
          internal_role,
          organisation_users!organisation_users_user_id_fkey (
            organisations (
              name,
              organisation_code
            )
          )
        `)
        .order("email");

      if (error) throw error;

      // Transform data to match interface if needed, but the structure matches nicely now
      setUsers(data as any || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users.",
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
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleEditUser(user)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-medium">{user.full_name || "No name"}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          {user.organisation_users?.[0]?.organisations && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Building2 className="h-3 w-3" />
                              {user.organisation_users[0].organisations.name} ({user.organisation_users[0].organisations.organisation_code})
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {user.internal_role && (
                            <Badge variant={getRoleBadgeVariant(user.internal_role)}>
                              {user.internal_role}
                            </Badge>
                          )}
                          {user.role && user.role !== user.internal_role && (
                            <Badge variant="outline">{user.role}</Badge>
                          )}
                          {!user.internal_role && !user.role && (
                            <Badge variant="outline">No role</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
                <Select value={selectedInternalRole} onValueChange={setSelectedInternalRole}>
                  <SelectTrigger id="internal-role">
                    <SelectValue placeholder="Select internal role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="bdm">BDM</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Primary role for staff members
                </p>
              </div>

              <div>
                <Label htmlFor="role">Client Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select client role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
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