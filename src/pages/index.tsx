import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import {
  Camera,
  FileText,
  Cloud,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  TrendingUp,
  Lock,
  Smartphone,
  LayoutDashboard,
  Target } from
"lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, isStaff } = useApp();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user && isStaff) {
      router.replace("/staff");
    } else if (user && !isStaff) {
      router.replace("/home");
    }
  }, [user, isStaff, loading, router]);

  const features = [
  {
    icon: Camera,
    title: "Instant Capture",
    description: "Snap photos of prototypes, experiments, and breakthroughs the moment they happen.",
    color: "from-orange-500 to-orange-400"
  },
  {
    icon: FileText,
    title: "Smart Documentation",
    description: "Upload any file type - PDFs, spreadsheets, CAD files, technical documents.",
    color: "from-sky-500 to-cyan-400"
  },
  {
    icon: Cloud,
    title: "Auto-Sync",
    description: "Everything syncs automatically to your R&D team's secure system.",
    color: "from-emerald-500 to-teal-400"
  },
  {
    icon: Zap,
    title: "Rapid Rollout",
    description: "Get your team capturing R&D evidence in days, not months, with intuitive workflows.",
    color: "from-yellow-500 to-amber-400"
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "Multi-tenant architecture with enterprise-grade encryption.",
    color: "from-indigo-500 to-slate-400"
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Multiple users, multiple projects, one unified evidence trail.",
    color: "from-purple-500 to-fuchsia-400"
  }];


  const stats = [
  { value: "10x", label: "Faster Evidence Collection", icon: TrendingUp },
  { value: "100%", label: "Organized & Compliant", icon: CheckCircle2 },
  { value: "24/7", label: "Capture On-The-Go", icon: Clock },
  { value: "∞", label: "Peace of Mind", icon: Lock }];


  const steps = [
  {
    number: "01",
    title: "Capture",
    description: "Take photos, upload files, or write notes about your R&D activities in real-time.",
    icon: Camera
  },
  {
    number: "02",
    title: "Organize",
    description: "Tag evidence by project, type, and claim year. AI helps categorize automatically.",
    icon: LayoutDashboard
  },
  {
    number: "03",
    title: "Submit",
    description: "Evidence syncs directly to your R&D consultant for seamless claim processing.",
    icon: Target
  }];


  return (
    <>
      <SEO
        title="RD Companion - Capture R&D Evidence Effortlessly"
        description="The modern way to capture, organize, and submit R&D tax evidence. Never miss a claimable moment again." />
      

      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
                <img src="/RDTAXHEADER_1_.png" alt="RD TAX" className="h-8 sm:h-10 w-auto flex-shrink-0" />
                <span className="text-base sm:text-lg lg:text-xl font-bold text-foreground truncate">
                  RD Companion
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/auth/login")}
                  className="text-foreground hover:text-foreground hover:bg-muted text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4">
                  
                  Log In
                </Button>
                <Button
                  onClick={() => router.push("/auth/signup")}
                  className="bg-gradient-to-r from-orange-500 to-orange-400 text-slate-950 hover:opacity-90 text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4 whitespace-nowrap">
                  
                  <span className="hidden sm:inline">Get Started Free</span>
                  <span className="sm:hidden">Sign Up</span>
                  <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden hero-gradient" style={{ backgroundImage: "none", backgroundColor: "#ffffff" }}>
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                <div className="flex justify-center lg:justify-start order-2 lg:order-1">
                  <img
                    src="/rdtax-logo.png"
                    alt="RD TAX"
                    className="w-full max-w-[250px] sm:max-w-xs lg:max-w-md h-auto drop-shadow-2xl" />
                  <p className="mt-4 text-sm sm:text-base md:text-lg font-medium text-muted-foreground text-center lg:text-left">
                    Raising Funds for Businesses
                  </p>
                </div>

                <div className="text-center lg:text-left order-1 lg:order-2">
                  <Badge className="mb-4 sm:mb-6 bg-orange-500/15 text-orange-400 border-orange-500/40 px-3 sm:px-4 lg:px-6 py-1 sm:py-1.5 lg:py-2 text-xs sm:text-sm font-medium inline-flex items-center">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Trusted by R&D teams across the UK</span>
                  </Badge>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-4 sm:mb-6 leading-tight tracking-tight">
                    Your R&D Evidence,
                    <br />
                    <span className="text-gradient">Captured Effortlessly</span>
                  </h1>

                  <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-300 mb-6 sm:mb-8 lg:mb-10 leading-relaxed" style={{ color: "#1a1a1a" }}>
                    RD Companion helps you capture, organize, and submit R&D tax evidence on the go.
                    <strong className="text-slate-50" style={{ color: "#1a1a1a" }}> Never miss a claimable moment again.</strong>
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-8 sm:mb-12">
                    






                    
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => router.push("/auth/login")}
                      className="border-2 border-slate-700 text-slate-100 hover:bg-slate-900 text-sm sm:text-base lg:text-lg px-5 sm:px-6 lg:px-10 py-4 sm:py-5 lg:py-7 rounded-xl sm:rounded-2xl transition-all w-full sm:w-auto" style={{ color: "#f97316" }}>
                      
                      Log In
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 max-w-lg mx-auto lg:mx-0">
                    {stats.map((stat, index) =>
                    <div
                      key={index}
                      className="bg-slate-900/60 rounded-lg sm:rounded-xl lg:rounded-2xl p-2.5 sm:p-3 lg:p-4 border border-slate-800" style={{ backgroundColor: "#0f1d2d" }}>
                      
                        <div className="flex justify-center lg:justify-start mb-1 sm:mb-2">
                          <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-400" />
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-50 mb-0.5 sm:mb-1 truncate">
                          {stat.value}
                        </div>
                        <div className="text-2xs sm:text-xs text-slate-400 font-medium leading-tight">
                          {stat.label}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-12 lg:mb-16">
              <Badge className="mb-3 sm:mb-4 bg-orange-500/15 text-orange-400 border-orange-500/40 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
                FEATURES
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black mb-3 sm:mb-4 px-2 text-foreground">
                Everything You Need
              </h2>
              <p className="text-sm sm:text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                Built specifically for R&D tax claims, RD Companion makes evidence collection simple, secure, and
                seamless.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
              {features.map((feature, index) =>
              <Card
                key={index}
                className="p-5 sm:p-6 lg:p-8 border border-border hover:border-primary/40 feature-card-hover bg-card relative overflow-hidden group shadow-sm">
                
                  <div
                  className={`absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br ${feature.color} opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 group-hover:scale-150 transition-transform duration-500`}>
                </div>
                  <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 sm:mb-5 lg:mb-6 group-hover:scale-110 transition-transform`}>
                  
                    <feature.icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2 sm:mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-12 lg:mb-16">
              <Badge className="mb-3 sm:mb-4 bg-orange-500/15 text-orange-400 border-orange-500/40 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
                HOW IT WORKS
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black mb-3 sm:mb-4 px-2 text-foreground">
                Three Simple Steps
              </h2>
              <p className="text-sm sm:text-base lg:text-xl text-muted-foreground">From capture to claim in minutes</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 max-w-6xl mx-auto">
              {steps.map((step, index) =>
              <div key={index} className="relative">
                  {index < steps.length - 1 &&
                <div className="hidden md:block absolute top-12 sm:top-16 left-full w-full h-0.5 bg-gradient-to-r from-orange-500 to-transparent -translate-x-6"></div>
                }
                  <div className="relative z-10">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-400 w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl lg:rounded-3xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6 mx-auto shadow-xl">
                      <step.icon className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-slate-950" />
                    </div>
                    <div className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-800 mb-2 sm:mb-3 lg:mb-4 text-center">
                      {step.number}
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-50 mb-2 sm:mb-3 text-center">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed text-center px-2" style={{ color: "#1a1a1a" }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-24 hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-20 w-72 h-72 sm:w-96 sm:h-96 bg-orange-500 rounded-full blur-3xl animate-float"></div>
            <div
              className="absolute bottom-10 left-20 w-60 h-60 sm:w-72 sm:h-72 bg-orange-400 rounded-full blur-3xl animate-float"
              style={{ animationDelay: "3s" }}>
            </div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-50 mb-4 sm:mb-6 px-2 leading-tight">
              Ready to Transform Your
              <br />
              R&D Evidence Collection?
            </h2>
            <p className="text-sm sm:text-base lg:text-xl text-slate-300 mb-6 sm:mb-8 lg:mb-10 max-w-2xl mx-auto px-4">
              Join innovative teams who trust RD Companion to capture and organize their R&D tax evidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 max-w-2xl mx-auto">
              <Button
                size="lg"
                onClick={() => router.push("/auth/signup")}
                className="bg-gradient-to-r from-orange-500 to-orange-400 text-slate-950 text-sm sm:text-base lg:text-lg px-5 sm:px-6 lg:px-10 py-4 sm:py-5 lg:py-7 rounded-xl sm:rounded-2xl hover:opacity-90 hover:scale-105 transition-all shadow-2xl glow-effect w-full sm:w-auto">
                
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/auth/login")}
                className="border-2 border-slate-200/40 text-slate-100 hover:bg-slate-900 text-sm sm:text-base lg:text-lg px-5 sm:px-6 lg:px-10 py-4 sm:py-5 lg:py-7 rounded-xl sm:rounded-2xl transition-all w-full sm:w-auto">
                
                Already Have an Account?
              </Button>
            </div>
          </div>
        </section>

        <footer className="bg-background text-foreground py-8 sm:py-12 border-t border-border">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-0">
              <div className="flex items-center gap-3 mb-4 md:mb-0">
                <div className="text-center md:text-left">
                  <div className="text-lg sm:text-xl font-bold">RD Companion</div>
                  <div className="text-sm text-muted-foreground">by RD TAX</div>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-muted-foreground text-sm sm:text-base">
                  © {new Date().getFullYear()} RD TAX. All rights reserved.
                </p>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                  Secure R&D evidence capture for tax claims
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>);

}