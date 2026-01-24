import React, { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { organisationService } from "@/services/organisationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setLoading(true);
    setError("");

    try {
      // Trim and validate organisation code format
      const trimmedCode = orgCode.trim().toLowerCase();
      
      if (trimmedCode.length !== 8) {
        throw new Error("Organisation code must be exactly 8 characters");
      }

      // Validate organisation code exists
      const org = await organisationService.getOrganisationByCode(trimmedCode);
      
      if (!org) {
        throw new Error("Invalid organisation code. Please check with your administrator.");
      }

      if (!org.sidekick_enabled) {
        throw new Error("RD Sidekick access is not enabled for this organisation");
      }

      // Generate email from username if not an email
      const email = username.includes("@") ? username : `${username.toLowerCase().replace(/\s+/g, ".")}@temp.local`;

      // Create user account
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email,
        password,
        options: {
          data: {
            full_name: username,
            org_code: trimmedCode
          }
        }
      });

      if (signupError) throw signupError;
      if (!data.user) throw new Error("Failed to create user account");

      // Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: username,
        email: email
      });

      if (profileError) throw profileError;

      // Join organisation
      await organisationService.joinOrganisation(org.id, "client");

      // Redirect to home
      router.push("/home");
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 safe-top">
        <Button
          variant="ghost"
          className="rounded-full w-10 h-10 p-0"
          onClick={() => router.push("/onboarding")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="/rdtax-logo.png"
              alt="RD TAX Logo"
              className="h-24 w-auto object-contain"
            />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-rd-navy">Join RD Sidekick</h1>
            <p className="text-slate-600">Start capturing R&D evidence</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Your name or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="h-12 rounded-xl border-slate-300"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-12 rounded-xl border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgCode" className="text-slate-700 font-medium">Organisation Code</Label>
              <Input
                id="orgCode"
                type="text"
                placeholder="8-letter code"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toLowerCase())}
                disabled={loading}
                maxLength={8}
                className="h-12 rounded-xl border-slate-300 lowercase tracking-wider font-semibold"
              />
              <p className="text-xs text-slate-500">Ask your administrator for your organisation code</p>
            </div>

            <Button
              className="w-full h-14 text-lg font-semibold bg-rd-orange hover:bg-[#E67510] rounded-xl shadow-lg mt-6"
              onClick={handleSignup}
              disabled={!username || !password || orgCode.length !== 8 || loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Sign Up
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center text-sm">
            <span className="text-slate-600">Already have an account? </span>
            <Link href="/auth/login" className="text-rd-orange font-semibold hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}