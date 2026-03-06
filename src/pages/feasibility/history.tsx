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
import { ArrowRight, Plus, Search, Calendar, Trash2, TrendingUp, AlertCircle, CalendarDays } from "lucide-react";
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

  const getRatingClasses = (rating: string | null) => {
    const base = "bg-slate-900/80 border border-slate-700 text-slate-100";

    if (!rating) {
      return base;
    }

    switch (rating.toLowerCase()) {
      case "high":
        return `${base} border-emerald-500/40`;
      case "medium":
        return `${base} border-amber-500/40`;
      case "low":
        return `${base} border-rose-500/40`;
      default:
        return base;
    }
  };

  const getRdTaxClasses = (flag: string | null) => {
    const base = "bg-slate-900/80 border border-slate-700 text-slate-100";

    if (!flag) {
      return base;
    }

    switch (flag.toLowerCase()) {
      case "yes":
        return `${base} border-emerald-500/40`;
      case "maybe":
        return `${base} border-amber-500/40`;
      case "no":
        return `${base} border-slate-600`;
      default:
        return base;
    }
  };

  return (
    <>
      <SEO
        title="Analysis History - RD Sidekick"
        description="View past feasibility analyses"
      />
      <Layout>
        <div className="min-h-screen bg-[#020617] text-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-2">Feasibility Analysis History</h1>
                  <p className="text-base sm:text-lg text-slate-400">
                    View and manage all feasibility assessments for {currentOrg?.name}
                  </p>
                </div>
                <Button 
                  onClick={() => router.push("/feasibility")}
                  size="lg"
                  className="bg-[#ff6b35] hover:bg-[#ff8c42] text-slate-950 shadow-professional-md"
                >
                  <Plus size={20} className="mr-2" />
                  New Analysis
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <Input 
                  placeholder="Search analyses by title or description..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-11 sm:h-12 text-sm sm:text-base bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-[#ff6b35] focus:ring-[#ff6b35]"
                />
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="border border-slate-800 shadow-professional-md bg-[#050b16]">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-800/80 p-3 rounded-lg">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-slate-100" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-400">Total Analyses</p>
                      <p className="text-2xl sm:text-3xl font-semibold text-slate-50">{analyses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-800 shadow-professional-md bg-[#050b16]">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-3 rounded-lg">
                      <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-400">High Potential</p>
                      <p className="text-2xl sm:text-3xl font-semibold text-slate-50">
                        {analyses.filter(a => a.technical_rating === "high" || a.commercial_rating === "high").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-800 shadow-professional-md bg-[#050b16]">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-500/10 p-3 rounded-lg">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-400">This Month</p>
                      <p className="text-2xl sm:text-3xl font-semibold text-slate-50">
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto"></div>
                <p className="text-slate-400 mt-4">Loading analyses...</p>
              </div>
            ) : filteredAnalyses.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-700 bg-[#050b16]">
                <CardContent className="text-center py-16">
                  <TrendingUp className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-100 mb-2">
                    {searchTerm ? "No matching analyses" : "No analyses found"}
                  </h3>
                  <p className="text-slate-400 mb-6">
                    {searchTerm 
                      ? "Try adjusting your search terms" 
                      : "Start by submitting your first idea for feasibility analysis"}
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => router.push("/feasibility")}
                      className="bg-[#ff6b35] hover:bg-[#ff8c42] text-slate-950 shadow-professional-md"
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
                    className="border border-slate-800 shadow-professional-md hover:shadow-professional-lg transition-all duration-200 bg-[#050b16] overflow-hidden group"
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        {/* Main Content */}
                        <div className="flex-1 p-5 sm:p-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="font-semibold text-lg sm:text-xl text-slate-50">
                                  {analysis.idea_title || "Untitled Idea"}
                                </h3>
                                {analysis.sector_guess && (
                                  <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-200 border border-sky-500/40">
                                    {analysis.sector_guess}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-400 text-sm sm:text-[15px] leading-relaxed line-clamp-2 mb-4">
                                {analysis.summary || analysis.idea_description}
                              </p>
                            </div>
                          </div>

                          {/* Ratings Grid */}
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-300">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <div className="flex items-center gap-1.5">
                                <span className="uppercase tracking-wide text-[10px] text-slate-500">
                                  Technical
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-tight ${getRatingClasses(
                                    analysis.technical_rating,
                                  )}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
                                  {(analysis.technical_rating || "N/A").toUpperCase()}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="uppercase tracking-wide text-[10px] text-slate-500">
                                  Commercial
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-tight ${getRatingClasses(
                                    analysis.commercial_rating,
                                  )}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
                                  {(analysis.commercial_rating || "N/A").toUpperCase()}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="uppercase tracking-wide text-[10px] text-slate-500">
                                  R&amp;D Tax
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-tight ${getRdTaxClasses(
                                    analysis.rd_tax_flag,
                                  )}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
                                  {(analysis.rd_tax_flag || "N/A").toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400">
                              <CalendarDays className="w-3.5 h-3.5" />
                              <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Sidebar */}
                        <div className="lg:border-l border-t lg:border-t-0 border-slate-800 bg-slate-900/80 p-5 sm:p-6 flex flex-row lg:flex-col gap-3 lg:w-48">
                          <Link href={`/feasibility/${analysis.id}`} className="flex-1">
                            <Button 
                              variant="default"
                              className="w-full bg-[#ff6b35] hover:bg-[#ff8c42] text-slate-950 h-auto py-2.5 sm:py-3"
                            >
                              <span className="flex items-center justify-center gap-2 text-sm">
                                View Report
                                <ArrowRight size={16} />
                              </span>
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={() => handleDelete(analysis.id, analysis.idea_title || "this analysis")}
                            disabled={deletingId === analysis.id}
                            className="flex-1 lg:flex-none border-red-500/60 text-red-300 hover:bg-red-950/40 hover:text-red-100 h-auto py-2.5 sm:py-3 text-sm"
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