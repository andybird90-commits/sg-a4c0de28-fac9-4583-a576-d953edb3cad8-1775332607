import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { useApp } from "@/contexts/AppContext";
import { evidenceService, type EvidenceWithFiles } from "@/services/evidenceService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Camera, Upload, FileText, Image, File, Mic, Video, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function HomePage() {
  const router = useRouter();
  const { user, currentOrg, loading } = useApp();
  const [evidence, setEvidence] = useState<EvidenceWithFiles[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (currentOrg) {
      loadEvidence();
    }
  }, [currentOrg]);

  const loadEvidence = async () => {
    if (!currentOrg) return;

    setLoadingEvidence(true);
    setError("");
    try {
      const data = await evidenceService.getEvidenceList(currentOrg.id);
      setEvidence(data);
    } catch (err: any) {
      setError(err.message || "Failed to load evidence");
    } finally {
      setLoadingEvidence(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return Image;
      case "document":
        return File;
      case "note":
        return FileText;
      case "audio":
        return Mic;
      case "video":
        return Video;
      default:
        return FileText;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const groupByDate = (items: EvidenceWithFiles[]) => {
    const groups: { [key: string]: EvidenceWithFiles[] } = {};
    items.forEach((item) => {
      const dateKey = formatDate(item.created_at);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  };

  if (loading || !user || !currentOrg) {
    return null;
  }

  const groupedEvidence = groupByDate(evidence);

  return (
    <Layout title="Evidence Timeline">
      <div className="max-w-2xl mx-auto space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="w-full shadow-lg">
              <Plus className="mr-2 h-5 w-5" />
              Add Evidence
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Add Evidence</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 mt-6 pb-6">
              <Link href="/evidence/capture?type=photo">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <Camera className="h-8 w-8" />
                  <span>Take Photo</span>
                </Button>
              </Link>
              <Link href="/evidence/capture?type=upload-photo">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <Image className="h-8 w-8" />
                  <span>Upload Photo</span>
                </Button>
              </Link>
              <Link href="/evidence/capture?type=document">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <Upload className="h-8 w-8" />
                  <span>Upload Document</span>
                </Button>
              </Link>
              <Link href="/evidence/capture?type=note">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <FileText className="h-8 w-8" />
                  <span>Add Note</span>
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>

        {loadingEvidence ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : evidence.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Camera className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Evidence Yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Start capturing your R&D work by adding your first piece of evidence
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvidence).map(([dateKey, items]) => (
              <div key={dateKey} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 px-1">
                  {dateKey}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => {
                    const TypeIcon = getTypeIcon(item.type);
                    return (
                      <Link key={item.id} href={`/evidence/${item.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                  <TypeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900 dark:text-white truncate">
                                      {item.description || `${item.type} evidence`}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      {item.project_name}
                                    </p>
                                  </div>
                                  {item.tag && (
                                    <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-full whitespace-nowrap">
                                      {item.tag}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}