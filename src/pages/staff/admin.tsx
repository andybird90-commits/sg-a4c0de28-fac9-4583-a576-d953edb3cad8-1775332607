import React from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function StaffAdmin() {
  return (
    <>
      <SEO
        title="Admin - Staff Portal"
        description="System administration and settings"
      />
      <StaffLayout>
        <div className="p-6 lg:p-8">
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-6">Admin</h1>
          <Card className="p-8 text-center">
            <Settings className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Administration</h2>
            <p className="text-slate-600">This section is under development. Admin features will be added soon.</p>
          </Card>
        </div>
      </StaffLayout>
    </>
  );
}