import React from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { FileText, Users, Shield, Briefcase, Home as HomeIcon } from "lucide-react";

export default function StaffHomePage() {
  const router = useRouter();
  const { profileWithOrg, isStaff } = useApp();

  if (!isStaff) {
    return (
      <StaffLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You do not have permission to access the staff area.</p>
        </div>
      </StaffLayout>
    );
  }

  const userName = profileWithOrg?.full_name || "Staff Member";
  const orgCode = profileWithOrg?.organisation_code || "N/A";
  const role = profileWithOrg?.internal_role || "Staff";

  return (
    <StaffLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-4xl font-bold">Staff Home</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Welcome, {userName} ({orgCode})
          </p>
          <p className="text-sm text-muted-foreground">
            Role: <span className="font-semibold">{role}</span>
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/staff/claims")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Claims
              </CardTitle>
              <CardDescription>Manage R&D tax credit claims</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/staff/cif")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                CIF Pipeline
              </CardTitle>
              <CardDescription>Client Information Forms & Onboarding</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/staff/clients")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clients
              </CardTitle>
              <CardDescription>Client management</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View client organisations, contacts, and account details.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/staff/admin")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin
              </CardTitle>
              <CardDescription>Administrative functions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                User management, system settings, and administrative tools.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HomeIcon className="h-5 w-5" />
              About the Staff Area
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is the staff-only area for RD Tax team members. Use the navigation sidebar to access different sections.
            </p>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">CIF Workflow Stages:</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>BDM Section:</strong> Initial company lookup and business background</li>
                <li><strong>Technical Feasibility:</strong> R&D assessment and qualification</li>
                <li><strong>Financial Section:</strong> Cost estimates and compliance documents</li>
                <li><strong>Admin Review:</strong> Final approval and claim creation</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Role Capabilities:</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>BDM:</strong> Create CIFs, complete BDM section</li>
                <li><strong>TECH:</strong> Complete technical feasibility assessments</li>
                <li><strong>FINANCE:</strong> Complete financial sections and upload documents</li>
                <li><strong>ADMIN:</strong> Full access - can complete any stage and approve CIFs</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}