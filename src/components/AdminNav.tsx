import React from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  BarChart3, 
  FileText,
  Settings,
  Shield,
  ArrowLeft
} from "lucide-react";

export function AdminNav() {
  const router = useRouter();
  
  const navItems = [
    { 
      label: "Dashboard", 
      icon: LayoutDashboard, 
      path: "/home",
      color: "text-blue-600 bg-blue-50 hover:bg-blue-100"
    },
    { 
      label: "Users", 
      icon: Users, 
      path: "/admin/users",
      color: "text-purple-600 bg-purple-50 hover:bg-purple-100"
    },
    { 
      label: "Organisations", 
      icon: Building2, 
      path: "/admin/organisations",
      color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
    },
    { 
      label: "Analytics", 
      icon: BarChart3, 
      path: "/admin/analytics",
      color: "text-blue-600 bg-blue-50 hover:bg-blue-100"
    },
    { 
      label: "Sidekick Access", 
      icon: Shield, 
      path: "/admin/sidekick-access",
      color: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
    },
  ];

  const isActive = (path: string) => router.pathname === path;

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-8">
      <div className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="ghost"
            onClick={() => router.push("/home")}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="h-8 w-px bg-slate-200" />
          
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Button
                  key={item.path}
                  variant={active ? "default" : "ghost"}
                  onClick={() => router.push(item.path)}
                  className={`${
                    active 
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}