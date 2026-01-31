import React from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function StaffClaims() {
  return (
    <>
      <SEO
        title="Claims - Staff Portal"
        description="Manage R&D tax claims"
      />
      <StaffLayout>
        <div className="p-6 lg:p-8">
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-6">Claims</h1>
          <Card className="p-8 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Claims Management</h2>
            <p className="text-slate-600">This section is under development. Claims management features will be added soon.</p>
          </Card>
        </div>
      </StaffLayout>
    </>
  );
}