import React, { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, ArrowLeft, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    setNeedsConfirmation(false);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) {
        // Check if it's an email confirmation error
        if (loginError.message.toLowerCase().includes("email not confirmed") || 
            loginError.message.toLowerCase().includes("confirm")) {
          setNeedsConfirmation(true);
          setError("Please check your email and confirm your account before logging in.");
        } else {
          throw loginError;
        }
        return;
      }

      if (!data.user) throw new Error("Failed to log in");

      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email
      });

      if (error) throw error;

      setError("");
      alert("Confirmation email sent! Please check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to resend confirmation email");
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
          onClick={() => router.push("/")}
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
            <h1 className="text-3xl font-bold text-rd-navy">Welcome back</h1>
            <p className="text-slate-600">Log in to RD Sidekick</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email && password && !loading) {
                    handleLogin();
                  }
                }}
                disabled={loading}
                className="h-12 rounded-xl border-slate-300"
              />
            </div>

            <Button
              className="w-full h-14 text-lg font-semibold bg-rd-orange hover:bg-[#E67510] rounded-xl shadow-lg mt-6"
              onClick={handleLogin}
              disabled={!email || !password || loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Log In
            </Button>
          </div>

          {error && (
            <Alert variant={needsConfirmation ? "default" : "destructive"} className="rounded-xl">
              {needsConfirmation ? <Mail className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>
                {error}
                {needsConfirmation && (
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold text-rd-orange ml-2"
                    onClick={handleResendConfirmation}
                    disabled={loading}
                  >
                    Resend confirmation email
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {needsConfirmation && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">📧 Email Confirmation Required</p>
              <p>
                For your security, you need to verify your email address before logging in. 
                Check your inbox for the confirmation email or click the button above to resend it.
              </p>
              <p className="mt-2 text-xs text-blue-600">
                <strong>Admin Note:</strong> To disable email confirmation for internal users, 
                go to Database → Users → Auth Settings → Email and turn off "Confirm email".
              </p>
            </div>
          )}

          <div className="text-center text-sm">
            <span className="text-slate-600">New to RD Sidekick? </span>
            <Link href="/auth/signup" className="text-rd-orange font-semibold hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}