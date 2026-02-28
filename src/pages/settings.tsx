import React, { useState } from "react";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LogOut, Building2, Phone, Mail, Moon, Sun, ArrowLeft, User } from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const { user, currentOrg, organisations, setCurrentOrg } = useApp();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#020617] border-b border-slate-800 safe-top">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            className="rounded-full w-9 h-9 sm:w-10 sm:h-10 p-0 -ml-1 sm:-ml-2 flex-shrink-0 text-slate-200 hover:bg-slate-800"
            onClick={() => router.push("/home")}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-50 truncate">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Profile Section */}
        <Card className="evidence-card bg-[#050b16] border border-slate-800 text-slate-100 shadow-professional-md">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-50">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-14 w-14 sm:h-16 sm:w-16 bg-slate-900 flex-shrink-0">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="text-base sm:text-lg font-bold text-white bg-rd-navy">
                  {getInitials(user.user_metadata?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base sm:text-lg text-slate-50 truncate">
                  {user.user_metadata?.full_name || "User"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 truncate">{user.email || user.phone}</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-800">
              {user.email && (
                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-900/60 rounded-xl">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-[#ff6b35]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs sm:text-xs font-medium text-slate-400">Email</p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">{user.email}</p>
                  </div>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-900/60 rounded-xl">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-[#ff6b35]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs sm:text-xs font-medium text-slate-500">Phone</p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">{user.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organisation Section */}
        <Card className="evidence-card bg-[#050b16] border border-slate-800 text-slate-100 shadow-professional-md">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-50">Organisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base sm:text-lg truncate">{currentOrg?.name || "No Organisation"}</p>
                <p className="text-xs text-white/80 capitalize truncate">{currentOrg?.role} Role</p>
              </div>
            </div>

            {organisations.length > 1 && (
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-slate-200 font-semibold text-xs sm:text-sm">Switch Organisation</Label>
                <div className="grid gap-2">
                  {organisations.map((org) => (
                    <Button
                      key={org.id}
                      variant={currentOrg?.id === org.id ? "default" : "outline"}
                      className={`w-full justify-start h-11 sm:h-12 rounded-xl font-semibold text-xs sm:text-sm ${
                        currentOrg?.id === org.id 
                          ? "bg-[#ff6b35] hover:bg-[#ff8c42] text-slate-950 border-transparent" 
                          : "border-slate-700 text-slate-100 hover:bg-slate-900"
                      }`}
                      onClick={() => setCurrentOrg(org)}
                    >
                      <Building2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span className="truncate">{org.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card className="evidence-card bg-[#050b16] border border-slate-800 text-slate-100 shadow-professional-md">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-50">App Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-900/60 rounded-xl">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-rd-navy" />
                  ) : (
                    <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-rd-orange" />
                  )}
                </div>
                <Label className="text-slate-200 font-semibold text-xs sm:text-sm truncate">Dark Mode</Label>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                className="flex-shrink-0"
              />
            </div>

            <div className="pt-3 sm:pt-4 border-t border-slate-800">
              <Button 
                variant="destructive" 
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-xl shadow-lg" 
                onClick={handleLogout}
                disabled={loading}
              >
                <LogOut className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                {loading ? "Logging out..." : "Log Out"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-500 py-3 sm:py-4">
          RD Companion v1.0.0
        </div>
      </div>
    </div>
  );
}