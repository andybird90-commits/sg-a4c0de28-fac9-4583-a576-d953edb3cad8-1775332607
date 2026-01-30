import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Camera, Lightbulb, FolderOpen, Layers, Menu, Settings, LogOut, Building2, BarChart3, Users, Shield, FileText } from "lucide-react";
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

  // Check if user is admin
  const isAdmin = user?.email === "andy.bird@rdmande.uk";

  const handleLogout = async () => {
    await authService.signOut();
    router.push("/");
  };

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/evidence/capture", icon: Camera, label: "Capture" },
    { href: "/evidence", icon: Layers, label: "Evidence" },
    { href: "/projects", icon: FolderOpen, label: "Projects" },
    { href: "/feasibility", icon: Lightbulb, label: "Feasibility" },
    { href: "/settings", icon: Settings, label: "Settings" }
  ];

  const adminNavItems = [
    { href: "/admin/organisations", label: "Organisations", icon: Building2 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/sidekick-access", label: "Sidekick Access", icon: Shield },
  ];

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/login", "/auth/signup", "/"];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  // Show loading spinner while checking auth or fetching organisations
  if (organisationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              {user && (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                    <SheetHeader>
                      <SheetTitle className="text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            RD
                          </div>
                          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            RD Sidekick
                          </span>
                        </div>
                      </SheetTitle>
                    </SheetHeader>

                    <nav className="mt-8 space-y-2">
                      {/* Main Navigation */}
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + "/");
                        return (
                          <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                            <Button
                              variant={isActive ? "default" : "ghost"}
                              className="w-full justify-start gap-3"
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </Button>
                          </Link>
                        );
                      })}

                      {/* Admin Navigation */}
                      {isAdmin && (
                        <>
                          <div className="pt-4 pb-2">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3">
                              Admin
                            </p>
                          </div>
                          {adminNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + "/");
                            return (
                              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                                <Button
                                  variant={isActive ? "default" : "ghost"}
                                  className="w-full justify-start gap-3"
                                >
                                  <Icon className="h-4 w-4" />
                                  {item.label}
                                </Button>
                              </Link>
                            );
                          })}
                        </>
                      )}

                      {/* Organisation Info */}
                      {currentOrg && (
                        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                          <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Organisation
                            </p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                              {currentOrg.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Logout Button */}
                      <div className="pt-4">
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
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

              {/* Logo - Passive (no link) */}
              <div className="flex items-center gap-2 cursor-default">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  RD
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden sm:block">
                  RD Sidekick
                </span>
              </div>
            </div>

            {/* Desktop Logout Button */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden lg:flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 pb-20">
        {children}
      </main>

      {showNav && user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
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
                        ? "text-[#FF6B35]"
                        : "text-gray-600 hover:text-[#001F3F]"
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
    </div>
  );
}