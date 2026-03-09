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

export default function LoginPage() {
  const router = useRouter();
  const { user, isStaff, loading: appLoading } = useApp();
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
    if (!appLoading) {
      setLoading(false);
    }
  }, [appLoading]);

  useEffect(() => {
    if (!appLoading && user) {
      if (isStaff) {
        router.push("/staff");
      } else {
        router.push("/home");
      }
    }
  }, [user, isStaff, appLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { user: signedInUser, error: signInError } = await authService.signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!signedInUser) {
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Layout showNav={false}>
      <SEO title="Login - RD Companion" />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 mb-4 shadow-professional-lg">
              <svg className="w-8 h-8 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your RD Companion account</p>
          </div>

          <Card className="border border-border bg-card shadow-professional-lg">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-semibold text-foreground">Sign In</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {error &&
                <Alert variant="destructive" className="border-error/20 bg-error/10 text-error-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                }

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-11 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-orange-500 focus:ring-orange-500"
                    />
                    
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-11 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-orange-500 focus:ring-orange-500"
                    />
                    
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 gradient-primary text-slate-950 font-medium shadow-professional-md hover:shadow-professional-lg transition-professional">
                  
                  {loading ?
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </> :

                  <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  }
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Do not have an account?{" "}
                  <button
                    onClick={() => router.push("/auth/signup")}
                    className="font-medium text-orange-400 hover:text-orange-300 transition-colors">
                    
                    Sign up
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} RD Companion. All rights reserved.
          </p>
        </div>
      </div>
    </Layout>);

}