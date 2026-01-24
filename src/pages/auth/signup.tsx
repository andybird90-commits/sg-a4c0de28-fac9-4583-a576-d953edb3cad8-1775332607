import React, { useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, User, Mail, Lock, Building2, CheckCircle, ArrowRight } from "lucide-react";
import { authService } from "@/services/authService";
import { organisationService } from "@/services/organisationService";
import { useNotifications } from "@/contexts/NotificationContext";

export default function SignupPage() {
  const router = useRouter();
  const { notify } = useNotifications();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    orgCode: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);

  const validateOrgCode = async (code: string) => {
    if (code.length !== 8) {
      setCodeValid(null);
      return;
    }

    setValidatingCode(true);
    try {
      const org = await organisationService.getOrganisationByCode(code);
      setCodeValid(org !== null && org.sidekick_enabled === true);
    } catch (error) {
      setCodeValid(false);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleOrgCodeChange = (value: string) => {
    const cleanCode = value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 8);
    setFormData({ ...formData, orgCode: cleanCode });
    validateOrgCode(cleanCode);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!codeValid) {
      setError("Please enter a valid organisation code");
      return;
    }

    setLoading(true);

    try {
      const org = await organisationService.getOrganisationByCode(formData.orgCode);
      
      if (!org) {
        throw new Error("Organisation not found");
      }

      if (!org.sidekick_enabled) {
        throw new Error("RD Sidekick is not enabled for this organisation");
      }

      await authService.signUp(
        formData.email,
        formData.password,
        formData.fullName
      );

      await organisationService.joinOrganisation(org.id, "client");

      notify({
        type: "success",
        title: "Account created!",
        message: "Welcome to RD Sidekick"
      });

      router.push("/home");
    } catch (error: any) {
      setError(error.message || "Failed to create account");
      notify({
        type: "error",
        title: "Signup failed",
        message: error.message || "Could not create account"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showNav={false}>
      <SEO title="Sign Up - RD Sidekick" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo/Brand Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-professional-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Account</h1>
            <p className="text-muted-foreground">Join your organisation on RD Sidekick</p>
          </div>

          {/* Signup Card */}
          <Card className="border-0 shadow-professional-lg">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-semibold">Sign Up</CardTitle>
              <CardDescription>Create your account to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="border-error/20 bg-error/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Smith"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgCode" className="text-sm font-medium">Organisation Code</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="orgCode"
                      type="text"
                      placeholder="8-letter code"
                      value={formData.orgCode}
                      onChange={(e) => handleOrgCodeChange(e.target.value)}
                      required
                      maxLength={8}
                      className={`pl-10 pr-10 h-11 border-slate-200 focus:border-primary focus:ring-primary uppercase tracking-wider font-mono ${
                        codeValid === true ? "border-success" : codeValid === false ? "border-error" : ""
                      }`}
                    />
                    {validatingCode && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!validatingCode && codeValid === true && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                    )}
                    {!validatingCode && codeValid === false && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-error" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the 8-letter code provided by your organisation
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !codeValid}
                  className="w-full h-11 gradient-primary text-white font-medium shadow-professional-md hover:shadow-professional-lg transition-professional"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Sign in
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