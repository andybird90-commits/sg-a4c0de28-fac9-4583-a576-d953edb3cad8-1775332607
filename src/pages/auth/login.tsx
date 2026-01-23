import React, { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2 } from "lucide-react";
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
      setError(err.message || "Failed to send OTP");
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
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">RD Sidekick</CardTitle>
          <CardDescription>Log in to capture R&D evidence</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "input" ? (
            <Tabs value={method} onValueChange={(v) => setMethod(v as "email" | "phone")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSendOTP}
                  disabled={!email || loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send Login Code
                </Button>
              </TabsContent>
              <TabsContent value="phone" className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSendOTP}
                  disabled={!phone || loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send Login Code
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="otp">Enter Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                  maxLength={6}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleVerifyOTP}
                disabled={!otp || loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify & Log In
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep("input")}
                disabled={loading}
              >
                Back
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">New user? </span>
            <Link href="/auth/signup" className="text-blue-600 hover:underline dark:text-blue-400">
              Sign up with organisation code
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}