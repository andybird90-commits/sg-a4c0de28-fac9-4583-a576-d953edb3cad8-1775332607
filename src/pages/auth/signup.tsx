import React, { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { organisationService } from "@/services/organisationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setLoading(true);
    setError("");

    try {
      const org = await organisationService.getOrganisationByCode(orgCode);
      if (!org) {
        throw new Error("Invalid organisation code");
      }

      if (method === "email") {
        const { error } = await supabase.auth.signInWithOtp({ 
          email,
          options: {
            data: {
              full_name: name,
              org_code: orgCode
            }
          }
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ 
          phone,
          options: {
            data: {
              full_name: name,
              org_code: orgCode
            }
          }
        });
        if (error) throw error;
      }
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError("");

    try {
      let userId: string;
      
      if (method === "email") {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email"
        });
        if (error) throw error;
        userId = data.user!.id;
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token: otp,
          type: "sms"
        });
        if (error) throw error;
        userId = data.user!.id;
      }

      await supabase.from("profiles").upsert({
        id: userId,
        full_name: name,
        email: method === "email" ? email : null,
        phone: method === "phone" ? phone : null
      });

      const org = await organisationService.getOrganisationByCode(orgCode);
      if (org) {
        await organisationService.joinOrganisation(org.id, "client");
      }

      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Failed to complete signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Join RD Sidekick</CardTitle>
          <CardDescription>Sign up to start capturing evidence</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "input" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="orgCode">Organisation Code</Label>
                <Input
                  id="orgCode"
                  type="text"
                  placeholder="Enter your organisation code"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                  disabled={loading}
                />
              </div>

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
                </TabsContent>
              </Tabs>

              <Button
                className="w-full"
                onClick={handleSignup}
                disabled={!name || !orgCode || (method === "email" ? !email : !phone) || loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Verification Code
              </Button>
            </div>
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
                Verify & Sign Up
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
            <span className="text-slate-600 dark:text-slate-400">Already have an account? </span>
            <Link href="/auth/login" className="text-blue-600 hover:underline dark:text-blue-400">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}