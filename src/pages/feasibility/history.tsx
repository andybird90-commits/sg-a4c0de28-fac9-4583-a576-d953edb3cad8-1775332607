import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { feasibilityService, FeasibilityAnalysis } from "@/services/feasibilityService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Plus, Search, Calendar, Trash2, TrendingUp, AlertCircle } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

export default function FeasibilityHistoryPage() {
  const router = useRouter();
  const { user, currentOrg } = useApp();
  const { notify } = useNotifications();
  const [analyses, setAnalyses] = useState<FeasibilityAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || !currentOrg) return;
    fetchAnalyses();
  }, [user, currentOrg]);

  const fetchAnalyses = async () => {
    if (!currentOrg) return;
    try {
      const data = await feasibilityService.getAnalyses(currentOrg.id);
      setAnalyses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;

    setDeletingId(id);
    try {
      await feasibilityService.deleteAnalysis(id);
      notify({
        type: "success",
        title: "Analysis deleted",
        message: "Feasibility analysis has been removed"
      });
      setAnalyses(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      notify({
        type: "error",
        title: "Delete failed",
        message: err.message || "Failed to delete analysis"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAnalyses = analyses.filter(a => 
    (a.idea_title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (a.summary?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const getRatingColor = (rating?: string) => {
    switch (rating?.toLowerCase()) {
      case "high": return "bg-green-100 text-green-800 border-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <>
      <SEO
        title="Analysis History - RD Sidekick"
        description="View past feasibility analyses"
      />
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-[#001F3F] mb-2">Feasibility Analysis History</h1>
                  <p className="text-lg text-gray-600">
                    View and manage all feasibility assessments for {currentOrg?.name}
                  </p>
                </div>
                <Button 
                  onClick={() => router.push("/feasibility")}
                  size="lg"
                  className="bg-[#FF6B35] hover:bg-[#FF8C61] text-white shadow-lg"
                >
                  <Plus size={20} className="mr-2" />
                  New Analysis
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input 
                  placeholder="Search analyses by title or description..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base border-gray-300 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="border-0 shadow-md bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Analyses</p>
                      <p className="text-2xl font-bold text-[#001F3F]">{analyses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">High Potential</p>
                      <p className="text-2xl font-bold text-[#001F3F]">
                        {analyses.filter(a => a.technical_rating === 'high' || a.commercial_rating === 'high').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-[#001F3F]">
                        {analyses.filter(a => {
                          const date = new Date(a.created_at);
                          const now = new Date();
                          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                        }).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis List */}
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading analyses...</p>
              </div>
            ) : filteredAnalyses.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-300 bg-white">
                <CardContent className="text-center py-16">
                  <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {searchTerm ? "No matching analyses" : "No analyses found"}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm 
                      ? "Try adjusting your search terms" 
                      : "Start by submitting your first idea for feasibility analysis"}
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => router.push("/feasibility")}
                      className="bg-[#FF6B35] hover:bg-[#FF8C61]"
                    >
                      <Plus size={16} className="mr-2" />
                      Create First Analysis
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAnalyses.map((analysis) => (
                  <Card 
                    key={analysis.id} 
                    className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white overflow-hidden group"
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        {/* Main Content */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="font-bold text-xl text-[#001F3F]">
                                  {analysis.idea_title || "Untitled Idea"}
                                </h3>
                                {analysis.sector_guess && (
                                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {analysis.sector_guess}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                                {analysis.summary || analysis.idea_description}
                              </p>
                            </div>
                          </div>

                          {/* Ratings Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium">Technical:</span>
                              <Badge variant="outline" className={`text-xs ${getRatingColor(analysis.technical_rating)}`}>
                                {analysis.technical_rating?.toUpperCase() || "N/A"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium">Commercial:</span>
                              <Badge variant="outline" className={`text-xs ${getRatingColor(analysis.commercial_rating)}`}>
                                {analysis.commercial_rating?.toUpperCase() || "N/A"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium">R&D Tax:</span>
                              <Badge variant="outline" className={`text-xs ${
                                analysis.rd_tax_flag === 'yes' ? 'bg-green-100 text-green-800' :
                                analysis.rd_tax_flag === 'maybe' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {analysis.rd_tax_flag?.toUpperCase() || "N/A"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {new Date(analysis.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Sidebar */}
                        <div className="lg:border-l border-t lg:border-t-0 border-gray-200 bg-gray-50 p-6 flex flex-row lg:flex-col gap-3 lg:w-48">
                          <Link href={`/feasibility/${analysis.id}`} className="flex-1">
                            <Button 
                              variant="default"
                              className="w-full bg-[#FF6B35] hover:bg-[#FF8C61] h-auto py-3"
                            >
                              <span className="flex items-center justify-center gap-2">
                                View Report
                                <ArrowRight size={16} />
                              </span>
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={() => handleDelete(analysis.id, analysis.idea_title || "this analysis")}
                            disabled={deletingId === analysis.id}
                            className="flex-1 lg:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-auto py-3"
                          >
                            <Trash2 size={16} className="mr-2" />
                            {deletingId === analysis.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}