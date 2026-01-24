import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { evidenceService } from "@/services/evidenceService";
import { organisationService } from "@/services/organisationService";
import { Loader2, Camera, Upload, X, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { EmptyState } from "@/components/EmptyState";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useNotifications } from "@/contexts/NotificationContext";

type Project = {
  id: string;
  name: string;
};

const TAGS = ["Prototype", "Test", "Failure", "Iteration", "Work-in-progress", "Other"];

export default function CapturePage() {
  const router = useRouter();
  const { type } = router.query;
  const { user, currentOrg } = useApp();
  const { isOnline, addToQueue } = useOfflineQueue();
  const { notify } = useNotifications();
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("Work-in-progress");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentOrg) {
      loadProjects();
    }
  }, [currentOrg]);

  useEffect(() => {
    // Auto-trigger file selection based on type
    if (type === "photo" && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if ((type === "upload-photo" || type === "document") && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [type]);

  const loadProjects = async () => {
    if (!currentOrg) return;
    try {
      const data = await organisationService.getProjects(currentOrg.id);
      setProjects(data);
      if (data.length > 0) {
        setProjectId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!currentOrg || !user) return;
    if (!description && !file) {
      setError("Please add a description or a file");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Check if offline
      if (!isOnline) {
        // Convert file to base64 if present
        let fileData: string | undefined;
        let fileName: string | undefined;
        let mimeType: string | undefined;

        if (file) {
          const reader = new FileReader();
          const fileReadPromise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          reader.readAsDataURL(file);
          fileData = await fileReadPromise;
          fileName = file.name;
          mimeType = file.type;
        }

        // Add to offline queue
        await addToQueue({
          type: (type as any) || "note",
          org_id: currentOrg.id,
          project_id: projectId || null,
          description: description,
          tag: tag,
          claim_year: new Date().getFullYear(),
          file_data: fileData,
          file_name: fileName,
          mime_type: mimeType
        });

        router.push("/home");
        return;
      }

      // Online upload
      const evidence = await evidenceService.createEvidence({
        org_id: currentOrg.id,
        project_id: projectId || null,
        created_by: user.id,
        type: (type as any) || "note",
        description: description,
        tag: tag,
        claim_year: new Date().getFullYear()
      });

      if (file) {
        await evidenceService.uploadFile(currentOrg.id, evidence.id, file);
      }

      // Find project name for notification
      const project = projects.find(p => p.id === projectId);
      const projectName = project ? project.name : "your project";

      notify({
        type: "success",
        title: "Evidence uploaded",
        message: `Your ${type === "photo" ? "photo" : type === "document" ? "document" : "note"} has been saved to ${projectName}.`
      });

      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to create evidence");
      notify({
        type: "error",
        title: "Upload failed",
        message: "We couldn't upload this evidence. Please try again."
      });
    } finally {
      setUploading(false);
    }
  };

  const getPageTitle = () => {
    switch (type) {
      case "photo": return "Take Photo";
      case "upload-photo": return "Upload Photo";
      case "document": return "Upload Document";
      case "note": return "Add Note";
      default: return "Add Evidence";
    }
  };

  if (projects.length === 0 && !uploading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="p-4 safe-top">
          <Button
            variant="ghost"
            className="rounded-full w-10 h-10 p-0"
            onClick={() => router.push("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <EmptyState
            icon={Upload}
            title="No Projects Yet"
            description="Your consultant will assign projects soon."
            action={
              <Button 
                className="btn-primary mt-6"
                onClick={() => router.push("/home")}
              >
                Back to Home
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 safe-top">
        <div className="px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            className="rounded-full w-10 h-10 p-0 -ml-2"
            onClick={() => router.push("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-rd-navy">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Hidden inputs for file selection */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={cameraInputRef}
          onChange={handleFileChange}
        />
        <input
          type="file"
          accept={type === "document" ? ".pdf,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg" : "image/*"}
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-5">
          {/* File Preview */}
          {(previewUrl || file) && (
            <Card className="overflow-hidden evidence-card">
              <CardContent className="p-0 relative">
                {previewUrl ? (
                  <div className="aspect-video relative">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50">
                    <p className="text-sm text-slate-600 font-medium">
                      {file?.name}
                    </p>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-3 right-3 rounded-full w-10 h-10 shadow-lg"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Trigger buttons if no file selected yet for file types */}
          {!file && type !== "note" && (
            <Button
              variant="outline"
              className="w-full h-40 border-dashed border-2 border-slate-300 hover:border-rd-orange hover:bg-orange-50 rounded-xl"
              onClick={() => {
                if (type === "photo") cameraInputRef.current?.click();
                else fileInputRef.current?.click();
              }}
            >
              <div className="flex flex-col items-center gap-3">
                {type === "photo" ? (
                  <Camera className="h-12 w-12 text-rd-orange" strokeWidth={2} />
                ) : (
                  <Upload className="h-12 w-12 text-rd-orange" strokeWidth={2} />
                )}
                <span className="font-semibold text-slate-700">
                  {type === "photo" ? "Tap to take photo" : "Tap to select file"}
                </span>
              </div>
            </Button>
          )}

          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-12 rounded-xl border-slate-300">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold">Description</Label>
            <Textarea
              placeholder="Describe what this is..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="rounded-xl border-slate-300 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold">Tag</Label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    tag === t
                      ? "bg-rd-orange text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Button */}
      <div className="p-6 border-t border-slate-200 bg-white safe-bottom">
        <Button 
          className="btn-primary w-full h-14 text-lg"
          onClick={handleSubmit}
          disabled={uploading || (!description && !file)}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {isOnline ? "Uploading..." : "Saving offline..."}
            </>
          ) : (
            "Save Evidence"
          )}
        </Button>
      </div>
    </div>
  );
}