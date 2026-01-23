import React, { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async () => {
    setLoading(true);
    setError("");

    try {
      if (method === "email") {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      }
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send login code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError("");

    try {
      if (method === "email") {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email"
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.verifyOtp({
          phone,
          token: otp,
          type: "sms"
        });
        if (error) throw error;
      }
      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Invalid login code");
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
            <h1 className="text-3xl font-bold text-rd-navy">Welcome back</h1>
            <p className="text-slate-600">Log in to RD Sidekick</p>
          </div>

          {step === "input" ? (
            <div className="space-y-6">
              <Tabs value={method} onValueChange={(v) => setMethod(v as "email" | "phone")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 rounded-xl p-1">
                  <TabsTrigger value="email" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Email</TabsTrigger>
                  <TabsTrigger value="phone" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Phone</TabsTrigger>
                </TabsList>
                
                <TabsContent value="email" className="space-y-4 mt-6">
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
                </TabsContent>
                
                <TabsContent value="phone" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+44 7700 900000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                      className="h-12 rounded-xl border-slate-300"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                className="w-full h-14 text-lg font-semibold bg-rd-orange hover:bg-[#E67510] rounded-xl shadow-lg"
                onClick={handleSendOTP}
                disabled={!email && !phone || loading}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Send Login Code
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-700 font-medium">Enter 6-Digit Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={loading}
                  maxLength={6}
                  className="h-14 rounded-xl border-slate-300 text-center text-2xl tracking-widest font-semibold"
                />
              </div>
              
              <Button
                className="w-full h-14 text-lg font-semibold bg-rd-orange hover:bg-[#E67510] rounded-xl shadow-lg"
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6 || loading}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Verify & Log In
              </Button>
              
              <Button
                variant="ghost"
                className="w-full h-12 text-slate-600 rounded-xl"
                onClick={() => setStep("input")}
                disabled={loading}
              >
                Back
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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