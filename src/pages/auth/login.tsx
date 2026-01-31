import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { authService } from "@/services/authService";
import { useNotifications } from "@/contexts/NotificationContext";
import { useApp } from "@/contexts/AppContext";
import { profileService } from "@/services/profileService";
import { isStaff } from "@/lib/auth/roles";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useApp();
  const { notify } = useNotifications();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const validateAndClearSession = async () => {
      try {
        await authService.clearInvalidSession();
      } catch (error) {
        console.error("Error clearing session:", error);
      }
    };

    validateAndClearSession();
  }, []);

  useEffect(() => {
    if (user) {
      router.push("/home");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { user, error } = await authService.signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (user) {
      // Check if user is staff and redirect accordingly
      const profile = await profileService.getCurrentUserProfileWithOrg();
      const staffStatus = isStaff(profile);
      
      if (staffStatus) {
        router.push("/staff");
      } else {
        router.push("/home");
      }
    }
  };

  return (
    <Layout showNav={false}>
      <SEO title="Login - RD Sidekick" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo/Brand Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-professional-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your RD Sidekick account</p>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-professional-lg">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-semibold">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-error/20 bg-error/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 gradient-primary text-white font-medium shadow-professional-md hover:shadow-professional-lg transition-professional"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    onClick={() => router.push("/auth/signup")}
                    className="font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} RD Sidekick. All rights reserved.
          </p>
        </div>
      </div>
    </Layout>
  );
}