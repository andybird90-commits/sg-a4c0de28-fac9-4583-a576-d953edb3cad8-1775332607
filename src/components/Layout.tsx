import React from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Menu, Building2, LogOut, Home, Settings, Camera } from "lucide-react";
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
import { OfflineIndicator } from "./OfflineIndicator";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showOrgSelector?: boolean;
  showHeader?: boolean;
}

export function Layout({ children, title, showOrgSelector = true, showHeader = true }: LayoutProps) {
  const { currentOrg, organisations, setCurrentOrg, user } = useApp();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (!showHeader) {
    return (
      <>
        <OfflineIndicator />
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <OfflineIndicator />
      
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm safe-top">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-rd-navy">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-rd-navy text-xl font-bold">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2">
                  <Link href="/home">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-100">
                      <Home className="mr-3 h-5 w-5" />
                      Home
                    </Button>
                  </Link>
                  <Link href="/evidence/capture">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-100">
                      <Camera className="mr-3 h-5 w-5" />
                      Add Evidence
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-100">
                      <Settings className="mr-3 h-5 w-5" />
                      Settings
                    </Button>
                  </Link>
                  
                  <div className="my-4 border-t border-slate-200" />
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" 
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Log Out
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="text-lg font-bold text-rd-navy">
                {title || "RD Sidekick"}
              </h1>
              {showOrgSelector && currentOrg && (
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {currentOrg.name}
                </p>
              )}
            </div>
          </div>

          {showOrgSelector && organisations.length > 1 && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="border-rd-navy text-rd-navy hover:bg-rd-navy hover:text-white">
                  Switch Org
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-rd-navy text-xl font-bold">Switch Organisation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3">
                  {organisations.map((org) => (
                    <Button
                      key={org.id}
                      variant={currentOrg?.id === org.id ? "default" : "outline"}
                      className={`w-full justify-start h-auto py-4 px-4 ${
                        currentOrg?.id === org.id 
                          ? "bg-rd-navy text-white hover:bg-rd-navy/90" 
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setCurrentOrg(org);
                        router.push("/home");
                      }}
                    >
                      <Building2 className="mr-3 h-5 w-5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-semibold">{org.name}</div>
                        <div className="text-xs opacity-70 capitalize">{org.role}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-safe">
        {children}
      </main>
    </div>
  );
}