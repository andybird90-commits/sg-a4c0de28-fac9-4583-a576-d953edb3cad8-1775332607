import React from "react";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInternalRoleDisplayName } from "@/lib/auth/roles";
import { authService } from "@/services/authService";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

interface StaffLayoutProps {
  children: React.ReactNode;
}

export function StaffLayout({ children }: StaffLayoutProps) {
  const router = useRouter();
  const { user, profileWithOrg, isStaff, loading } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied if not staff
  if (!isStaff || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">
            You do not have permission to access the staff area.
          </p>
          <Button
            onClick={() => router.push("/home")}
            className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/staff" },
    { icon: FileText, label: "Claims", href: "/staff/claims" },
    { icon: Users, label: "CIF / Prospects", href: "/staff/cif" },
    { icon: Building2, label: "Clients", href: "/staff/clients" },
    { icon: Settings, label: "Admin", href: "/staff/admin" }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              >
                <Menu className="h-6 w-6 text-slate-700" />
              </button>
              <img src="/rdtax-logo.png" alt="RD TAX" className="h-8 w-auto" />
              <div>
                <div className="text-lg font-bold text-slate-900">RD Sidekick</div>
                <div className="text-xs text-slate-500">Staff Portal</div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-slate-900">
                  {profileWithOrg?.full_name || user.email}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Badge variant="secondary" className="text-xs">
                    {getInternalRoleDisplayName(profileWithOrg?.internal_role || null)}
                  </Badge>
                  {profileWithOrg?.organisation_code && (
                    <Badge variant="outline" className="text-xs">
                      {profileWithOrg.organisation_code}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-600 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="h-6 w-6 text-slate-700" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 min-h-screen sticky top-16">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}