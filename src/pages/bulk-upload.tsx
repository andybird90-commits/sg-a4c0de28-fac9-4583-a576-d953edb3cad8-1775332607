import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { bulkProjectService } from "@/services/bulkProjectService";
import type { BulkProject, BulkProjectUpload } from "@/services/bulkProjectService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText } from "lucide-react";

export default function BulkUploadPage() {
  const router = useRouter();
  const { user, currentOrg, loading: appLoading } = useApp();
  const { notify } = useNotifications();

  const [form, setForm] = useState({
    name: "",
    description: "",
    sector: "",
    stage: ""
  });

  const [savingProject, setSavingProject] = useState(false);
  const [bulkProject, setBulkProject] = useState<BulkProject | null>(null);

  const [evidenceUploads, setEvidenceUploads] = useState<BulkProjectUpload[]>([]);
  const [financialUploads, setFinancialUploads] = useState<BulkProjectUpload[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [uploadingFinancial, setUploadingFinancial] = useState(false);

  useEffect(() => {
    if (appLoading) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!currentOrg) {
      router.push("/organisation-select");
    }
  }, [appLoading, user, currentOrg, router]);

  useEffect(() => {
    if (!user || !currentOrg) return;

    const { bulkProjectId } = router.query;
    if (!bulkProjectId || typeof bulkProjectId !== "string") return;

    if (bulkProject && bulkProject.id === bulkProjectId) return;

    const loadExisting = async () => {
      try {
        const project = await bulkProjectService.getProjectById(bulkProjectId);
        if (!project) return;

        setBulkProject(project);

        setForm({
          name: project.name,
          description: project.description ?? "",
          sector: project.sector ?? "",
          stage: project.stage ?? ""
        });

        const uploads = project.bulk_project_uploads || [];
        setEvidenceUploads(
          uploads.filter((u) => u.upload_type === "evidence")
        );
        setFinancialUploads(
          uploads.filter((u) => u.upload_type === "financial")
        );
      } catch (error: any) {
        console.error("[BulkUploadPage] Error loading existing bulk project:", error);
        notify({
          type: "error",
          title: "Could not load bulk project",
          message: error?.message || "Please try again."
        });
      }
    };

    void loadExisting();
  }, [router.query, user, currentOrg, bulkProject, notify]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProject = async () => {
    if (!user || !currentOrg) return;
    if (!form.name.trim()) {
      notify({
        type: "error",
        title: "Project name required",
        message: "Please add a name for this bulk project."
      });
      return;
    }

    try {
      setSavingProject(true);
      const project = await bulkProjectService.createProject({
        orgId: currentOrg.id,
        createdBy: user.id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sector: form.sector.trim() || undefined,
        stage: form.stage.trim() || undefined
      });
      setBulkProject(project);

      notify({
        type: "success",
        title: "Bulk project saved",
        message: "You can now upload bulk evidence and financial files for this project."
      });

      const uploads = await bulkProjectService.getUploadsForProject(project.id);
      setEvidenceUploads(
        (uploads as BulkProjectUpload[]).filter(
          (u) => u.upload_type === "evidence"
        )
      );
      setFinancialUploads(
        (uploads as BulkProjectUpload[]).filter(
          (u) => u.upload_type === "financial"
        )
      );
    } catch (error: any) {
      console.error("[BulkUploadPage] Error saving bulk project:", error);
      notify({
        type: "error",
        title: "Save failed",
        message: error?.message || "Could not save bulk project details."
      });
    } finally {
      setSavingProject(false);
    }
  };

  const ensureProjectBeforeUpload = async (): Promise<BulkProject | null> => {
    if (bulkProject) return bulkProject;
    await handleSaveProject();
    return bulkProject;
  };

  const handleEvidenceFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!user || !currentOrg) return;

    if (!bulkProject) {
      notify({
        type: "error",
        title: "Save project first",
        message: "Please save the bulk project details before uploading files."
      });
      event.target.value = "";
      return;
    }

    try {
      setUploadingEvidence(true);
      const uploads: BulkProjectUpload[] = [];

      for (const file of Array.from(files)) {
        const upload = await bulkProjectService.uploadFile({
          bulkProjectId: bulkProject.id,
          createdBy: user.id,
          type: "evidence",
          file
        });
        uploads.push(upload);
      }

      setEvidenceUploads((prev) => [...prev, ...uploads]);

      notify({
        type: "success",
        title: "Evidence uploaded",
        message: "Bulk evidence files have been uploaded for this project."
      });
    } catch (error: any) {
      console.error("[BulkUploadPage] Error uploading evidence files:", error);
      notify({
        type: "error",
        title: "Upload failed",
        message: error?.message || "Could not upload one or more evidence files."
      });
    } finally {
      setUploadingEvidence(false);
      event.target.value = "";
    }
  };

  const handleFinancialFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!user || !currentOrg) return;

    if (!bulkProject) {
      notify({
        type: "error",
        title: "Save project first",
        message: "Please save the bulk project details before uploading files."
      });
      event.target.value = "";
      return;
    }

    try {
      setUploadingFinancial(true);
      const uploads: BulkProjectUpload[] = [];

      for (const file of Array.from(files)) {
        const upload = await bulkProjectService.uploadFile({
          bulkProjectId: bulkProject.id,
          createdBy: user.id,
          type: "financial",
          file
        });
        uploads.push(upload);
      }

      setFinancialUploads((prev) => [...prev, ...uploads]);

      notify({
        type: "success",
        title: "Financials uploaded",
        message: "Bulk financial files have been uploaded for this project."
      });
    } catch (error: any) {
      console.error("[BulkUploadPage] Error uploading financial files:", error);
      notify({
        type: "error",
        title: "Upload failed",
        message: error?.message || "Could not upload one or more financial files."
      });
    } finally {
      setUploadingFinancial(false);
      event.target.value = "";
    }
  };

  const handleDownload = async (upload: BulkProjectUpload) => {
    try {
      await bulkProjectService.downloadUpload(upload);
    } catch (error: any) {
      console.error("[BulkUploadPage] Error downloading bulk upload:", error);
      notify({
        type: "error",
        title: "Download failed",
        message: error?.message || "Could not download this file."
      });
    }
  };

  return (
    <Layout>
      <SEO title="Bulk upload - RD Companion" />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Bulk upload project
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Create a bulk R&amp;D project and upload evidence and financial packs in one go.
              Your advisor will review these and handle the detailed breakdown.
            </p>
          </header>

          <Card className="border border-border bg-card shadow-professional-md">
            <CardHeader>
              <CardTitle>Bulk project details</CardTitle>
              <CardDescription>
                Give this bulk project a clear name and basic context, similar to a Sidekick project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bulk-name">Project name</Label>
                  <Input
                    id="bulk-name"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. Controls upgrade across UK sites"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bulk-sector">Sector</Label>
                  <Input
                    id="bulk-sector"
                    value={form.sector}
                    onChange={(e) => handleChange("sector", e.target.value)}
                    placeholder="e.g. Manufacturing, Software, Construction"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bulk-stage">Stage</Label>
                  <Input
                    id="bulk-stage"
                    value={form.stage}
                    onChange={(e) => handleChange("stage", e.target.value)}
                    placeholder="e.g. Idea, Prototype, In production"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-description">Short description</Label>
                <Textarea
                  id="bulk-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Summarise the projects or activities covered by this bulk upload."
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={handleSaveProject}
                  disabled={savingProject}
                  className="gradient-primary text-slate-950"
                >
                  {savingProject ? "Saving..." : "Save project details"}
                </Button>
                {bulkProject && (
                  <div className="text-xs text-muted-foreground">
                    Project ID:&nbsp;
                    <span className="font-mono">{bulkProject.id}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border bg-card shadow-professional-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Bulk evidence upload
                </CardTitle>
                <CardDescription>
                  Upload technical evidence packs (e.g. design docs, reports, test results) as a single bundle.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-evidence-files">Files</Label>
                  <Input
                    id="bulk-evidence-files"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                    disabled={!bulkProject || uploadingEvidence}
                    onChange={handleEvidenceFilesChange}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Accepted formats include PDF, Office files, images and CSVs. Large packs are fine.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Uploaded evidence files
                  </p>
                  {evidenceUploads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No evidence files uploaded yet for this bulk project.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {evidenceUploads.map((upload) => (
                        <li
                          key={upload.id}
                          className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/40 px-2 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="truncate">{upload.file_name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void handleDownload(upload);
                            }}
                          >
                            Download
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card shadow-professional-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Bulk financials upload
                </CardTitle>
                <CardDescription>
                  Upload financial schedules (e.g. payroll exports, cost summaries) as a bulk pack.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-financial-files">Files</Label>
                  <Input
                    id="bulk-financial-files"
                    type="file"
                    multiple
                    accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.txt"
                    disabled={!bulkProject || uploadingFinancial}
                    onChange={handleFinancialFilesChange}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Upload the main financial packs your advisor will break down (payroll, GL extracts, etc.).
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Uploaded financial files
                  </p>
                  {financialUploads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No financial files uploaded yet for this bulk project.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {financialUploads.map((upload) => (
                        <li
                          key={upload.id}
                          className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/40 px-2 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="truncate">{upload.file_name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void handleDownload(upload);
                            }}
                          >
                            Download
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}