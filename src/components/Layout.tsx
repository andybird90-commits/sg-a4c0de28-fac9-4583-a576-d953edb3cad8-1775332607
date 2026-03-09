import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Bell,
  Camera,
  FolderOpen,
  Home,
  Layers,
  Lightbulb,
  Menu,
  MessageSquare,
  Settings,
  X,
  Building2,
  LogOut,
} from "lucide-react";

import { useApp } from "@/contexts/AppContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationToast } from "@/components/NotificationToast";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SyncIndicator } from "@/components/SyncIndicator";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export function Layout({ children, showNav = true }: LayoutProps) {
  const router = useRouter();
  const { user, currentOrg } = useApp();
  const isMobile = useIsMobile();
  const { isOnline, syncingCount } = useOfflineQueue();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems: NavItem[] = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/evidence/capture", label: "Capture", icon: Camera },
    { href: "/evidence", label: "Evidence", icon: Layers },
    { href: "/projects", label: "Projects", icon: FolderOpen },
    { href: "/feasibility", label: "Feasibility", icon: Lightbulb },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const { getUnreadCount } = await import("@/services/messageService");
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error("Error fetching unread message count", error);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  const handleLogout = async () => {
    await authService.signOut();
    router.push("/auth/login");
  };

  const isActive = (href: string): boolean => {
    if (href === "/home") {
      return router.pathname === "/home" || router.pathname === "/";
    }
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  if (!showNav) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
        <main className="flex-1 bg-background">
          <div className="px-4 py-6 lg:px-8">{children}</div>
        </main>
        <SyncIndicator count={syncingCount} />
        <NotificationToast />
        <OfflineBanner isOnline={isOnline} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-background text-foreground flex flex-col">
      {/* Header – aligned with staff style */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-[#0F1D2D] text-slate-100">
        <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user && (
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-100"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-auto items-center">
                <span className="text-xl font-extrabold tracking-tight leading-none">
                  <span className="text-white">RD</span>{" "}
                  <span className="text-[#f97316]">TAX</span>
                </span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-medium uppercase text-slate-400">
                  RD Companion
                </span>
                <span className="text-sm font-semibold">
                  {currentOrg?.name ?? "Client workspace"}
                </span>
              </div>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-[#0B1725]"
                onClick={() => router.push("/messages")}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#f97316] text-[10px] font-semibold text-white px-[3px]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-red-400/70 text-red-400 hover:bg-red-500/10 hover:text-red-200 hidden sm:inline-flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Body layout – fixed sidebar, scrolling main (like staff) */}
      <div className="flex w-full max-w-full flex-1 overflow-hidden h-[calc(100vh-3.5rem)]">
        {/* Sidebar – desktop only */}
        {user && (
          <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-slate-800 bg-[#071a2e] text-slate-100 fixed top-14 bottom-0 left-0 overflow-y-auto">
            <div className="px-4 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={`group flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#f97316] text-white shadow-sm"
                        : "text-slate-100 hover:bg-slate-800/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                    {item.href === "/messages" && unreadCount > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/90 px-1 text-[11px] font-semibold leading-none text-[#071a2e]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Divider line kept in nav */}
              <div className="my-3 border-t border-slate-800" />

              {/* Organisation + logout directly under Settings */}
              {currentOrg && (
                <div className="flex items-start gap-2 px-1 py-2">
                  <Building2 className="h-4 w-4 mt-[2px] text-slate-300" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Organisation
                    </p>
                    <p className="text-sm font-semibold text-slate-50 truncate">
                      {currentOrg.name}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-slate-800/80 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        )}

        {/* Main content – scrolls within, offset for sidebar on desktop */}
        <main className="flex-1 bg-background overflow-x-hidden overflow-y-auto lg:ml-64">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto">{children}</div>
          </div>
        </main>
      </div>

      {/* Mobile slide-out navigation */}
      {user && isMobile && mobileNavOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
          <div className="absolute inset-y-0 left-0 w-72 bg-[#071a2e] text-slate-100 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-900">
              <span className="text-sm font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-100"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      router.push(item.href);
                      setMobileNavOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#f97316] text-white shadow-sm"
                        : "text-slate-100 hover:bg-slate-800/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                    {item.href === "/messages" && unreadCount > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/90 px-1 text-[11px] font-semibold leading-none text-[#071a2e]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="my-3 border-t border-slate-800" />

              {currentOrg && (
                <div className="flex items-start gap-2 px-1 py-2">
                  <Building2 className="h-4 w-4 mt-[2px] text-slate-300" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Organisation
                    </p>
                    <p className="text-sm font-semibold text-slate-50 truncate">
                      {currentOrg.name}
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="mt-1 w-full justify-center gap-2 border-slate-700 text-slate-100 hover:bg-slate-800/80"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </nav>
          </div>
        </div>
      )}

      <SyncIndicator count={syncingCount} />
      <NotificationToast />
      <OfflineBanner isOnline={isOnline} />
    </div>
  );
}