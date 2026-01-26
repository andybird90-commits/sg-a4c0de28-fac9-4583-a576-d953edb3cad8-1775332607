import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { feasibilityService, FeasibilityInput } from "@/services/feasibilityService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, ArrowRight, History } from "lucide-react";

export default function FeasibilityPage() {
  const router = useRouter();
  const { user, currentOrg } = useApp();
  const [formData, setFormData] = useState<FeasibilityInput>({
    ideaDescription: "",
    sector: "",
    stage: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.ideaDescription.trim()) {
      setError("Please describe your idea");
      return;
    }

    setLoading(true);
    try {
      const analysis = await feasibilityService.submitForAnalysis(formData);
      router.push(`/feasibility/${analysis.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to analyze idea");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <SEO
        title="Feasibility Analysis - RD Sidekick"
        description="Submit your idea for AI-powered feasibility assessment"
      />
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF6B35] to-[#FF8C61] text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Sparkles size={16} />
              Sidekick Enabled
            </div>
            <h1 className="text-4xl font-bold text-[#001F3F] mb-2">
              Feasibility Analysis
            </h1>
            <p className="text-gray-600 text-lg">
              Get structured, expert-backed assessment of your idea in seconds
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Technical</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Engineering feasibility, constraints, and buildability</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Commercial</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Market fit, customers, and revenue potential</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Timeline, complexity, and resource requirements</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Submit Your Idea</CardTitle>
              <CardDescription>
                Describe your idea and we'll provide a comprehensive feasibility assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="ideaDescription">Idea Description *</Label>
                  <Textarea
                    id="ideaDescription"
                    placeholder="Describe your idea in detail. What problem does it solve? How does it work? Who is it for?"
                    value={formData.ideaDescription}
                    onChange={(e) => setFormData({ ...formData, ideaDescription: e.target.value })}
                    className="min-h-[150px] mt-2"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sector">Sector (optional)</Label>
                    <Input
                      id="sector"
                      placeholder="e.g., Construction, Energy, SaaS"
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stage">Stage (optional)</Label>
                    <Input
                      id="stage"
                      placeholder="e.g., Concept, Prototype, MVP"
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#FF6B35] hover:bg-[#FF8C61] text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={16} />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze Idea
                        <ArrowRight size={16} className="ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-[#001F3F] mb-2">What to expect</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Clear assessment of technical, commercial, and delivery feasibility</li>
              <li>• Identification of key risks, constraints, and regulatory considerations</li>
              <li>• Preliminary R&D tax credit potential (high-level only)</li>
              <li>• 3-7 practical next steps to move your idea forward</li>
              <li>• UK-focused, pragmatic guidance backed by RD expertise</li>
            </ul>
          </div>
        </div>
      </Layout>
    </>
  );
}