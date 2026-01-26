import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { feasibilityService, FeasibilityAnalysis } from "@/services/feasibilityService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function FeasibilityHistoryPage() {
  const router = useRouter();
  const { user, currentOrg } = useApp();
  const [analyses, setAnalyses] = useState<FeasibilityAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user || !currentOrg) return;

    const fetchAnalyses = async () => {
      try {
        const data = await feasibilityService.getAnalyses(currentOrg.id);
        setAnalyses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [user, currentOrg]);

  const filteredAnalyses = analyses.filter(a => 
    (a.idea_title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (a.summary?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const getRatingBadge = (rating?: string) => {
    const color = rating === 'high' ? 'bg-green-100 text-green-800' :
                 rating === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                 'bg-red-100 text-red-800';
    return <Badge variant="secondary" className={color}>{rating?.toUpperCase()}</Badge>;
  };

  return (
    <>
      <SEO
        title="Analysis History - RD Sidekick"
        description="View past feasibility analyses"
      />
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#001F3F]">Analysis History</h1>
              <p className="text-gray-600">Past feasibility assessments for {currentOrg?.name}</p>
            </div>
            <Button 
              onClick={() => router.push("/feasibility")}
              className="bg-[#FF6B35] hover:bg-[#FF8C61] text-white"
            >
              <Plus size={16} className="mr-2" />
              New Analysis
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Search past analyses..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading history...</div>
          ) : filteredAnalyses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses found</h3>
              <p className="text-gray-500 mb-6">You haven't submitted any ideas for analysis yet.</p>
              <Button onClick={() => router.push("/feasibility")}>Get Started</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnalyses.map((analysis) => (
                <Link key={analysis.id} href={`/feasibility/${analysis.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-[#001F3F]">
                              {analysis.idea_title || "Untitled Idea"}
                            </h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {new Date(analysis.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {analysis.summary || analysis.idea_description}
                          </p>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs font-normal">
                              Tech: {analysis.technical_rating}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-normal">
                              Comm: {analysis.commercial_rating}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center text-[#FF6B35]">
                          <span className="text-sm font-medium mr-2">View Report</span>
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}