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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 safe-top">
        <div className="px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            className="rounded-full w-10 h-10 p-0 -ml-2"
            onClick={() => router.push("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-rd-navy">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-5">
        {/* Profile Section */}
        <Card className="evidence-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-rd-navy">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 bg-rd-navy">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="text-lg font-bold text-white bg-rd-navy">
                  {getInitials(user.user_metadata?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg text-rd-navy">
                  {user.user_metadata?.full_name || "User"}
                </h3>
                <p className="text-sm text-slate-600">{user.email || user.phone}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200">
              {user.email && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <Mail className="h-5 w-5 text-rd-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500">Email</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{user.email}</p>
                  </div>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <Phone className="h-5 w-5 text-rd-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500">Phone</p>
                    <p className="text-sm font-semibold text-slate-900">{user.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organisation Section */}
        <Card className="evidence-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-rd-navy">Organisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-rd-navy to-[#1a3a5f] rounded-xl text-white">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{currentOrg?.name || "No Organisation"}</p>
                <p className="text-xs text-white/80 capitalize">{currentOrg?.role} Role</p>
              </div>
            </div>

            {organisations.length > 1 && (
              <div className="space-y-3">
                <Label className="text-slate-700 font-semibold">Switch Organisation</Label>
                <div className="grid gap-2">
                  {organisations.map((org) => (
                    <Button
                      key={org.id}
                      variant={currentOrg?.id === org.id ? "default" : "outline"}
                      className={`w-full justify-start h-12 rounded-xl font-semibold ${
                        currentOrg?.id === org.id 
                          ? 'bg-rd-orange hover:bg-[#E67510]' 
                          : 'border-slate-300'
                      }`}
                      onClick={() => setCurrentOrg(org)}
                    >
                      <Building2 className="mr-2 h-5 w-5" />
                      {org.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card className="evidence-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-rd-navy">App Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-rd-navy" />
                  ) : (
                    <Sun className="h-5 w-5 text-rd-orange" />
                  )}
                </div>
                <Label className="text-slate-700 font-semibold">Dark Mode</Label>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Button 
                variant="destructive" 
                className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg" 
                onClick={handleLogout}
                disabled={loading}
              >
                <LogOut className="mr-2 h-5 w-5" />
                {loading ? "Logging out..." : "Log Out"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-400 py-4">
          RD Sidekick v1.0.0
        </div>
      </div>
    </div>
  );
}