import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Camera, Settings, LogOut, Lightbulb, FolderOpen, Layers } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { authService } from "@/services/authService";
import { NotificationToast } from "./NotificationToast";
import { OfflineBanner } from "./OfflineBanner";
import { SyncIndicator } from "./SyncIndicator";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export function Layout({ children, showNav = true }: LayoutProps) {
  const router = useRouter();
  const { user, currentOrg } = useApp();
  const { isOnline, syncingCount } = useOfflineQueue();

  const handleLogout = async () => {
    await authService.signOut();
    router.push("/auth/login");
  };

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/evidence/capture", icon: Camera, label: "Capture" },
    { href: "/evidence", icon: Layers, label: "Evidence" },
    { href: "/projects", icon: FolderOpen, label: "Projects" },
    { href: "/feasibility", icon: Lightbulb, label: "Feasibility" },
    { href: "/settings", icon: Settings, label: "Settings" }
  ];


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <OfflineBanner isOnline={isOnline} />
      
      {showNav && user &&
      <header className="bg-[#001F3F] text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                




                {currentOrg &&
              <div className="border-l border-white/20 pl-3">
                    <p className="text-sm font-medium">{currentOrg.name}</p>
                    <p className="text-xs text-slate-300">RD Sidekick</p>
                  </div>
              }
              </div>
              <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Log out">

                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>
      }

      <main className="flex-1 pb-20">
        {children}
      </main>

      {showNav && user &&
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
                  isActive ?
                  "text-[#FF6B35]" :
                  "text-gray-600 hover:text-[#001F3F]"}`
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
    </div>);

}