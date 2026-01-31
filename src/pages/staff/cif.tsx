import React from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function StaffCIF() {
  return (
    <>
      <SEO
        title="CIF / Prospects - Staff Portal"
        description="Manage client information forms and prospects"
      />
      <StaffLayout>
        <div className="p-6 lg:p-8">
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-6">CIF / Prospects</h1>
          <Card className="p-8 text-center">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Prospects Pipeline</h2>
            <p className="text-slate-600">This section is under development. CIF and prospects management features will be added soon.</p>
          </Card>
        </div>
      </StaffLayout>
    </>
  );
}