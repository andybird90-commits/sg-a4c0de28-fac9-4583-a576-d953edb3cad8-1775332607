import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Layers, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Calendar,
  Building2,
  ChevronRight
} from "lucide-react";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";
import { useNotifications } from "@/contexts/NotificationContext";

export default function EvidencePage() {
  const router = useRouter();
  const { user, currentOrg } = useApp();
  const { notify } = useNotifications();
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (currentOrg) {
      loadEvidence();
    }
  }, [currentOrg]);

  const loadEvidence = async () => {
    if (!currentOrg) return;

    setLoading(true);
    try {
      console.log("Loading evidence for org:", currentOrg.id);
      const data = await sidekickEvidenceService.getEvidenceByCompany(currentOrg.id);
      console.log("Evidence loaded:", data.length, "items");
      setEvidence(data);
    } catch (error: any) {
      console.error("Error loading evidence:", error);
      notify({
        type: "error",
        title: "Load failed",
        message: error.message || "Failed to load evidence"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvidence = evidence.filter(item => 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <SEO title="Evidence - RD Companion" />
      <div className="min-h-screen bg-[#020617] pb-20">
        <div className="bg-[#001F3F] text-white pt-8 pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Layers className="h-6 w-6 text-[#FF6B35]" />
                  Evidence Library
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  Manage and organize your R&D documentation
                </p>
              </div>
              <Button 
                onClick={() => router.push("/evidence/capture")}
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Evidence
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search evidence..." 
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-6">
          <Card className="border border-slate-800 shadow-professional-md bg-[#050b16]">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#001F3F]"></div>
                </div>
              ) : filteredEvidence.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="bg-slate-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Layers className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">No evidence found</h3>
                  <p className="text-slate-400 text-sm mb-6">
                    {searchTerm ? "Try adjusting your search terms" : "Start capturing evidence for your R&D projects"}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => router.push("/evidence/capture")}
                      className="bg-[#ff6b35] hover:bg-[#ff8c42] text-slate-950"
                    >
                      Capture First Evidence
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredEvidence.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/evidence/sidekick/${item.id}`)}
                      className="p-4 hover:bg-white transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-slate-900 p-2.5 rounded-lg group-hover:bg-slate-800 transition-colors">
                          <FileText className="h-5 w-5 text-[#ff6b35]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-100 line-clamp-1 mb-1">
                            {item.title || "Untitled Evidence"}
                          </p>
                          {item.body && (
                            <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                              {item.body}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            {(item as any).sidekick_projects?.name && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Building2 className="h-3 w-3" />
                                {(item as any).sidekick_projects.name}
                              </span>
                            )}
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {item.tags.map((tag: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 h-5 bg-slate-900 text-slate-200 border border-slate-700"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-[#ff6b35] transition-colors self-center" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}