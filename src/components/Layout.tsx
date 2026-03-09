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
  Bell } from
"lucide-react";
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
  { href: "/settings", icon: Settings, label: "Settings" }];


  const publicRoutes = ["/auth/login", "/auth/signup", "/"];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  if (organisationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-[#0F1D2D] text-secondary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user &&
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-secondary-foreground hover:bg-secondary/70">
                  
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                side="left"
                className="w-[280px] sm:w-[320px] bg-[#0F1D2D] text-secondary-foreground border-r border-border">
                
                  <SheetHeader>
                    <SheetTitle className="text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center text-secondary-foreground font-bold text-sm border border-border">
                          RD
                        </div>
                        <span className="font-bold text-lg">RD Companion</span>
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
                          isActive ?
                          "bg-primary text-primary-foreground hover:bg-primary/90" :
                          "text-muted-foreground hover:bg-muted"}`
                          }>
                          
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Button>
                        </Link>);

                  })}

                    {currentOrg &&
                  <div className="pt-4 mt-4 border-t border-border">
                        <div className="px-3 py-2 rounded-lg bg-muted">
                          <p className="text-xs font-medium text-muted-foreground">Organisation</p>
                          <p className="text-sm font-semibold">{currentOrg.name}</p>
                        </div>
                      </div>
                  }

                    <div className="pt-4">
                      <Button
                      variant="outline"
                      className="w-full justify-start gap-3 text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}>
                      
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            }

            <div className="flex items-center gap-2 cursor-default">
              <img
                src="/rd_tax_white_wording.png"
                alt="RD TAX"
                className="h-10 sm:h-11 md:h-12 lg:h-[3.25rem] w-auto flex-shrink-0" />
              
              <div className="hidden sm:block">
                
                
              </div>
            </div>
          </div>

          {user &&
          <div className="hidden lg:flex items-center gap-2">
              <Link href="/messages">
                <Button
                variant="outline"
                size="sm"
                className="relative border-border bg-background text-foreground hover:bg-muted">
                
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 &&
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                }
                </Button>
              </Link>
              <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 border-destructive/70 text-destructive hover:bg-destructive/10">
              
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          }
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      {showNav && user &&
      <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-border z-30 hidden md:block">
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
                  isActive ?
                  "text-primary" :
                  "text-muted-foreground hover:text-secondary-foreground"}`
                  }>
                  
                    <Icon size={24} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>);

            })}
            </div>
          </div>
        </nav>
      }

      <SyncIndicator count={syncingCount} />
      <NotificationToast />
      <OfflineBanner isOnline={isOnline} />
    </div>);

}