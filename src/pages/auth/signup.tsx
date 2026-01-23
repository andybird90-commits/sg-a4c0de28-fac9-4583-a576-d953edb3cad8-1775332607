import React, { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { organisationService } from "@/services/organisationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
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

      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to complete signup");
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
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-rd-navy">Join RD Sidekick</h1>
            <p className="text-slate-600">Start capturing R&D evidence</p>
          </div>

          {step === "input" ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-medium">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="h-12 rounded-xl border-slate-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orgCode" className="text-slate-700 font-medium">Organisation Code</Label>
                <Input
                  id="orgCode"
                  type="text"
                  placeholder="ABC123"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="h-12 rounded-xl border-slate-300 uppercase tracking-wider font-semibold"
                />
              </div>

              <Tabs value={method} onValueChange={(v) => setMethod(v as "email" | "phone")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 rounded-xl p-1">
                  <TabsTrigger value="email" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Email</TabsTrigger>
                  <TabsTrigger value="phone" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Phone</TabsTrigger>
                </TabsList>
                
                <TabsContent value="email" className="space-y-2 mt-4">
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
                </TabsContent>
                
                <TabsContent value="phone" className="space-y-2 mt-4">
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
                </TabsContent>
              </Tabs>

              <Button
                className="w-full h-14 text-lg font-semibold bg-rd-orange hover:bg-[#E67510] rounded-xl shadow-lg mt-6"
                onClick={handleSignup}
                disabled={!name || !orgCode || (method === "email" ? !email : !phone) || loading}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Send Verification Code
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
                Verify & Sign Up
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