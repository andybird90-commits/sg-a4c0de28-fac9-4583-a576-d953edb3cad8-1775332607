import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Upload, 
  Mic, 
  FileText, 
  Video,
  X, 
  Loader2, 
  MapPin, 
  Calendar, 
  Save, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { evidenceService } from "@/services/evidenceService";
import { organisationService, type Project } from "@/services/organisationService";
import { useNotifications } from "@/contexts/NotificationContext";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export default function CaptureEvidencePage() {
  const router = useRouter();
  const { currentOrg } = useApp();
  const { notify } = useNotifications();
  const { addToQueue, isOnline } = useOfflineQueue();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    description: "",
    type: "image",
    projectId: "",
    tag: "Work in Progress",
    date: new Date().toISOString().split('T')[0],
    location: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentOrg) {
      loadProjects();
    }
  }, [currentOrg]);

  const loadProjects = async () => {
    if (!currentOrg) return;
    try {
      const data = await organisationService.getProjects(currentOrg.id);
      setProjects(data.filter(p => p.is_active));
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      
      // Auto-detect type
      if (selectedFile.type.startsWith('image/')) setFormData(prev => ({ ...prev, type: 'image' }));
      else if (selectedFile.type.startsWith('video/')) setFormData(prev => ({ ...prev, type: 'video' }));
      else if (selectedFile.type.startsWith('audio/')) setFormData(prev => ({ ...prev, type: 'audio' }));
      else setFormData(prev => ({ ...prev, type: 'document' }));
    }
  };

  const clearFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setLoading(true);
    try {
      const evidence = await evidenceService.createEvidence({
        org_id: currentOrg.id,
        project_id: formData.projectId || undefined,
        description: formData.description,
        type: formData.type,
        tag: formData.tag,
        location: formData.location,
        claim_year: new Date(formData.date).getFullYear()
      });

      if (file) {
        if (isOnline) {
          await evidenceService.uploadEvidenceFile(evidence.id, file);
        } else {
          // Queue file upload for later
          await addToQueue({
            type: "FILE_UPLOAD",
            payload: { evidenceId: evidence.id },
            file: file
          });
        }
      }

      setSuccess(true);
      notify({
        type: "success",
        title: "Evidence captured",
        message: isOnline ? "Evidence uploaded successfully" : "Saved offline. Will upload when online."
      });
      
      // Reset form after delay
      setTimeout(() => {
        setSuccess(false);
        setFormData(prev => ({ ...prev, description: "", location: "" }));
        clearFile();
      }, 2000);

    } catch (error: any) {
      notify({
        type: "error",
        title: "Capture failed",
        message: error.message || "Failed to save evidence"
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50">
          <Card className="max-w-md w-full shadow-professional-lg border-0 text-center py-12">
            <CardContent>
              <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Evidence Captured!</h2>
              <p className="text-muted-foreground mb-8">
                Your evidence has been securely saved to the Sidekick vault.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => setSuccess(false)} className="gradient-primary">
                  Capture More Evidence
                </Button>
                <Button variant="outline" onClick={() => router.push("/home")}>
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Capture Evidence - RD Sidekick" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50 py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => router.push("/home")}
            className="mb-6 hover:bg-white/50 text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <Card className="border-0 shadow-professional-lg overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground">Capture Evidence</CardTitle>
                  <CardDescription>Document your R&D progress</CardDescription>
                </div>
                {!isOnline && (
                  <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                    Offline Mode
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* File Upload Area */}
                <div 
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    previewUrl ? "border-primary/20 bg-primary/5" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  />
                  
                  {previewUrl ? (
                    <div className="relative inline-block">
                      {formData.type === 'image' ? (
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="max-h-64 rounded-lg shadow-professional-md" 
                        />
                      ) : (
                        <div className="h-32 w-32 bg-white rounded-lg shadow-professional flex items-center justify-center mx-auto">
                          {formData.type === 'video' && <Video className="h-12 w-12 text-primary" />}
                          {formData.type === 'audio' && <Mic className="h-12 w-12 text-primary" />}
                          {formData.type === 'document' && <FileText className="h-12 w-12 text-primary" />}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={clearFile}
                        className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-professional-md hover:bg-slate-100 border border-slate-200"
                      >
                        <X className="h-4 w-4 text-slate-600" />
                      </button>
                      <p className="mt-4 text-sm font-medium text-foreground">{file?.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-primary">
                        <Upload className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">Upload Evidence</p>
                        <p className="text-sm text-muted-foreground">
                          Drag & drop or click to upload photo, video, or document
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select 
                      value={formData.projectId} 
                      onValueChange={(val) => setFormData({...formData, projectId: val})}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Project (Optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tag">Phase / Tag</Label>
                    <Select 
                      value={formData.tag} 
                      onValueChange={(val) => setFormData({...formData, tag: val})}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Work in Progress">Work in Progress</SelectItem>
                        <SelectItem value="Prototype">Prototype</SelectItem>
                        <SelectItem value="Testing">Testing</SelectItem>
                        <SelectItem value="Failure/Pivot">Failure / Pivot</SelectItem>
                        <SelectItem value="Iteration">Iteration</SelectItem>
                        <SelectItem value="Background Research">Background Research</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description <span className="text-error">*</span></Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this evidence shows..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location (Optional)</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="e.g. Lab 2, Client Site"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 gradient-primary text-lg font-medium shadow-professional-md hover:shadow-professional-lg transition-professional mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving Evidence...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save Evidence
                    </>
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}