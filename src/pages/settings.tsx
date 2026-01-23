import React, { useState } from "react";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LogOut, User, Building2, Phone, Mail, Moon, Sun } from "lucide-react";
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
    router.push("/auth/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  if (!user) return null;

  return (
    <Layout title="Settings">
      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="text-lg">
                  {getInitials(user.user_metadata?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-lg">{user.user_metadata?.full_name || "User"}</h3>
                <p className="text-sm text-slate-500">{user.email || user.phone}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{user.email || "No email provided"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <Phone className="h-4 w-4" />
                <span className="text-sm">{user.phone || "No phone provided"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organisation Section */}
        <Card>
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
            <CardDescription>Manage your workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">{currentOrg?.name || "No Organisation"}</p>
                  <p className="text-xs text-slate-500 capitalize">{currentOrg?.role} Role</p>
                </div>
              </div>
            </div>

            {organisations.length > 1 && (
              <div className="space-y-2">
                <Label>Switch Organisation</Label>
                <div className="grid gap-2">
                  {organisations.map((org) => (
                    <Button
                      key={org.id}
                      variant={currentOrg?.id === org.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setCurrentOrg(org)}
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      {org.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle>App Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <Label>Dark Mode</Label>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>

            <div className="pt-4 border-t">
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleLogout}
                disabled={loading}
              >
                {loading ? "Logging out..." : "Log Out"}
                <LogOut className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-400">
          RD Sidekick v1.0.0
        </div>
      </div>
    </Layout>
  );
}