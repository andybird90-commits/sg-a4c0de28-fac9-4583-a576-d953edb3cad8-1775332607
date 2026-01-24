import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useApp } from "@/contexts/AppContext";
import { evidenceService, type EvidenceWithFiles } from "@/services/evidenceService";
import { Button } from "@/components/ui/button";
import { Plus, Camera, Upload, FileText, Image, File, AlertCircle, Settings, Folder } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { EmptyState } from "@/components/EmptyState";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/integrations/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const { user, currentOrg, loading } = useApp();
  const [evidence, setEvidence] = useState<EvidenceWithFiles[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (currentOrg && user) {
      loadEvidence();
      checkUserRole();
    }
  }, [currentOrg, user]);

  const checkUserRole = async () => {
    if (!currentOrg || !user) return;
    
    const { data } = await supabase
      .from("organisation_users")
      .select("role")
      .eq("org_id", currentOrg.id)
      .eq("user_id", user.id)
      .single();
    
    setUserRole(data?.role || null);
  };

  const loadEvidence = async () => {
    if (!currentOrg) return;

    setLoadingEvidence(true);
    setError("");
    try {
      const data = await evidenceService.getEvidence(currentOrg.id);
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
    if (diffDays < 7) return "This Week";
    return "Older";
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
  const initials = user.email?.substring(0, 2).toUpperCase() || "U";
  const isAdmin = userRole === "admin";

  return (
    <div className="min-h-screen bg-white">
      <OfflineIndicator />
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 safe-top">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-rd-navy">{currentOrg.name}</h1>
            <p className="text-sm text-slate-600">Your Evidence</p>
          </div>
          <Button
            variant="ghost"
            className="rounded-full w-10 h-10 p-0"
            onClick={() => router.push("/settings")}
          >
            <Avatar className="w-10 h-10 bg-rd-navy">
              <AvatarFallback className="bg-rd-navy text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isAdmin && (
          <div className="bg-gradient-to-r from-[#001F3F] to-[#003366] rounded-xl p-4 text-white">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Settings size={20} />
              Admin Tools
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/organisations")}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Folder className="mr-2 h-4 w-4" />
                Organisations
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/sidekick-access")}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Settings className="mr-2 h-4 w-4" />
                Sidekick Access
              </Button>
            </div>
          </div>
        )}

        <Sheet>
          <SheetTrigger asChild>
            <Button className="w-full h-16 text-lg font-bold bg-rd-orange hover:bg-[#E67510] rounded-xl shadow-lg">
              <Plus className="mr-2 h-6 w-6" strokeWidth={3} />
              Add Evidence
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-3xl">
            <SheetHeader className="pb-6">
              <SheetTitle className="text-xl font-bold text-rd-navy">Add Evidence</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4 pb-8">
              <Link href="/evidence/capture?type=photo">
                <Button variant="outline" className="w-full h-32 flex flex-col gap-3 rounded-xl border-2 hover:border-rd-orange hover:bg-orange-50">
                  <Camera className="h-10 w-10 text-rd-orange" />
                  <span className="font-semibold text-slate-700">Take Photo</span>
                </Button>
              </Link>
              <Link href="/evidence/capture?type=upload-photo">
                <Button variant="outline" className="w-full h-32 flex flex-col gap-3 rounded-xl border-2 hover:border-rd-orange hover:bg-orange-50">
                  <Image className="h-10 w-10 text-rd-orange" />
                  <span className="font-semibold text-slate-700">Upload Photo</span>
                </Button>
              </Link>
              <Link href="/evidence/capture?type=document">
                <Button variant="outline" className="w-full h-32 flex flex-col gap-3 rounded-xl border-2 hover:border-rd-orange hover:bg-orange-50">
                  <Upload className="h-10 w-10 text-rd-orange" />
                  <span className="font-semibold text-slate-700">Upload Document</span>
                </Button>
              </Link>
              <Link href="/evidence/capture?type=note">
                <Button variant="outline" className="w-full h-32 flex flex-col gap-3 rounded-xl border-2 hover:border-rd-orange hover:bg-orange-50">
                  <FileText className="h-10 w-10 text-rd-orange" />
                  <span className="font-semibold text-slate-700">Add Note</span>
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>

        {loadingEvidence ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : evidence.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No evidence yet"
            description="Start by adding your first piece of R&D evidence"
          />
        ) : (
          <div className="space-y-8 pb-6">
            {Object.entries(groupedEvidence).map(([dateKey, items]) => (
              <div key={dateKey} className="space-y-3">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
                  {dateKey}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => {
                    const TypeIcon = getTypeIcon(item.type);
                    return (
                      <Link key={item.id} href={`/evidence/${item.id}`}>
                        <div className="evidence-card p-4 hover:shadow-lg transition-all cursor-pointer">
                          <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rd-orange to-orange-400 flex items-center justify-center">
                                <TypeIcon className="h-7 w-7 text-white" strokeWidth={2.5} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-semibold text-rd-navy truncate text-base">
                                  {item.description || `${item.type} evidence`}
                                </p>
                                {item.tag && (
                                  <span className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-full whitespace-nowrap">
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Folder className="h-4 w-4" />
                                <span>{item.project_name}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}