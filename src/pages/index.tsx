import React from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Target
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: Camera,
      title: "Instant Capture",
      description: "Snap photos of prototypes, experiments, and breakthroughs the moment they happen.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: FileText,
      title: "Smart Documentation",
      description: "Upload any file type - PDFs, spreadsheets, CAD files, technical documents.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Cloud,
      title: "Auto-Sync",
      description: "Everything syncs automatically to your R&D team's secure system.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Offline Ready",
      description: "Capture evidence offline and sync automatically when back online.",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "Multi-tenant architecture with enterprise-grade encryption.",
      color: "from-red-500 to-rose-500"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Multiple users, multiple projects, one unified evidence trail.",
      color: "from-indigo-500 to-blue-500"
    }
  ];

  const stats = [
    { value: "10x", label: "Faster Evidence Collection", icon: TrendingUp },
    { value: "100%", label: "Organized & Compliant", icon: CheckCircle2 },
    { value: "24/7", label: "Capture On-The-Go", icon: Clock },
    { value: "∞", label: "Peace of Mind", icon: Lock }
  ];

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
    }
  ];

  return (
    <>
      <SEO
        title="RD Sidekick - Capture R&D Evidence Effortlessly"
        description="The modern way to capture, organize, and submit R&D tax evidence. Never miss a claimable moment again."
      />
      
      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/rdtax-logo.png" alt="RD TAX" className="h-10 w-auto" />
                <span className="text-xl font-bold text-slate-900">RD Sidekick</span>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/auth/login")}
                  className="text-slate-700 hover:text-slate-900"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => router.push("/auth/signup")}
                  className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white hover:opacity-90"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden hero-gradient">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }}></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <Badge className="mb-6 bg-white/10 text-white border-white/20 px-6 py-2 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Trusted by R&D teams across the UK
              </Badge>
              
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-tight tracking-tight">
                Your R&D Evidence,
                <br />
                <span className="text-gradient">Captured Effortlessly</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
                The modern way to capture, organize, and submit R&D tax evidence. 
                <strong className="text-white"> Never miss a claimable moment again.</strong>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button
                  size="lg"
                  onClick={() => router.push("/auth/signup")}
                  className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white text-lg px-10 py-7 rounded-2xl hover:opacity-90 hover:scale-105 transition-all shadow-2xl glow-effect"
                >
                  <Smartphone className="mr-2 h-5 w-5" />
                  Start Capturing Evidence
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/auth/login")}
                  className="border-2 border-white text-white hover:bg-white hover:text-slate-900 text-lg px-10 py-7 rounded-2xl transition-all"
                >
                  Log In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="flex justify-center mb-3">
                      <stat.icon className="h-8 w-8 text-[#ff6b35]" />
                    </div>
                    <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
                    <div className="text-sm text-slate-300 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-[#ff6b35]/10 text-[#ff6b35] border-[#ff6b35]/20 px-4 py-2">
                FEATURES
              </Badge>
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-4">
                Everything You Need
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Built specifically for R&D tax claims, RD Sidekick makes evidence collection simple, secure, and seamless.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="p-8 border-2 border-slate-100 hover:border-slate-200 feature-card-hover bg-white relative overflow-hidden group"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.color} opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`}></div>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-[#ff6b35]/10 text-[#ff6b35] border-[#ff6b35]/20 px-4 py-2">
                HOW IT WORKS
              </Badge>
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-4">
                Three Simple Steps
              </h2>
              <p className="text-xl text-slate-600">
                From capture to claim in minutes
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-[#ff6b35] to-transparent -translate-x-6"></div>
                  )}
                  <div className="relative z-10">
                    <div className="bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] w-20 h-20 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-xl">
                      <step.icon className="h-10 w-10 text-white" />
                    </div>
                    <div className="text-6xl font-black text-slate-200 mb-4 text-center">{step.number}</div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-3 text-center">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-center">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-20 w-96 h-96 bg-white rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-10 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }}></div>
          </div>

          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Ready to Transform Your
              <br />
              R&D Evidence Collection?
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Join innovative teams who trust RD Sidekick to capture and organize their R&D tax evidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => router.push("/auth/signup")}
                className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white text-lg px-10 py-7 rounded-2xl hover:opacity-90 hover:scale-105 transition-all shadow-2xl glow-effect"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/auth/login")}
                className="border-2 border-white text-white hover:bg-white hover:text-slate-900 text-lg px-10 py-7 rounded-2xl transition-all"
              >
                Already Have an Account?
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-12">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center gap-3 mb-6 md:mb-0">
                <img src="/rdtax-logo.png" alt="RD TAX" className="h-12 w-auto" />
                <div>
                  <div className="text-xl font-bold">RD Sidekick</div>
                  <div className="text-sm text-slate-400">by RD TAX</div>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-slate-400">
                  © {new Date().getFullYear()} RD TAX. All rights reserved.
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Secure R&D evidence capture for tax claims
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}