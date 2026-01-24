import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { AdminNav } from "@/components/AdminNav";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Shield, Mail, Calendar, FileText, Building2, Loader2, ChevronLeft, Filter } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

interface UserWithOrg {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  organisations: Array<{
    org_id: string;
    role: string;
    org_name: string;
    org_code: string;
  }>;
  evidence_count: number;
}

export default function AdminUsers() {
  const router = useRouter();
  const { notify } = useNotifications();
  const [users, setUsers] = useState<UserWithOrg[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithOrg | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, users]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== "andy.bird@rdmande.uk") {
      notify({ type: "error", title: "Access Denied", message: "Access denied. Admin only." });
      router.push("/home");
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get organisation memberships
      const { data: orgUsers, error: orgError } = await supabase
        .from("organisation_users")
        .select(`
          user_id,
          org_id,
          role,
          organisations!organisation_users_org_id_fkey (
            name,
            organisation_code
          )
        `);

      if (orgError) throw orgError;

      // Get evidence counts per user
      const { data: evidenceCounts, error: evidenceError } = await supabase
        .from("evidence_items")
        .select("user_id");

      if (evidenceError) throw evidenceError;

      // Build user counts map
      const evidenceCountMap: Record<string, number> = {};
      evidenceCounts?.forEach((item: any) => {
        evidenceCountMap[item.user_id] = (evidenceCountMap[item.user_id] || 0) + 1;
      });

      // Combine data
      const usersWithOrgs: UserWithOrg[] = (profiles || []).map((profile: any) => {
        const userOrgs = (orgUsers || [])
          .filter((ou: any) => ou.user_id === profile.id)
          .map((ou: any) => ({
            org_id: ou.org_id,
            role: ou.role,
            org_name: ou.organisations?.name || "Unknown",
            org_code: ou.organisations?.organisation_code || "N/A"
          }));

        return {
          id: profile.id,
          email: profile.email || "No email",
          full_name: profile.full_name,
          created_at: profile.created_at,
          last_sign_in_at: profile.last_sign_in_at,
          organisations: userOrgs,
          evidence_count: evidenceCountMap[profile.id] || 0
        };
      });

      setUsers(usersWithOrgs);
      setFilteredUsers(usersWithOrgs);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      notify({ type: "error", title: "Error", message: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(query) ||
        user.full_name?.toLowerCase().includes(query) ||
        user.organisations.some(org => org.org_name.toLowerCase().includes(query))
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user =>
        user.organisations.some(org => org.role === roleFilter)
      );
    }

    setFilteredUsers(filtered);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-700 border-purple-200";
      case "client": return "bg-blue-100 text-blue-700 border-blue-200";
      case "viewer": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdminNav />
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                <p className="text-slate-600">Manage all users across organisations</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{users.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Admins</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {users.filter(u => u.organisations.some(o => o.role === "admin")).length}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Today</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {users.filter(u => {
                        if (!u.last_sign_in_at) return false;
                        const lastSignIn = new Date(u.last_sign_in_at);
                        const today = new Date();
                        return lastSignIn.toDateString() === today.toDateString();
                      }).length}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Evidence</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {users.reduce((sum, u) => sum + u.evidence_count, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <FileText className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-md mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, email, or organisation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>All Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Complete list of registered users</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No users found matching your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">User</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Organisations</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Evidence</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Joined</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Last Active</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{user.full_name || "No name"}</p>
                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {user.organisations.length === 0 ? (
                              <Badge variant="outline" className="text-slate-500">No organisation</Badge>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {user.organisations.map((org, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Building2 className="h-3 w-3 text-slate-400" />
                                    <span className="text-sm text-slate-700">{org.org_name}</span>
                                    <Badge className={getRoleBadgeColor(org.role)}>
                                      {org.role}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {user.evidence_count} items
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-slate-600">{formatDate(user.created_at)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-slate-600">{formatDate(user.last_sign_in_at)}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>User Details</DialogTitle>
                                  <DialogDescription>Complete information for {user.full_name || user.email}</DialogDescription>
                                </DialogHeader>
                                {selectedUser && selectedUser.id === user.id && (
                                  <div className="space-y-6 py-4">
                                    <div className="flex items-center gap-4">
                                      <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <h3 className="text-xl font-semibold text-slate-900">{user.full_name || "No name"}</h3>
                                        <p className="text-slate-600">{user.email}</p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">User ID</p>
                                        <p className="text-sm font-mono text-slate-900 break-all">{user.id}</p>
                                      </div>
                                      <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">Evidence Captured</p>
                                        <p className="text-2xl font-bold text-slate-900">{user.evidence_count}</p>
                                      </div>
                                      <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">Joined Date</p>
                                        <p className="text-sm font-medium text-slate-900">{formatDate(user.created_at)}</p>
                                      </div>
                                      <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="text-sm text-slate-600 mb-1">Last Sign In</p>
                                        <p className="text-sm font-medium text-slate-900">{formatDate(user.last_sign_in_at)}</p>
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="font-semibold text-slate-900 mb-3">Organisation Memberships</h4>
                                      {user.organisations.length === 0 ? (
                                        <p className="text-slate-500 text-sm">Not a member of any organisation</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {user.organisations.map((org, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                                              <div>
                                                <p className="font-medium text-slate-900">{org.org_name}</p>
                                                <p className="text-sm text-slate-600">Code: {org.org_code}</p>
                                              </div>
                                              <Badge className={getRoleBadgeColor(org.role)}>
                                                {org.role}
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}