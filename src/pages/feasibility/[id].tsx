import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { feasibilityService, FeasibilityAnalysis } from "@/services/feasibilityService";
import { organisationService } from "@/services/organisationService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Download, AlertTriangle, CheckCircle2, 
  Clock, Gauge, TrendingUp, ShieldAlert, PoundSterling,
  FolderPlus, Trash2, Edit, Sparkles
} from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

export default function FeasibilityResultPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, currentOrg } = useApp();
  const { notify } = useNotifications();
  const [analysis, setAnalysis] = useState<FeasibilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTags, setProjectTags] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    if (showCreateProject && analysis) {
      setProjectName(analysis.idea_title || "");
      setProjectDescription(analysis.summary || "");
      const tags = [
        analysis.sector_guess,
        ...(analysis.target_customers || []).slice(0, 2)
      ].filter(Boolean).join(", ");
      setProjectTags(tags);
    }
  }, [showCreateProject, analysis]);

  const handleCreateProject = async () => {
    if (!currentOrg || !user || !analysis) return;

    setCreatingProject(true);
    try {
      const newProject = await organisationService.createProject(currentOrg.id, {
        name: projectName,
        description: projectDescription,
        tags: projectTags.split(",").map(t => t.trim()).filter(Boolean),
        is_active: true
      });

      // Link the analysis to the project
      await feasibilityService.updateAnalysis(analysis.id, {
        project_id: newProject.id
      });

      notify({
        type: "success",
        title: "Project created",
        message: "Project created successfully from feasibility analysis"
      });

      router.push(`/projects/${newProject.id}`);
    } catch (err: any) {
      notify({
        type: "error",
        title: "Creation failed",
        message: err.message || "Failed to create project"
      });
    } finally {
      setCreatingProject(false);
      setShowCreateProject(false);
    }
  };

  const handleDelete = async () => {
    if (!analysis || !window.confirm("Are you sure you want to delete this analysis? This cannot be undone.")) return;

    setDeleting(true);
    try {
      await feasibilityService.deleteAnalysis(analysis.id);
      notify({
        type: "success",
        title: "Analysis deleted",
        message: "Feasibility analysis has been deleted"
      });
      router.push("/feasibility/history");
    } catch (err: any) {
      notify({
        type: "error",
        title: "Delete failed",
        message: err.message || "Failed to delete analysis"
      });
    } finally {
      setDeleting(false);
    }
  };

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
      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 1.5cm 1cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print-hide {
            display: none !important;
          }
          
          .page-break-before {
            page-break-before: always;
          }
          
          .page-break-after {
            page-break-after: always;
          }
          
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          
          /* Ensure cards don't break across pages */
          .print-card {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 1rem;
          }
          
          /* Compact spacing for print */
          .print-compact {
            margin-bottom: 0.75rem !important;
            padding: 0.75rem !important;
          }
          
          /* Header adjustments */
          .print-header {
            margin-bottom: 1rem !important;
          }
          
          /* Grid adjustments for print */
          .print-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          
          /* Text size adjustments */
          .print-text-sm {
            font-size: 0.8rem !important;
            line-height: 1.3 !important;
          }
        }
      `}</style>
      <SEO
        title={`Analysis: ${analysis.idea_title || "New Idea"} - RD Companion`}
        description="R&D feasibility analysis"
      />
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-8 print-full-width">
          <div className="flex items-center justify-between mb-8 print-hide">
            <Link 
              href="/feasibility/history" 
              className="text-gray-600 hover:text-[#001F3F] flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Analysis History
            </Link>
            <div className="flex gap-3">
              <Button 
                variant="default"
                onClick={() => setShowCreateProject(true)}
                className="bg-[#FF6B35] hover:bg-[#FF8C61]"
              >
                <FolderPlus size={16} className="mr-2" />
                Create Project
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Download size={16} className="mr-2" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDelete}
                disabled={deleting}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 size={16} className="mr-2" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>

          <div className="mb-8 print-header page-break-inside-avoid">
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
            <p className="text-lg text-gray-700 leading-relaxed bg-white p-6 rounded-lg border border-gray-200 shadow-sm print-compact print-text-sm">
              {analysis.summary}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8 print-grid">
            {/* Technical Card */}
            <Card className="border-t-4 border-t-blue-500 print-card print-compact">
              <CardHeader className="print-compact">
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
              <CardContent className="print-compact print-text-sm">
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
            <Card className="border-t-4 border-t-green-500 print-card print-compact">
              <CardHeader className="print-compact">
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
              <CardContent className="print-compact print-text-sm">
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
            <Card className="border-t-4 border-t-purple-500 print-card print-compact">
              <CardHeader className="print-compact">
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
              <CardContent className="print-compact print-text-sm">
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

          <div className="grid md:grid-cols-2 gap-6 mb-8 print-grid page-break-before">
            {/* Risks */}
            <Card className="print-card print-compact">
              <CardHeader className="print-compact">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-orange-500" size={20} />
                  <CardTitle>Risks & Regulations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="print-compact print-text-sm">
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
              <Card className="border-l-4 border-l-[#FF6B35] print-card print-compact">
                <CardHeader className="print-compact">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-[#FF6B35]" size={20} />
                    <CardTitle>Recommended Next Actions</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="print-compact print-text-sm">
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

              <Card className="bg-slate-50 print-card print-compact">
                <CardHeader className="pb-2 print-compact">
                  <div className="flex items-center gap-2">
                    <PoundSterling className="text-slate-600" size={20} />
                    <CardTitle className="text-base">R&D Tax Potential</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="print-compact print-text-sm">
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

        {/* Create Project Dialog */}
        <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#FF6B35]" />
                Create Project from Feasibility Analysis
              </DialogTitle>
              <DialogDescription>
                We've auto-populated the project details from your feasibility analysis. 
                Review and edit as needed before creating your project.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-tags">Tags (comma-separated)</Label>
                <Input
                  id="project-tags"
                  value={projectTags}
                  onChange={(e) => setProjectTags(e.target.value)}
                  placeholder="e.g., energy, sustainability, AI"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">AI-Powered Setup</p>
                    <p className="text-sm text-blue-700">
                      This project will be automatically linked to your feasibility analysis, 
                      allowing you to reference technical ratings, commercial insights, and R&D tax considerations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={creatingProject || !projectName.trim()}
                className="bg-[#FF6B35] hover:bg-[#FF8C61]"
              >
                {creatingProject ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}