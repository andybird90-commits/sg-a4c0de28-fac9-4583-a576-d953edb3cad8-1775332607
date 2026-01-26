import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";
import { sidekickCommentService } from "@/services/sidekickCommentService";
import { feasibilityService, type FeasibilityAnalysis } from "@/services/feasibilityService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lightbulb, FileText, MessageSquare, Send, Upload, Link as LinkIcon, Trash2, ExternalLink, Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"];
type SidekickEvidenceItem = Database["public"]["Tables"]["sidekick_evidence_items"]["Row"];
type SidekickProjectComment = Database["public"]["Tables"]["sidekick_project_comments"]["Row"] & {
  author?: { email: string };
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  ready_for_review: "bg-blue-500",
  in_review: "bg-yellow-500",
  needs_changes: "bg-orange-500",
  rejected: "bg-red-500",
  transferred: "bg-green-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  ready_for_review: "Ready for Review",
  in_review: "In Review",
  needs_changes: "Needs Changes",
  rejected: "Rejected",
  transferred: "Transferred to Conexa",
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useApp();
  const [project, setProject] = useState<SidekickProject | null>(null);
  const [evidence, setEvidence] = useState<SidekickEvidenceItem[]>([]);
  const [comments, setComments] = useState<SidekickProjectComment[]>([]);
  const [feasibilityAnalysis, setFeasibilityAnalysis] = useState<FeasibilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runningFeasibility, setRunningFeasibility] = useState(false);

  // Evidence form state
  const [evidenceType, setEvidenceType] = useState<"note" | "file" | "link">("note");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceBody, setEvidenceBody] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Comment form state
  const [commentBody, setCommentBody] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!id || !user || !router.isReady) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch project, evidence, and comments
        const [projectData, evidenceData, commentsData] = await Promise.all([
          sidekickProjectService.getProjectById(id as string),
          sidekickEvidenceService.getEvidenceByProject(id as string),
          sidekickCommentService.getCommentsByProject(id as string),
        ]);

        setProject(projectData);
        setEvidence(evidenceData);
        setComments(commentsData);

        // Fetch feasibility analysis separately to avoid blocking main data
        setFeasibilityLoading(true);
        try {
          const analyses = await feasibilityService.getAnalysesByProject(id as string);
          if (analyses && analyses.length > 0) {
            // Get the most recent analysis
            const sortedAnalyses = analyses.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setFeasibilityAnalysis(sortedAnalyses[0]);
          } else {
            setFeasibilityAnalysis(null);
          }
        } catch (feasibilityError) {
          console.error("Error fetching feasibility analysis:", feasibilityError);
          setFeasibilityAnalysis(null);
        } finally {
          setFeasibilityLoading(false);
        }
      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, router.isReady]);

  const handleMarkReadyForReview = async () => {
    if (!project) return;

    setSubmitting(true);
    try {
      await sidekickProjectService.markReadyForReview(project.id);
      const updated = await sidekickProjectService.getProjectById(project.id);
      setProject(updated);
      alert("Project marked ready for review!");
    } catch (error) {
      console.error("Error marking ready for review:", error);
      alert("Failed to mark ready for review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!project || !user) return;

    setSubmitting(true);
    try {
      let filePath = null;
      if (evidenceType === "file" && evidenceFile) {
        filePath = await sidekickEvidenceService.uploadFile(evidenceFile, project.id);
      }

      await sidekickEvidenceService.createEvidence({
        project_id: project.id,
        created_by: user.id,
        type: evidenceType,
        title: evidenceTitle || null,
        body: evidenceBody || null,
        file_path: filePath,
        external_url: evidenceType === "link" ? evidenceUrl : null,
        sidekick_visible: true,
        rd_internal_only: false,
      });

      // Refresh evidence
      const evidenceData = await sidekickEvidenceService.getEvidenceByProject(project.id);
      setEvidence(evidenceData);

      // Reset form
      setEvidenceTitle("");
      setEvidenceBody("");
      setEvidenceUrl("");
      setEvidenceFile(null);
      alert("Evidence added successfully!");
    } catch (error) {
      console.error("Error adding evidence:", error);
      alert("Failed to add evidence");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!project || !user || !commentBody.trim()) return;

    setSubmitting(true);
    try {
      await sidekickCommentService.createComment({
        project_id: project.id,
        author_id: user.id,
        author_role: "client",
        body: commentBody,
      });

      // Refresh comments
      const commentsData = await sidekickCommentService.getCommentsByProject(project.id);
      setComments(commentsData);

      // Reset form
      setCommentBody("");
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunFeasibility = async () => {
    if (!project || !user) return;

    setRunningFeasibility(true);
    try {
      // Create analysis and link it to this project
      const analysis = await feasibilityService.submitForAnalysis({
        ideaDescription: project.description || project.name,
        sector: project.sector || undefined,
        stage: project.stage || undefined,
        projectId: project.id // Pass project ID to link it immediately
      });

      setFeasibilityAnalysis(analysis);
      alert("Feasibility analysis completed successfully!");
    } catch (error) {
      console.error("Error running feasibility analysis:", error);
      alert("Failed to run feasibility analysis");
    } finally {
      setRunningFeasibility(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Loading project...</p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Project not found</p>
          <Link href="/projects">
            <Button variant="ghost">Back to Projects</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const canEdit = project.status === "draft" || project.status === "needs_changes";

  return (
    <>
      <SEO
        title={`${project.name} - RD Sidekick`}
        description={project.description || "Project details"}
      />
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Link href="/projects">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <Badge className={statusColors[project.status]}>
                  {statusLabels[project.status]}
                </Badge>
                {project.sector && <Badge variant="outline">{project.sector}</Badge>}
                {project.stage && <Badge variant="outline">{project.stage}</Badge>}
              </div>
            </div>
            {canEdit && (
              <Button onClick={handleMarkReadyForReview} disabled={submitting}>
                Mark Ready for RD Review
              </Button>
            )}
          </div>

          <Tabs defaultValue="feasibility" className="space-y-6">
            <TabsList>
              <TabsTrigger value="feasibility">
                <Lightbulb className="w-4 h-4 mr-2" />
                Feasibility
              </TabsTrigger>
              <TabsTrigger value="evidence">
                <FileText className="w-4 h-4 mr-2" />
                Evidence
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="w-4 h-4 mr-2" />
                Comments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feasibility">
              <Card>
                <CardHeader>
                  <CardTitle>Feasibility Analysis</CardTitle>
                  <CardDescription>
                    AI-powered feasibility assessment for this project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feasibilityLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading feasibility analysis...</p>
                    </div>
                  ) : !feasibilityAnalysis ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="flex justify-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                          <Lightbulb className="w-8 h-8 text-muted-foreground" />
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-medium mb-2">Feasibility Analysis Not Yet Run</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Run an AI-powered feasibility analysis to assess technical viability, commercial potential, and R&D tax eligibility for this project.
                        </p>
                      </div>
                      <Button 
                        onClick={handleRunFeasibility} 
                        disabled={runningFeasibility}
                        size="lg"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {runningFeasibility ? "Running Analysis..." : "Run Feasibility Analysis"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* High-level Summary */}
                      <div className="border-l-4 border-primary pl-4 py-2 bg-muted/50 rounded-r">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Analysis Summary
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {feasibilityAnalysis.summary || "Feasibility analysis completed"}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant={
                            feasibilityAnalysis.technical_rating === "high" ? "default" :
                            feasibilityAnalysis.technical_rating === "medium" ? "secondary" : "outline"
                          }>
                            Technical: {feasibilityAnalysis.technical_rating?.toUpperCase() || "N/A"}
                          </Badge>
                          <Badge variant={
                            feasibilityAnalysis.commercial_rating === "high" ? "default" :
                            feasibilityAnalysis.commercial_rating === "medium" ? "secondary" : "outline"
                          }>
                            Commercial: {feasibilityAnalysis.commercial_rating?.toUpperCase() || "N/A"}
                          </Badge>
                          <Badge variant={
                            feasibilityAnalysis.rd_tax_flag === "yes" ? "default" :
                            feasibilityAnalysis.rd_tax_flag === "maybe" ? "secondary" : "outline"
                          }>
                            R&D Tax: {feasibilityAnalysis.rd_tax_flag?.toUpperCase() || "N/A"}
                          </Badge>
                        </div>
                      </div>

                      {/* Quick Insights */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Delivery Complexity</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {feasibilityAnalysis.delivery_complexity || "Not assessed"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Estimated Timeframe</h4>
                          <p className="text-sm text-muted-foreground">
                            {feasibilityAnalysis.delivery_timeframe_months 
                              ? `${feasibilityAnalysis.delivery_timeframe_months} months` 
                              : "Not estimated"}
                          </p>
                        </div>
                      </div>

                      {/* View Full Report Button */}
                      <div className="flex gap-3">
                        <Link href={`/feasibility/${feasibilityAnalysis.id}`} className="flex-1">
                          <Button variant="default" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Full Feasibility Report
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          onClick={handleRunFeasibility} 
                          disabled={runningFeasibility}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {runningFeasibility ? "Re-running..." : "Re-run Analysis"}
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Last analyzed: {new Date(feasibilityAnalysis.created_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evidence">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Evidence</CardTitle>
                    <CardDescription>
                      Capture notes, upload files, or add links related to this project
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Evidence Type</Label>
                      <Select value={evidenceType} onValueChange={(value: any) => setEvidenceType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                          <SelectItem value="link">External Link</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="evidence-title">Title (Optional)</Label>
                      <Input
                        id="evidence-title"
                        value={evidenceTitle}
                        onChange={(e) => setEvidenceTitle(e.target.value)}
                        placeholder="Enter title"
                      />
                    </div>

                    {evidenceType === "note" && (
                      <div className="space-y-2">
                        <Label htmlFor="evidence-body">Note Content</Label>
                        <Textarea
                          id="evidence-body"
                          value={evidenceBody}
                          onChange={(e) => setEvidenceBody(e.target.value)}
                          placeholder="Write your note..."
                          rows={4}
                        />
                      </div>
                    )}

                    {evidenceType === "file" && (
                      <div className="space-y-2">
                        <Label htmlFor="evidence-file">Upload File</Label>
                        <Input
                          id="evidence-file"
                          type="file"
                          onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    )}

                    {evidenceType === "link" && (
                      <div className="space-y-2">
                        <Label htmlFor="evidence-url">URL</Label>
                        <Input
                          id="evidence-url"
                          value={evidenceUrl}
                          onChange={(e) => setEvidenceUrl(e.target.value)}
                          placeholder="https://example.com"
                        />
                      </div>
                    )}

                    <Button onClick={handleAddEvidence} disabled={submitting}>
                      <Upload className="w-4 h-4 mr-2" />
                      Add Evidence
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Evidence Items ({evidence.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {evidence.length === 0 ? (
                      <p className="text-muted-foreground">No evidence items yet</p>
                    ) : (
                      <div className="space-y-3">
                        {evidence.map((item) => (
                          <div key={item.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">{item.type}</Badge>
                                  {item.title && <span className="font-medium">{item.title}</span>}
                                </div>
                                {item.body && <p className="text-sm text-muted-foreground">{item.body}</p>}
                                {item.external_url && (
                                  <a
                                    href={item.external_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary underline flex items-center gap-1"
                                  >
                                    <LinkIcon className="w-3 h-3" />
                                    {item.external_url}
                                  </a>
                                )}
                                {item.file_path && (
                                  <p className="text-sm text-muted-foreground">File: {item.file_path}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(item.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="comments">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Comment</CardTitle>
                    <CardDescription>
                      Share updates or respond to RD staff feedback
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Write your comment..."
                      rows={4}
                    />
                    <Button onClick={handleAddComment} disabled={submitting || !commentBody.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Post Comment
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Comments ({comments.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {comments.length === 0 ? (
                      <p className="text-muted-foreground">No comments yet</p>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="border-l-2 border-primary pl-4 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={comment.author_role === "rd_staff" ? "default" : "secondary"}>
                                {comment.author_role === "rd_staff" ? "RD Staff" : "Client"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {comment.author?.email || "Unknown"}
                              </span>
                            </div>
                            <p className="text-sm">{comment.body}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(comment.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  );
}