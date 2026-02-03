import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import StaffLayout from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalOrganisations: 0,
    totalUsers: 0,
    totalClaims: 0,
    activeClaims: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    // Stats will be loaded from services
    // Placeholder for now
    setStats({
      totalOrganisations: 4,
      totalUsers: 12,
      totalClaims: 8,
      activeClaims: 5
    });
  };

  const adminSections = [
    {
      title: "Organisations",
      description: "Manage organisations and generate access codes",
      icon: Building2,
      href: "/staff/admin/organisations",
      color: "bg-blue-500"
    },
    {
      title: "Users",
      description: "View and manage user accounts and permissions",
      icon: Users,
      href: "/staff/admin/users",
      color: "bg-green-500"
    },
    {
      title: "Analytics",
      description: "View system analytics and usage reports",
      icon: BarChart3,
      href: "/staff/admin/analytics",
      color: "bg-purple-500"
    },
    {
      title: "Settings",
      description: "Configure system-wide settings",
      icon: Settings,
      href: "/staff/admin/settings",
      color: "bg-orange-500"
    }
  ];

  return (
    <StaffLayout title="Admin Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage organisations, users, and system settings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organisations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganisations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClaims}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Claims</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeClaims}</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.href} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(section.href)}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`${section.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle>{section.title}</CardTitle>
                      <CardDescription className="mt-1">{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Manage {section.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </StaffLayout>
  );
}