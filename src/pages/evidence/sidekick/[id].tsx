import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Trash2, Download, FileText, Image, Video, Mic, File, ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type SidekickEvidenceItem = Database["public"]["Tables"]["sidekick_evidence_items"]["Row"];

export default function SidekickEvidenceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useApp();
  const [evidence, setEvidence] = useState<SidekickEvidenceItem | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editType, setEditType] = useState<"note" | "file" | "link">("note");

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!id || !user || !router.isReady) return;

    const fetchEvidence = async () => {
      try {
        setLoading(true);
        const data = await sidekickEvidenceService.getEvidenceById(id as string);
        setEvidence(data);

        // If there's a file, get the signed URL
        if (data.file_path) {
          const url = await sidekickEvidenceService.getSignedUrl(data.file_path);
          setFileUrl(url);
        }
      } catch (error) {
        console.error("Error fetching evidence:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvidence();
  }, [id, user, router.isReady]);

  useEffect(() => {
    if (editDialogOpen && evidence) {
      setEditTitle(evidence.title || "");
      setEditBody(evidence.body || "");
      setEditTags(evidence.tags || []);
      setEditType(evidence.type as "note" | "file" | "link");
    }
  }, [editDialogOpen, evidence]);

  const handleEdit = async () => {
    if (!evidence) return;

    setSubmitting(true);
    try {
      await sidekickEvidenceService.updateEvidence(evidence.id, {
        title: editTitle || null,
        body: editBody || null,
        tags: editTags.length > 0 ? editTags : null,
        type: editType,
      });

      const updated = await sidekickEvidenceService.getEvidenceById(evidence.id);
      setEvidence(updated);
      setEditDialogOpen(false);
      alert("Evidence updated successfully!");
    } catch (error) {
      console.error("Error updating evidence:", error);
      alert("Failed to update evidence");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!evidence || !window.confirm("Are you sure you want to delete this evidence? This action cannot be undone.")) return;

    setDeleting(true);
    try {
      await sidekickEvidenceService.deleteEvidence(evidence.id);
      alert("Evidence deleted successfully");
      router.push(`/projects/${evidence.project_id}`);
    } catch (error) {
      console.error("Error deleting evidence:", error);
      alert("Failed to delete evidence");
    } finally {
      setDeleting(false);
    }
  };

  const getFileIcon = () => {
    if (!evidence?.file_path) return <FileText className="w-8 h-8" />;

    const path = evidence.file_path.toLowerCase();
    if (path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return <Image className="w-8 h-8" />;
    if (path.match(/\.(mp4|mov|avi|webm)$/)) return <Video className="w-8 h-8" />;
    if (path.match(/\.(mp3|wav|ogg|m4a)$/)) return <Mic className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  if (!user) return null;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Loading evidence...</p>
        </div>
      </Layout>
    );
  }

  if (!evidence) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Evidence not found</p>
          <Link href="/projects">
            <Button variant="ghost">Back to Projects</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isImage = evidence.file_path?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);

  return (
    <>
      <SEO
        title={`${evidence.title || "Evidence"} - RD Sidekick`}
        description={evidence.body || "Evidence details"}
      />
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link href={`/projects/${evidence.project_id}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Project
            </Button>
          </Link>

          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{evidence.title || "Evidence"}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{evidence.type}</Badge>
                {evidence.tags && evidence.tags.map((tag, idx) => (
                  <Badge key={idx} className="bg-primary/10 text-primary">{tag}</Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDelete}
                disabled={deleting}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* File Preview/Download */}
            {evidence.file_path && fileUrl && (
              <Card>
                <CardContent className="p-6">
                  {isImage ? (
                    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={fileUrl} 
                        alt={evidence.title || "Evidence"}
                        className="object-contain w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-6 bg-muted rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center text-primary">
                          {getFileIcon()}
                        </div>
                        <div>
                          <p className="font-medium">Attached File</p>
                          <p className="text-sm text-muted-foreground">{evidence.file_path.split('/').pop()}</p>
                        </div>
                      </div>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* External URL */}
            {evidence.external_url && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium mb-1">External Link</p>
                      <p className="text-sm text-muted-foreground">{evidence.external_url}</p>
                    </div>
                    <a href={evidence.external_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Link
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Body/Description */}
            {evidence.body && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground">{evidence.body}</p>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-muted-foreground">{new Date(evidence.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-muted-foreground">{new Date(evidence.updated_at || evidence.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Visible to RD Staff</p>
                    <p className="text-muted-foreground">{evidence.sidekick_visible ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="font-medium">Internal Only</p>
                    <p className="text-muted-foreground">{evidence.rd_internal_only ? "Yes" : "No"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-primary" />
                  Edit Evidence
                </DialogTitle>
                <DialogDescription>
                  Update the evidence details below
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Evidence Type</Label>
                  <Select value={editType} onValueChange={(value: any) => setEditType(value)}>
                    <SelectTrigger id="edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title (Optional)</Label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-body">Description</Label>
                  <Textarea
                    id="edit-body"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    placeholder="Enter description"
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                  <Input
                    id="edit-tags"
                    value={editTags.join(", ")}
                    onChange={(e) => setEditTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                    placeholder="e.g., Design, Development, Testing"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleEdit}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </>
  );
}