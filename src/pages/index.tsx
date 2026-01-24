import React from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Camera,
  FileText,
  Cloud,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight } from
"lucide-react";

export default function LandingPage() {
  const router = useRouter();

  const features = [
  {
    icon: Camera,
    title: "Instant Capture",
    description: "Snap photos of prototypes, tests, and experiments on the go."
  },
  {
    icon: FileText,
    title: "Document Everything",
    description: "Upload PDFs, spreadsheets, notes, and technical documents."
  },
  {
    icon: Cloud,
    title: "Auto-Sync",
    description: "Everything syncs automatically to your R&D team's system."
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Bank-level encryption and multi-tenant security."
  },
  {
    icon: Zap,
    title: "Offline Mode",
    description: "Capture evidence offline and sync when you're back online."
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Multiple users, multiple projects, one organized system."
  }];


  const benefits = [
  "Never lose track of R&D evidence",
  "Capture the moment when innovation happens",
  "Stay organized without extra effort",
  "Speed up your R&D tax claim process",
  "Access your evidence from anywhere",
  "Collaborate seamlessly with your team"];


  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Hero Section */}
      <div className="bg-rd-navy text-white" style={{ backgroundColor: "#fafafa" }}>
        <div className="container mx-auto px-6 py-12">
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <img
              src="/rdtax-logo.png"
              alt="RD TAX Logo"
              className="h-64 w-auto object-contain" />

          </div>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: "#05005c" }}>
              Your R&D Evidence,
              <br />
              <span className="text-rd-orange">Captured Effortlessly</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed" style={{ color: "#525252" }}>
              RD Sidekick helps you capture, organize, and submit R&D tax evidence
              on the go. Never miss a claimable moment again.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                className="bg-rd-orange hover:bg-rd-orange/90 text-white font-semibold text-lg px-8 py-6 rounded-xl"
                onClick={() => router.push("/auth/signup")} style={{ color: "#ffffff", backgroundColor: "#525252" }}>

                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-rd-navy font-semibold text-lg px-8 py-6 rounded-xl"
                onClick={() => router.push("/auth/login")} style={{ backgroundColor: "#525252" }}>

                Log In
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <CheckCircle2 className="h-5 w-5 text-rd-orange" />
              <span className="text-sm" style={{ color: "#525252" }}>Trusted by R&D teams across the UK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-rd-navy mb-4">
            Everything You Need to Capture R&D Evidence
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Built specifically for R&D tax claims, RD Sidekick makes evidence
            collection simple, secure, and seamless.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) =>
          <Card
            key={index}
            className="p-8 hover:shadow-lg transition-shadow border-2 border-slate-100">

              <div className="bg-rd-orange/10 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="h-7 w-7 text-rd-orange" />
              </div>
              <h3 className="text-xl font-bold text-rd-navy mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-slate-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-rd-navy mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600">
              Three simple steps to organized R&D evidence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-rd-orange text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold text-rd-navy mb-3">
                Capture
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Take photos, upload documents, or write notes about your R&D
                activities in real-time.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-rd-orange text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold text-rd-navy mb-3">
                Organize
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Tag evidence by project, type, and claim year. Everything stays
                organized automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-rd-orange text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold text-rd-navy mb-3">
                Sync
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Evidence automatically syncs to your R&D consultant's system for
                claim processing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-rd-navy mb-4 text-center">
            Why Teams Choose RD Sidekick
          </h2>
          <p className="text-xl text-slate-600 text-center mb-12">
            Make R&D tax claims easier and more accurate
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) =>
            <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-rd-orange flex-shrink-0 mt-1" />
                <p className="text-lg text-slate-700">{benefit}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-rd-navy to-rd-navy/90 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Streamline Your R&D Evidence?
          </h2>
          <p className="text-xl text-slate-200 mb-8 max-w-2xl mx-auto">
            Join innovative teams who trust RD Sidekick to capture and organize
            their R&D tax evidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-rd-orange hover:bg-rd-orange/90 text-white font-semibold text-lg px-8 py-6 rounded-xl"
              onClick={() => router.push("/auth/signup")}>

              Start Capturing Evidence
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-rd-navy font-semibold text-lg px-8 py-6 rounded-xl"
              onClick={() => router.push("/auth/login")}>

              Already Have an Account?
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-rd-navy text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-slate-300">
            © {new Date().getFullYear()} RD TAX. All rights reserved.
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Secure R&D evidence capture for tax claims
          </p>
        </div>
      </div>
    </div>);

}