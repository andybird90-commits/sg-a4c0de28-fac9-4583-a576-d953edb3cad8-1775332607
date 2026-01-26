import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { feasibilityService, FeasibilityAnalysis } from "@/services/feasibilityService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Download, AlertTriangle, CheckCircle2, 
  Clock, Gauge, TrendingUp, ShieldAlert, PoundSterling 
} from "lucide-react";

export default function FeasibilityResultPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useApp();
  const [analysis, setAnalysis] = useState<FeasibilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !user || !router.isReady) return;

    const fetchAnalysis = async () => {
      try {
        const data = await feasibilityService.getAnalysisById(id as string);
        if (!data) throw new Error("Analysis not found");
        setAnalysis(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, user, router.isReady]);

  if (loading) return <Layout><div className="p-8 text-center">Loading analysis...</div></Layout>;
  if (error) return <Layout><div className="p-8 text-center text-red-600">Error: {error}</div></Layout>;
  if (!analysis) return null;

  const getRatingColor = (rating?: string) => {
    switch (rating?.toLowerCase()) {
      case "high": return "bg-green-100 text-green-800 border-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity?.toLowerCase()) {
      case "low": return "bg-green-100 text-green-800 border-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <>
      <SEO
        title={`Analysis: ${analysis.idea_title || "New Idea"} - RD Sidekick`}
        description="Feasibility analysis results"
      />
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Link 
              href="/feasibility" 
              className="text-gray-600 hover:text-[#001F3F] flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Analysis
            </Link>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => window.print()}>
                <Download size={16} className="mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                {analysis.sector_guess || "General"}
              </span>
              <span className="text-gray-500 text-sm">
                {new Date(analysis.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[#001F3F] mb-4">
              {analysis.idea_title || "Feasibility Analysis"}
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              {analysis.summary}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Technical Card */}
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Gauge className="text-blue-600" size={20} />
                    <CardTitle className="text-lg">Technical</CardTitle>
                  </div>
                  <Badge variant="outline" className={getRatingColor(analysis.technical_rating)}>
                    {analysis.technical_rating?.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{analysis.technical_reasoning}</p>
                {analysis.technical_constraints && analysis.technical_constraints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase">Key Constraints</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.technical_constraints.map((item, i) => (
                        <li key={i} className="flex gap-2 text-gray-700">
                          <span className="text-blue-500">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Commercial Card */}
            <Card className="border-t-4 border-t-green-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-green-600" size={20} />
                    <CardTitle className="text-lg">Commercial</CardTitle>
                  </div>
                  <Badge variant="outline" className={getRatingColor(analysis.commercial_rating)}>
                    {analysis.commercial_rating?.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{analysis.commercial_reasoning}</p>
                
                {analysis.target_customers && analysis.target_customers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase">Target Customers</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.target_customers.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {analysis.revenue_ideas && analysis.revenue_ideas.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase">Revenue Models</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.revenue_ideas.map((item, i) => (
                        <li key={i} className="flex gap-2 text-gray-700">
                          <span className="text-green-500">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Card */}
            <Card className="border-t-4 border-t-purple-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Clock className="text-purple-600" size={20} />
                    <CardTitle className="text-lg">Delivery</CardTitle>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={getComplexityColor(analysis.delivery_complexity)}>
                      {analysis.delivery_complexity?.toUpperCase()} COMPLEXITY
                    </Badge>
                    {analysis.delivery_timeframe_months && (
                      <span className="text-xs text-gray-500 font-medium">
                        ~{analysis.delivery_timeframe_months} months
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {analysis.delivery_dependencies && analysis.delivery_dependencies.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase">Key Dependencies</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.delivery_dependencies.map((item, i) => (
                        <li key={i} className="flex gap-2 text-gray-700">
                          <span className="text-purple-500">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Risks */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-orange-500" size={20} />
                  <CardTitle>Risks & Regulations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Notable Risks</h4>
                    <ul className="space-y-2">
                      {(analysis.notable_risks || []).map((risk, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700 bg-orange-50 p-2 rounded">
                          <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Regulatory Considerations</h4>
                    <ul className="space-y-2">
                      {(analysis.regulatory_issues || []).map((issue, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          <ShieldAlert size={16} className="text-gray-400 mt-0.5 shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Actions & R&D Tax */}
            <div className="space-y-6">
              <Card className="border-l-4 border-l-[#FF6B35]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-[#FF6B35]" size={20} />
                    <CardTitle>Recommended Next Actions</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {(analysis.next_actions || []).map((action, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-800">
                        <div className="bg-[#FF6B35] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        {action}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <PoundSterling className="text-slate-600" size={20} />
                    <CardTitle className="text-base">R&D Tax Potential</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className={`
                      px-3 py-1 rounded font-bold text-sm uppercase shrink-0
                      ${analysis.rd_tax_flag === 'yes' ? 'bg-green-600 text-white' : 
                        analysis.rd_tax_flag === 'maybe' ? 'bg-yellow-500 text-white' : 'bg-gray-400 text-white'}
                    `}>
                      {analysis.rd_tax_flag}
                    </div>
                    <p className="text-sm text-gray-600 italic">
                      {analysis.rd_tax_reasoning}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    * This is an automated assessment and does not constitute tax advice.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}