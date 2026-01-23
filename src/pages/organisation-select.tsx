import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ArrowRight, Loader2 } from "lucide-react";

export default function OrganisationSelectPage() {
  const router = useRouter();
  const { user, organisations, setCurrentOrg, loading } = useApp();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
    if (!loading && organisations.length === 1) {
      setCurrentOrg(organisations[0]);
      router.push("/home");
    }
    if (!loading && organisations.length === 0) {
      router.push("/auth/signup");
    }
  }, [user, organisations, loading, router, setCurrentOrg]);

  if (loading || !user || organisations.length <= 1) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-rd-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-rd-navy">Select Organisation</h1>
            <p className="text-slate-600">Choose which organisation to access</p>
          </div>

          <div className="space-y-3">
            {organisations.map((org) => (
              <Card key={org.id} className="evidence-card cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="p-0">
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-6 justify-start"
                    onClick={() => {
                      setCurrentOrg(org);
                      router.push("/home");
                    }}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rd-navy to-[#1a3a5f] flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-7 w-7 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-lg text-rd-navy">{org.name}</p>
                        <p className="text-sm text-slate-600 capitalize">{org.role} access</p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-slate-400 flex-shrink-0" />
                    </div>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}