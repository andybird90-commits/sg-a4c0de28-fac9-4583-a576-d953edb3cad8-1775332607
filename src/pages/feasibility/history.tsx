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
import {
  ArrowRight,
  Plus,
  Search,
  Calendar,
  Trash2,
  TrendingUp,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        message: "Feasibility analysis has been removed",
      });
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      notify({
        type: "error",
        title: "Delete failed",
        message: err.message || "Failed to delete analysis",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAnalyses = analyses.filter(
    (a) =>
      (a.idea_title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (a.summary?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  );

  const getRatingClasses = (rating: string | null) => {
    const base = "bg-muted border border-border text-foreground";

    if (!rating) {
      return base;
    }

    switch (rating.toLowerCase()) {
      case "high":
        return `${base} border-emerald-300 bg-emerald-50 text-emerald-800`;
      case "medium":
        return `${base} border-amber-300 bg-amber-50 text-amber-800`;
      case "low":
        return `${base} border-rose-300 bg-rose-50 text-rose-800`;
      default:
        return base;
    }
  };

  const getRdTaxClasses = (flag: string | null) => {
    const base = "bg-muted border border-border text-foreground";

    if (!flag) {
      return base;
    }

    switch (flag.toLowerCase()) {
      case "yes":
        return `${base} border-emerald-300 bg-emerald-50 text-emerald-800`;
      case "maybe":
        return `${base} border-amber-300 bg-amber-50 text-amber-800`;
      case "no":
        return `${base} border-slate-200 bg-slate-50 text-slate-700`;
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
        <div className="min-h-screen bg-background text-foreground">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
              <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">
                    Feasibility Analysis History
                  </h1>
                  <p className="text-base text-muted-foreground sm:text-lg">
                    View and manage all feasibility assessments for {currentOrg?.name}
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/feasibility")}
                  size="lg"
                  className="bg-[#ff6b35] text-slate-950 shadow-professional-md hover:bg-[#ff8c42]"
                >
                  <Plus size={20} className="mr-2" />
                  New Analysis
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  placeholder="Search analyses by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 bg-background pl-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#ff6b35] focus:ring-[#ff6b35] sm:h-12 sm:text-base"
                />
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="border-border bg-card shadow-professional-md">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-slate-100 p-3">
                      <TrendingUp className="h-5 w-5 text-slate-700 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">Total Analyses</p>
                      <p className="text-2xl font-semibold text-foreground sm:text-3xl">
                        {analyses.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-professional-md">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <AlertCircle className="h-5 w-5 text-emerald-600 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">High Potential</p>
                      <p className="text-2xl font-semibold text-foreground sm:text-3xl">
                        {
                          analyses.filter(
                            (a) =>
                              a.technical_rating === "high" ||
                              a.commercial_rating === "high",
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-professional-md">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-purple-50 p-3">
                      <Calendar className="h-5 w-5 text-purple-600 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">This Month</p>
                      <p className="text-2xl font-semibold text-foreground sm:text-3xl">
                        {
                          analyses.filter((a) => {
                            const date = new Date(a.created_at);
                            const now = new Date();
                            return (
                              date.getMonth() === now.getMonth() &&
                              date.getFullYear() === now.getFullYear()
                            );
                          }).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#ff6b35]" />
                <p className="mt-4 text-muted-foreground">Loading analyses...</p>
              </div>
            ) : filteredAnalyses.length === 0 ? (
              <Card className="border-dashed border-2 border-border bg-card">
                <CardContent className="py-16 text-center">
                  <TrendingUp className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    {searchTerm ? "No matching analyses" : "No analyses found"}
                  </h3>
                  <p className="mb-6 text-muted-foreground">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Start by submitting your first idea for feasibility analysis"}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => router.push("/feasibility")}
                      className="bg-[#ff6b35] text-slate-950 shadow-professional-md hover:bg-[#ff8c42]"
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
                    className="group overflow-hidden border border-border bg-card shadow-professional-md transition-all duration-200 hover:shadow-professional-lg"
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        <div className="flex-1 p-5 sm:p-6">
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-3">
                                <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                                  {analysis.idea_title || "Untitled Idea"}
                                </h3>
                                {analysis.sector_guess && (
                                  <Badge className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-800">
                                    {analysis.sector_guess}
                                  </Badge>
                                )}
                              </div>
                              <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                                {analysis.summary || analysis.idea_description}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground sm:text-sm">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Technical
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight ${getRatingClasses(
                                    analysis.technical_rating,
                                  )}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
                                  {(analysis.technical_rating || "N/A").toUpperCase()}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Commercial
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight ${getRatingClasses(
                                    analysis.commercial_rating,
                                  )}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
                                  {(analysis.commercial_rating || "N/A").toUpperCase()}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  R&amp;D Tax
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight ${getRdTaxClasses(
                                    analysis.rd_tax_flag,
                                  )}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
                                  {(analysis.rd_tax_flag || "N/A").toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                              <CalendarDays className="h-3.5 w-3.5" />
                              <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 border-t border-border bg-muted p-5 sm:p-6 lg:w-48 lg:flex-col lg:border-l lg:border-t-0">
                          <Link href={`/feasibility/${analysis.id}`} className="flex-1">
                            <Button
                              variant="default"
                              className="h-auto w-full bg-[#ff6b35] py-2.5 text-slate-950 hover:bg-[#ff8c42] sm:py-3"
                            >
                              <span className="flex items-center justify-center gap-2 text-sm">
                                View Report
                                <ArrowRight size={16} />
                              </span>
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleDelete(analysis.id, analysis.idea_title || "this analysis")
                            }
                            disabled={deletingId === analysis.id}
                            className="h-auto flex-1 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 lg:flex-none sm:py-3"
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