import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { AdminNav } from "@/components/AdminNav";
import { useApp } from "@/contexts/AppContext";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";
import { sidekickCommentService } from "@/services/sidekickCommentService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Building2, 
  CheckCircle, 
  XCircle, 
  Send, 
  FileText, 
  MessageSquare,
  Link as LinkIcon,
  ExternalLink,
  Shield
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"] & {
  organisations?: {
    id: string;
    name: string;
    sidekick_enabled: boolean;
    linked_conexa_company_id: string | null;
    linked_conexa_company_name: string | null;
  };
};
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

export default function RDReviewProjectPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useApp();
  const [project, setProject] = useState<SidekickProject | null>(null);
  const [evidence, setEvidence] = useState<SidekickEvidenceItem[]>([]);
  const [comments, setComments] = useState<SidekickProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Action dialogs
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [actionComment, setActionComment] = useState("");

  // Verify business search
  const [conexaSearch, setConexaSearch] = useState("");
  const [conexaCompanies, setConexaCompanies] = useState<any[]>([]);
  const [selectedConexaId, setSelectedConexaId] = useState<string | null>(null);

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
        const [projectData, evidenceData, commentsData] = await Promise.all([
          sidekickProjectService.getProjectById(id as string),
          sidekickEvidenceService.getEvidenceByProject(id as string),
          sidekickCommentService.getCommentsByProject(id as string),
        ]);

        setProject(projectData);
        setEvidence(evidenceData);
        setComments(commentsData);
      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, router.isReady]);

  const handleStartReview = async () => {
    if (!project || !user) return;

    setSubmitting(true);
    try {
      await sidekickProjectService.updateProject(project.id, {
        status: "in_review",
        reviewed_by_user_id: user.id,
      });
      const updated = await sidekickProjectService.getProjectById(project.id);
      setProject(updated);
      alert("Review started!");
    } catch (error) {
      console.error("Error starting review:", error);
      alert("Failed to start review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendBack = async () => {
    if (!project || !user || !actionComment.trim()) return;

    setSubmitting(true);
    try {
      await sidekickCommentService.createComment({
        project_id: project.id,
        author_id: user.id,
        author_role: "rd_staff",
        body: actionComment,
      });

      await sidekickProjectService.updateProject(project.id, {
        status: "needs_changes",
      });

      const [updated, commentsData] = await Promise.all([
        sidekickProjectService.getProjectById(project.id),
        sidekickCommentService.getCommentsByProject(project.id),
      ]);

      setProject(updated);
      setComments(commentsData);
      setActionComment("");
      setShowSendBackDialog(false);
      alert("Project sent back for edits");
    } catch (error) {
      console.error("Error sending back:", error);
      alert("Failed to send back project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!project || !user || !actionComment.trim()) return;

    setSubmitting(true);
    try {
      await sidekickCommentService.createComment({
        project_id: project.id,
        author_id: user.id,
        author_role: "rd_staff",
        body: `[REJECTED] ${actionComment}`,
      });

      await sidekickProjectService.updateProject(project.id, {
        status: "rejected",
        reviewed_by_user_id: user.id,
      });

      const [updated, commentsData] = await Promise.all([
        sidekickProjectService.getProjectById(project.id),
        sidekickCommentService.getCommentsByProject(project.id),
      ]);

      setProject(updated);
      setComments(commentsData);
      setActionComment("");
      setShowRejectDialog(false);
      alert("Project marked as not qualifying");
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("Failed to reject project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!project || !user) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/sidekick/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          staff_user_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      const [updated, commentsData] = await Promise.all([
        sidekickProjectService.getProjectById(project.id),
        sidekickCommentService.getCommentsByProject(project.id),
      ]);

      setProject(updated);
      setComments(commentsData);
      setShowTransferDialog(false);
      alert("Project transferred to Conexa successfully!");
    } catch (error: any) {
      console.error("Error transferring:", error);
      alert(error.message || "Failed to transfer project");
    } finally {
      setSubmitting(false);
    }
  };

  const searchConexaCompanies = async () => {
    if (!conexaSearch.trim()) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("organisations")
        .select("id, name, organisation_code")
        .ilike("name", `%${conexaSearch}%`)
        .limit(10);

      if (error) throw error;
      setConexaCompanies(data || []);
    } catch (error) {
      console.error("Error searching companies:", error);
    }
  };

  const handleVerifyBusiness = async () => {
    if (!project || !user || !selectedConexaId) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/rdpro/sidekick/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sidekick_company_id: project.organisations?.id,
          conexa_company_id: selectedConexaId,
          staff_user_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      const updated = await sidekickProjectService.getProjectById(project.id);
      setProject(updated);
      setShowVerifyDialog(false);
      setConexaSearch("");
      setConexaCompanies([]);
      setSelectedConexaId(null);
      alert("Business verified and linked successfully!");
    } catch (error: any) {
      console.error("Error verifying business:", error);
      alert(error.message || "Failed to verify business");
    } finally {
      setSubmitting(false);
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
        </div>
      </Layout>
    );
  }

  const isLinked = !!project.organisations?.linked_conexa_company_id;
  const canTransfer = isLinked && ["ready_for_review", "in_review"].includes(project.status);

  return (
    <>
      <SEO
        title={`Review: ${project.name} - RD Sidekick Admin`}
        description="Review Sidekick project"
      />
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <AdminNav />

          <Link href="/admin/rd-review">
            <Button variant="ghost" className="mb-4 mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Review Queue
            </Button>
          </Link>

          {/* Company Banner */}
          <Card className="mb-6 border-2">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">{project.organisations?.name}</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {project.organisations?.sidekick_enabled && isLinked && (
                      <Badge className="bg-green-600">
                        <Shield className="w-3 h-3 mr-1" />
                        Sidekick Enabled
                      </Badge>
                    )}
                    {isLinked ? (
                      <Badge variant="secondary">
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Linked to Conexa: {project.organisations?.linked_conexa_company_name}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Not Linked to Conexa</Badge>
                    )}
                  </div>
                </div>
                {!isLinked && (
                  <Button onClick={() => setShowVerifyDialog(true)}>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Business
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project Info */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              {project.status === "ready_for_review" && (
                <Button onClick={handleStartReview} disabled={submitting}>
                  Start Review
                </Button>
              )}
              {["ready_for_review", "in_review"].includes(project.status) && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowSendBackDialog(true)}
                    disabled={submitting}
                  >
                    Send Back for Edits
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={submitting}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark Not Qualifying
                  </Button>
                  <Button
                    onClick={() => setShowTransferDialog(true)}
                    disabled={!canTransfer || submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Transfer to Conexa RD Pro
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="evidence" className="space-y-6">
            <TabsList>
              <TabsTrigger value="evidence">
                <FileText className="w-4 h-4 mr-2" />
                Evidence ({evidence.length})
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="w-4 h-4 mr-2" />
                Comments ({comments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="evidence">
              <Card>
                <CardHeader>
                  <CardTitle>Evidence Items</CardTitle>
                  <CardDescription>
                    All evidence provided by the client for this project
                  </CardDescription>
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
                                {item.rd_internal_only && (
                                  <Badge variant="secondary">RD Internal Only</Badge>
                                )}
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
            </TabsContent>

            <TabsContent value="comments">
              <Card>
                <CardHeader>
                  <CardTitle>Comments & Feedback</CardTitle>
                  <CardDescription>
                    Communication between client and RD staff
                  </CardDescription>
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
            </TabsContent>
          </Tabs>

          {/* Send Back Dialog */}
          <Dialog open={showSendBackDialog} onOpenChange={setShowSendBackDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Back for Edits</DialogTitle>
                <DialogDescription>
                  Explain what needs to be changed or clarified
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="What changes are needed?"
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSendBackDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendBack}
                  disabled={!actionComment.trim() || submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Back
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject Dialog */}
          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark as Not Qualifying</DialogTitle>
                <DialogDescription>
                  Explain why this project doesn't qualify for R&D
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Why is this project not qualifying?"
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={!actionComment.trim() || submitting}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark Not Qualifying
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Transfer Dialog */}
          <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer to Conexa RD Pro</DialogTitle>
                <DialogDescription>
                  This will mark the project as transferred and create a record in Conexa
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Company:</p>
                  <p className="text-sm text-muted-foreground">{project.organisations?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Linked to Conexa:</p>
                  <p className="text-sm text-muted-foreground">
                    {project.organisations?.linked_conexa_company_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Project:</p>
                  <p className="text-sm text-muted-foreground">{project.name}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleTransfer}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Transfer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Verify Business Dialog */}
          <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Verify Business</DialogTitle>
                <DialogDescription>
                  Link this Sidekick company to an existing Conexa company
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="conexa-search">Search Conexa Companies</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="conexa-search"
                      value={conexaSearch}
                      onChange={(e) => setConexaSearch(e.target.value)}
                      placeholder="Search by company name..."
                      onKeyDown={(e) => e.key === "Enter" && searchConexaCompanies()}
                    />
                    <Button onClick={searchConexaCompanies}>Search</Button>
                  </div>
                </div>

                {conexaCompanies.length > 0 && (
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm font-medium mb-2">Select a company:</p>
                    <div className="space-y-2">
                      {conexaCompanies.map((company) => (
                        <div
                          key={company.id}
                          className={`p-3 border rounded cursor-pointer hover:bg-accent ${
                            selectedConexaId === company.id ? "border-primary bg-accent" : ""
                          }`}
                          onClick={() => setSelectedConexaId(company.id)}
                        >
                          <p className="font-medium">{company.name}</p>
                          {company.organisation_code && (
                            <p className="text-xs text-muted-foreground">
                              Code: {company.organisation_code}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyBusiness}
                  disabled={!selectedConexaId || submitting}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify & Link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </>
  );
}