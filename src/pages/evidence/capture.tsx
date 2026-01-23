import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { evidenceService } from "@/services/evidenceService";
import { organisationService } from "@/services/organisationService";
import { Loader2, Camera, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";

type Project = {
  id: string;
  name: string;
};

const TAGS = ['Prototype', 'Test', 'Failure', 'Iteration', 'Work-in-progress', 'Other'];

export default function CapturePage() {
  const router = useRouter();
  const { type } = router.query;
  const { user, currentOrg } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
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
    if (type === 'photo' && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if ((type === 'upload-photo' || type === 'document') && fileInputRef.current) {
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
      if (selectedFile.type.startsWith('image/')) {
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
      // 1. Create evidence item
      const evidence = await evidenceService.createEvidence({
        org_id: currentOrg.id,
        project_id: projectId || null,
        created_by: user.id,
        type: (type as any) || 'note',
        description: description,
        tag: tag,
        claim_year: new Date().getFullYear()
      });

      // 2. Upload file if present
      if (file) {
        await evidenceService.uploadFile(currentOrg.id, evidence.id, file);
      }

      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to create evidence");
    } finally {
      setUploading(false);
    }
  };

  const getPageTitle = () => {
    switch (type) {
      case 'photo': return 'Take Photo';
      case 'upload-photo': return 'Upload Photo';
      case 'document': return 'Upload Document';
      case 'note': return 'Add Note';
      default: return 'Add Evidence';
    }
  };

  return (
    <Layout title={getPageTitle()}>
      <div className="max-w-md mx-auto space-y-6">
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
          accept={type === 'document' ? ".pdf,.doc,.docx,.xls,.xlsx" : "image/*"}
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* File Preview */}
          {(previewUrl || file) && (
            <Card className="overflow-hidden">
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
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {file?.name}
                    </p>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Trigger buttons if no file selected yet for file types */}
          {!file && type !== 'note' && (
            <Button
              variant="outline"
              className="w-full h-32 border-dashed border-2"
              onClick={() => {
                if (type === 'photo') cameraInputRef.current?.click();
                else fileInputRef.current?.click();
              }}
            >
              <div className="flex flex-col items-center gap-2">
                {type === 'photo' ? <Camera className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
                <span>{type === 'photo' ? 'Tap to take photo' : 'Tap to select file'}</span>
              </div>
            </Button>
          )}

          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
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
            <Label>Description</Label>
            <Textarea
              placeholder="Describe what this is..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Tag</Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAGS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleSubmit}
            disabled={uploading || (!description && !file)}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Save Evidence"
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}