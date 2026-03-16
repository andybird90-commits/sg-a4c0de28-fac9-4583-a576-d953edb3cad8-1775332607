import React from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function SDRPage() {
  const router = useRouter();

  return (
    <Layout>
      <SEO title="SDR - RD Companion" />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <header className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">SDR</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              SDR workspace. This page is ready for you to configure workflows for sales
              development, outreach activity, or any SDR-specific tools you’d like to add.
            </p>
          </header>

          <Card className="border border-border bg-card shadow-professional-md">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Getting started</CardTitle>
              <CardDescription>
                This is a placeholder SDR page. We can extend it with tables, funnels,
                task lists, or integrations as your SDR process evolves.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                For now, you can navigate back to the main dashboard or onboarding flow.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/home")}
                >
                  Back to Dashboard
                </Button>
                <Button
                  size="sm"
                  className="gradient-primary text-slate-950"
                  onClick={() => router.push("/onboarding")}
                >
                  Go to Onboarding
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );