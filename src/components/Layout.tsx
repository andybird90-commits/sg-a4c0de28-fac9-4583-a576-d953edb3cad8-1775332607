import React from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Menu, Building2, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showOrgSelector?: boolean;
}

export function Layout({ children, title, showOrgSelector = true }: LayoutProps) {
  const { currentOrg, organisations, setCurrentOrg, user } = useApp();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-2">
                  <Link href="/home">
                    <Button variant="ghost" className="w-full justify-start">
                      Home
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="ghost" className="w-full justify-start">
                      Settings
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start text-red-600" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {title || "RD Sidekick"}
              </h1>
              {showOrgSelector && currentOrg && (
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {currentOrg.name}
                </p>
              )}
            </div>
          </div>

          {showOrgSelector && organisations.length > 1 && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  Switch Org
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Switch Organisation</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-2">
                  {organisations.map((org) => (
                    <Button
                      key={org.id}
                      variant={currentOrg?.id === org.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setCurrentOrg(org);
                        router.push("/home");
                      }}
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      <div className="text-left">
                        <div>{org.name}</div>
                        <div className="text-xs opacity-70">{org.role}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}