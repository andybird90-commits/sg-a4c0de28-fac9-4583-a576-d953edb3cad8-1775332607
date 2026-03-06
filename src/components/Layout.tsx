import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Home,
  Camera,
  Lightbulb,
  FolderOpen,
  Layers,
  Menu,
  Settings,
  LogOut,
  Building2,
  MessageSquare,
  Bell,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { authService } from "@/services/authService";
import { NotificationToast } from "./NotificationToast";
import { OfflineBanner } from "./OfflineBanner";
import { SyncIndicator } from "./SyncIndicator";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export function Layout({ children, showNav = true }: LayoutProps) {
  const router = useRouter();
  const { user, currentOrg, organisations, organisationsLoading } = useApp();
  const { isOnline, syncingCount } = useOfflineQueue();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = async () => {
    await authService.signOut();
    router.push("/");
  };

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/evidence/capture", icon: Camera, label: "Capture" },
    { href: "/evidence", icon: Layers, label: "Evidence" },
    { href: "/projects", icon: FolderOpen, label: "Projects" },
    { href: "/feasibility", icon: Lightbulb, label: "Feasibility" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const publicRoutes = ["/auth/login", "/auth/signup", "/"];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  if (organisationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <header className="bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user && (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden text-slate-200 hover:bg-slate-800">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-slate-950 text-slate-100 border-r border-slate-800">
                    <SheetHeader>
                      <SheetTitle className="text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            RD
                          </div>
                          <span className="font-bold text-lg text-slate-50">RD Companion</span>
                        </div>
                      </SheetTitle>
                    </SheetHeader>

                    <nav className="mt-8 space-y-2">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          router.pathname === item.href || router.pathname.startsWith(item.href + "/");
                        return (
                          <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                            <Button
                              variant={isActive ? "default" : "ghost"}
                              className={`w-full justify-start gap-3 ${
                                isActive
                                  ? "bg-orange-500 text-slate-950 hover:bg-orange-400"
                                  : "text-slate-300 hover:bg-slate-900"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </Button>
                          </Link>
                        );
                      })}

                      {currentOrg && (
                        <div className="pt-4 mt-4 border-t border-slate-800">
                          <div className="px-3 py-2 rounded-lg bg-slate-900">
                            <p className="text-xs font-medium text-slate-500">Organisation</p>
                            <p className="text-sm font-semibold text-slate-100 mt-1">{currentOrg.name}</p>
                          </div>
                        </div>
                      )}

                      <div className="pt-4">
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 text-red-400 border-red-900 hover:bg-red-900/40"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleLogout();
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </Button>
                      </div>
                    </nav>
                  </SheetContent>
                </Sheet>
              )}

              <div className="flex items-center gap-2 cursor-default">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm border border-slate-700">
                  RD
                </div>
                <span className="font-bold text-lg text-slate-50 hidden sm:block">RD Companion</span>
              </div>
            </div>

            {user && (
              <div className="hidden lg:flex items-center gap-2">
                <Link href="/messages">
                  <Button variant="outline" size="sm" className="relative border-slate-700 text-slate-200">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-400 border-red-900 hover:bg-red-900/40"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      {showNav && user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 z-30 hidden md:block">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-around py-2">
              {navItems.map((item) => {
                const isActive = router.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                      isActive
                        ? "text-orange-500"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <Icon size={24} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      <SyncIndicator count={syncingCount} />
      <NotificationToast />
      <OfflineBanner isOnline={isOnline} />
    </div>
  );
}