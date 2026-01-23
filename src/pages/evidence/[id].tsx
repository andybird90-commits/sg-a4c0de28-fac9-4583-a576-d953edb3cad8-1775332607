import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { evidenceService, type EvidenceWithFiles } from "@/services/evidenceService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, Download, ArrowLeft, Calendar, User, Tag } from "lucide-react";
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

export default function EvidenceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
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
        const url = await evidenceService.getSignedUrl(data.evidence_files[0].storage_path);
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
      // If there are files, delete them first (though cascade delete handles this in DB, we clean up storage)
      if (evidence?.evidence_files) {
        for (const file of evidence.evidence_files) {
          await evidenceService.deleteFile(file.id, file.storage_path);
        }
      }
      await evidenceService.deleteEvidence(id as string);
      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to delete evidence");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!evidence) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Evidence not found</p>
          <Button variant="link" onClick={() => router.push("/home")}>
            Back to Home
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" className="pl-0" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* File Preview */}
        {evidence.evidence_files.length > 0 && fileUrl && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {evidence.type === 'image' ? (
                <div className="aspect-video relative bg-slate-100 dark:bg-slate-800">
                  <Image
                    src={fileUrl}
                    alt="Evidence"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800">
                  <p className="font-medium mb-4">{evidence.evidence_files[0].mime_type}</p>
                  <Button variant="outline" asChild>
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

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {evidence.project_name}
            </h1>
            <p className="text-lg text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {evidence.description || "No description provided"}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(evidence.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{evidence.creator_name}</span>
            </div>
            {evidence.tag && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full font-medium">
                  {evidence.tag}
                </span>
              </div>
            )}
          </div>

          <div className="pt-6 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Evidence
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this evidence and any attached files.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Layout>
  );
}