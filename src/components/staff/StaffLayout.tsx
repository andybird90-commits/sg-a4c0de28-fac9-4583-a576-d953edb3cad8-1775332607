import React, { useContext } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
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
  X,
  Home,
  Briefcase,
  Shield,
  Archive,
  TrendingUp,
  MessageSquare,
  Bell,
  Database,
  FileCheck,
  Calendar,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface StaffLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function StaffLayout({ children, title }: StaffLayoutProps) {
  const router = useRouter();
  const { user, profileWithOrg, isStaff, loading } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        try {
          const { getUnreadCount } = await import("@/services/messageService");
          const count = await getUnreadCount();
          setUnreadCount(count);
        } catch (error) {
          console.error("Error fetching unread count:", error);
        }
      };

      fetchUnreadCount();

      // Poll every 30 seconds for new messages
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Head>
          <title>{title ? `${title} | RD Companion` : "RD Companion Staff Portal"}</title>
        </Head>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied if not staff
  if (!isStaff || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Head>
          <title>Access Denied | RD Companion</title>
        </Head>
        <div className="max-w-md w-full bg-slate-900/80 rounded-2xl shadow-professional-lg p-8 text-center border border-slate-800">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-50 mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">
            You do not have permission to access the staff area.
          </p>
          <Button
            onClick={() => router.push("/home")}
            className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white hover:from-[#ff814f] hover:to-[#ffa25c]"
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
    {
      path: "/staff",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      path: "/staff/cif",
      label: "Onboarding",
      icon: Briefcase,
    },
    {
      path: "/staff/claims",
      label: "Claims",
      icon: FileText,
    },
    {
      path: "/staff/pipeline",
      label: "Pipeline",
      icon: TrendingUp,
    },
    {
      path: "/staff/clients",
      label: "Clients",
      icon: Users,
    },
    {
      path: "/messages",
      label: "Messages",
      icon: MessageSquare,
    },
    {
      path: "/staff/cif-archive",
      label: "CIF Archive",
      icon: Archive,
    },
    {
      path: "/staff/admin",
      label: "Admin",
      icon: Shield,
    },
    {
      path: "/staff/availability",
      label: "My Availability",
      icon: Calendar,
    },
    {
      path: "/staff/admin/users",
      label: "Admin Users",
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Head>
        <title>{title ? `${title} | RD Companion` : "RD Companion Staff Portal"}</title>
      </Head>
      {/* Top Bar */}
      <header className="bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-900 text-slate-200"
              >
                <Menu className="h-6 w-6" />
              </button>
              <img src="/rdtax-logo.png" alt="RD TAX" className="h-8 w-auto" />
              <div>
                <div className="text-lg font-bold text-slate-50">RD Companion</div>
                <div className="text-xs text-slate-400">Staff Portal</div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-4">
              <Link href="/messages">
                <Button variant="outline" size="sm" className="relative border-slate-700 text-slate-200">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#ff6b35] text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-slate-50">
                  {profileWithOrg?.full_name || user.email}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-100 border-slate-700">
                    {getInternalRoleDisplayName(profileWithOrg?.internal_role || null)}
                  </Badge>
                  {profileWithOrg?.organisation_code && (
                    <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
                      {profileWithOrg.organisation_code}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-300 hover:text-slate-50 hover:bg-slate-900"
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
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-slate-950 border-r border-slate-800 shadow-professional-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/rdtax-logo.png" alt="RD TAX" className="h-8 w-auto" />
                <div>
                  <div className="text-sm font-semibold text-slate-50">RD Companion</div>
                  <div className="text-xs text-slate-400">Staff Portal</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-900 text-slate-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = router.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white"
                        : "text-slate-300 hover:bg-slate-900"
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
        <aside className="hidden lg:block w-64 bg-slate-950 border-r border-slate-800 min-h-screen sticky top-16">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = router.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white"
                      : "text-slate-300 hover:bg-slate-900"
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
        <main className="flex-1 bg-slate-950 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}