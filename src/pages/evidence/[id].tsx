import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { evidenceService, type EvidenceWithFiles } from "@/services/evidenceService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, Download, ArrowLeft, Calendar, User, Tag, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function EvidenceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [evidence, setEvidence] = useState<EvidenceWithFiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadEvidence();
    }
  }, [id]);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const data = await evidenceService.getEvidenceById(id as string);
      setEvidence(data);
      
      if (data?.evidence_files?.[0]) {
        const url = await evidenceService.getSignedUrl(data.evidence_files[0].file_path);
        setFileUrl(url);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load evidence");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      if (evidence?.evidence_files) {
        for (const file of evidence.evidence_files) {
          await evidenceService.deleteFile(file.id, file.file_path);
        }
      }
      await evidenceService.deleteEvidence(id as string);
      
      toast({
        title: "Evidence deleted",
        description: "The evidence has been removed successfully",
      });
      
      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to delete evidence");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-rd-orange" />
      </div>
    );
  }

  if (!evidence) {
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
          <div className="text-center space-y-4">
            <p className="text-slate-600">Evidence not found</p>
            <Button className="btn-primary" onClick={() => router.push("/home")}>
              Back to Home
            </Button>
          </div>
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
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-rd-navy">Evidence Detail</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-6">
        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* File Preview */}
        {evidence.evidence_files.length > 0 && fileUrl && (
          <Card className="overflow-hidden evidence-card">
            <CardContent className="p-0">
              {evidence.type === 'image' ? (
                <div className="aspect-video relative bg-slate-100">
                  <Image
                    src={fileUrl}
                    alt="Evidence"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-rd-orange" />
                  <p className="font-medium text-slate-700 mb-4">{evidence.evidence_files[0].file_type}</p>
                  <Button variant="outline" className="rounded-xl" asChild>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download File
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-rd-navy mb-3">
              {evidence.project_name}
            </h2>
            {evidence.description && (
              <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                {evidence.description}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Created</p>
                <p className="font-semibold text-slate-900">
                  {new Date(evidence.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {evidence.tag && (
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Tag</p>
                  <span className="inline-block px-3 py-1 bg-rd-orange text-white rounded-full font-semibold text-sm">
                    {evidence.tag}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Delete Button */}
      <div className="p-6 border-t border-slate-200 bg-white safe-bottom">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full h-14 text-lg font-semibold rounded-xl">
              <Trash2 className="mr-2 h-5 w-5" />
              Delete Evidence
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                This action cannot be undone. This will permanently delete this evidence and any attached files.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-red-600 hover:bg-red-700 rounded-xl"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}