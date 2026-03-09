import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Shield,
  Archive,
  TrendingUp,
  MessageSquare,
  Bell,
  Calendar,
  LogOut,
  Menu,
  X,
  Book } from
"lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInternalRoleDisplayName } from "@/lib/auth/roles";
import { authService } from "@/services/authService";

interface StaffLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function StaffLayout({ children, title }: StaffLayoutProps) {
  const router = useRouter();
  const { user, profileWithOrg, isStaff, loading } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const staffNavItems = [
  {
    path: "/staff",
    label: "Dashboard",
    icon: LayoutDashboard
  },
  {
    path: "/staff/cif",
    label: "Onboarding",
    icon: Briefcase
  },
  {
    path: "/staff/pre-notifications",
    label: "Pre-notifications",
    icon: FileText
  },
  {
    path: "/staff/claims",
    label: "Claims",
    icon: FileText
  },
  {
    path: "/staff/pipeline",
    label: "Pipeline",
    icon: TrendingUp
  },
  {
    path: "/staff/clients",
    label: "Clients",
    icon: Users
  },
  {
    path: "/messages",
    label: "Messages",
    icon: MessageSquare
  },
  {
    path: "/staff/cif-archive",
    label: "CIF Archive",
    icon: Archive
  },
  {
    path: "/staff/admin",
    label: "Admin",
    icon: Shield
  },
  {
    path: "/staff/availability",
    label: "My Availability",
    icon: Calendar
  },
  {
    path: "/staff/academy",
    label: "RD Agent Academy",
    icon: Book
  },
  {
    path: "/staff/admin/users",
    label: "Admin Users",
    icon: Users
  }];


  useEffect(() => {
    if (!user) {
      return;
    }

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
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Head>
          <title>{title ? `${title} | RD Companion` : "RD Companion Staff Portal"}</title>
        </Head>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>);

  }

  if (!isStaff || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Head>
          <title>Access Denied | RD Companion</title>
        </Head>
        <div className="max-w-md w-full bg-card rounded-2xl shadow-professional-lg p-8 text-center border border-border">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You do not have permission to access the staff area.
          </p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => router.push("/home")}>
            Return to Dashboard
          </Button>
        </div>
      </div>);

  }

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/");
  };

  const renderNavItem = (path: string, label: string, Icon: React.ComponentType<{className?: string;}>) => {
    const isRootStaff = path === "/staff";
    const isActive = isRootStaff ?
    router.pathname === "/staff" :
    router.pathname === path || router.pathname.startsWith(`${path}/`);

    return (
      <button
        key={path}
        onClick={() => router.push(path)}
        className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive ?
        "bg-primary text-primary-foreground shadow-professional-md" :
        "text-secondary-foreground/80 hover:bg-secondary/70 hover:text-secondary-foreground"}`
        }>
        
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
          isActive ?
          "border-transparent bg-background/10" :
          "border-border bg-secondary/60 group-hover:border-primary"}`
          }>
          
          <Icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-secondary-foreground"}`} />
        </span>
        <span className="truncate">{label}</span>
      </button>);

  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <Head>
        <title>{title ? `${title} | RD Companion` : "RD Companion Staff Portal"}</title>
      </Head>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-[#0F1D2D] text-secondary-foreground">
        <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted text-secondary-foreground">
              
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              

              
              <div className="hidden sm:block">
                <div className="text-sm font-semibold">RD Companion</div>
                <div className="text-xs text-secondary-foreground/80">Staff Portal</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/messages">
              <Button
                variant="outline"
                size="icon"
                className="relative border-border bg-background text-foreground hover:bg-muted">
                
                <Bell className="h-4 w-4" />
                {unreadCount > 0 &&
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                }
              </Button>
            </Link>

            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-medium">
                {profileWithOrg?.full_name || user.email}
              </span>
              <div className="flex items-center gap-1">
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-background border-border text-foreground">
                  
                  {getInternalRoleDisplayName(profileWithOrg?.internal_role || null)}
                </Badge>
                {profileWithOrg?.organisation_code &&
                <Badge
                  variant="outline"
                  className="text-[10px] border-border text-secondary-foreground/80">
                  
                    {profileWithOrg.organisation_code}
                  </Badge>
                }
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-destructive/70 text-destructive hover:bg-destructive/10 hover:text-destructive">
              
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Layout body */}
      <div className="flex w-full max-w-full overflow-x-hidden">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-border bg-[#0F1D2D] text-secondary-foreground sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="px-3 py-4 space-y-1">
            {staffNavItems.map((item) => renderNavItem(item.path, item.label, item.icon))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-background min-h-[calc(100vh-3.5rem)] overflow-x-hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto space-y-6">{children}</div>
          </div>
        </main>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen &&
      <div
        className="fixed inset-0 z-50 bg-black/60 lg:hidden"
        onClick={() => setMobileMenuOpen(false)}>
        
          <div
          className="absolute left-0 top-0 bottom-0 w-72 bg-[#0F1D2D] text-secondary-foreground border-r border-border shadow-professional-md"
          onClick={(e) => e.stopPropagation()}>
          
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background border border-border">
                  <img src="/rdtax-logo.png" alt="RD TAX" className="h-6 w-auto" />
                </div>
                <div>
                  <div className="text-sm font-semibold">RD Companion</div>
                  <div className="text-xs text-secondary-foreground/80">Staff Portal</div>
                </div>
              </div>
              <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-muted text-secondary-foreground">
              
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-3 py-4 space-y-1">
              {staffNavItems.map((item) =>
            <div
              key={item.path}
              onClick={() => {
                router.push(item.path);
                setMobileMenuOpen(false);
              }}>
              
                  {renderNavItem(item.path, item.label, item.icon)}
                </div>
            )}
            </div>

            <div className="mt-auto px-4 py-4 border-t border-border">
              <div className="mb-3">
                <div className="text-xs font-medium">
                  {profileWithOrg?.full_name || user.email}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Badge
                  variant="secondary"
                  className="text-[10px] bg-background border-border text-foreground">
                  
                    {getInternalRoleDisplayName(profileWithOrg?.internal_role || null)}
                  </Badge>
                  {profileWithOrg?.organisation_code &&
                <Badge
                  variant="outline"
                  className="text-[10px] border-border text-secondary-foreground/80">
                  
                      {profileWithOrg.organisation_code}
                    </Badge>
                }
                </div>
              </div>

              <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
              className="w-full justify-center border-destructive/70 text-destructive hover:bg-destructive/10 hover:text-destructive">
              
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      }
    </div>);

}