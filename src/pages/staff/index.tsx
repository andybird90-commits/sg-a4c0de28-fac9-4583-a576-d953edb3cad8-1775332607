import React from "react";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInternalRoleDisplayName } from "@/lib/auth/roles";
import {
  FileText,
  Users,
  Building2,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function StaffHome() {
  const router = useRouter();
  const { profileWithOrg, loading } = useApp();

  // Show loading state
  if (loading) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto mb-4"></div>
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  const quickActions = [
    {
      icon: FileText,
      label: "Claims",
      description: "Manage and review R&D tax claims",
      href: "/staff/claims",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Users,
      label: "CIF / Prospects",
      description: "Client Information Forms and prospects pipeline",
      href: "/staff/cif",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Building2,
      label: "Clients",
      description: "View and manage client organisations",
      href: "/staff/clients",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Settings,
      label: "Admin",
      description: "System administration and settings",
      href: "/staff/admin",
      color: "from-orange-500 to-red-500"
    }
  ];

  const stats = [
    { icon: TrendingUp, label: "Active Claims", value: "—", color: "text-blue-600 bg-blue-50" },
    { icon: Clock, label: "Pending Reviews", value: "—", color: "text-yellow-600 bg-yellow-50" },
    { icon: CheckCircle2, label: "Completed This Month", value: "—", color: "text-green-600 bg-green-50" },
    { icon: AlertCircle, label: "Requires Attention", value: "—", color: "text-red-600 bg-red-50" }
  ];

  return (
    <>
      <SEO
        title="Staff Home - RD Sidekick"
        description="Staff portal for managing R&D tax claims and client information"
      />
      <StaffLayout>
        <div className="p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900">
                Welcome back, {profileWithOrg?.full_name?.split(" ")[0] || "Staff"}
              </h1>
              <Badge className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white border-0">
                {getInternalRoleDisplayName(profileWithOrg?.internal_role || null)}
              </Badge>
            </div>
            <p className="text-slate-600">
              {profileWithOrg?.organisation_code && (
                <span className="font-medium">{profileWithOrg.organisation_code}</span>
              )}
              {profileWithOrg?.organisation_code && profileWithOrg?.organisation_name && " • "}
              {profileWithOrg?.organisation_name}
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="p-6 border-2 border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <Card
                  key={index}
                  className="p-6 border-2 border-slate-100 hover:border-slate-200 cursor-pointer group transition-all hover:shadow-lg"
                  onClick={() => router.push(action.href)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#ff6b35] transition-colors">
                        {action.label}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-[#ff6b35]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Staff Portal - In Development</h3>
                <p className="text-slate-700 leading-relaxed">
                  This is the new staff-only area for RD TAX and RD MANDE team members. 
                  Additional features including claims management, CIF processing, client administration, 
                  and reporting dashboards will be added in upcoming updates.
                </p>
                <p className="text-sm text-slate-600 mt-3">
                  Your role: <strong>{getInternalRoleDisplayName(profileWithOrg?.internal_role || null)}</strong>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </StaffLayout>
    </>
  );
}