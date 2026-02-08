import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, Search, Filter, Image, FileText, Mic, Video, StickyNote, Loader2, Eye, Calendar, Tag as TagIcon, Folder } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import type { EvidenceWithFiles } from "@/services/evidenceService";
import { organisationService, type Project } from "@/services/organisationService";

const typeIcons: Record<string, any> = {
  image: Image,
  document: FileText,
  audio: Mic,
  video: Video,
  note: StickyNote
};

interface AttachSidekickModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  claimId: string;
}

export function AttachSidekickModal({ isOpen, onClose, orgId, claimId }: AttachSidekickModalProps) {
  const { notify } = useNotifications();
  const [evidence, setEvidence] = useState<EvidenceWithFiles[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<EvidenceWithFiles | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [filters, setFilters] = useState({
    projectId: "",
    fromDate: "",
    toDate: "",
    tag: ""
  });

  useEffect(() => {
    if (isOpen && orgId) {
      loadEvidence();
      loadProjects();
    }
  }, [isOpen, orgId]);

  const loadProjects = async () => {
    try {
      const data = await organisationService.getProjects(orgId);
      setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const loadEvidence = async () => {
    if (!orgId) {
      notify({
        type: "error",
        title: "Organisation not found",
        message: "Please select an organisation first"
      });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ org_id: orgId });
      if (filters.projectId) params.append("project_id", filters.projectId);
      if (filters.fromDate) params.append("from", filters.fromDate);
      if (filters.toDate) params.append("to", filters.toDate);

      const response = await fetch(`/api/sidekick/evidence?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load evidence");
      }

      let data = await response.json();

      // Apply tag filter (client-side)
      if (filters.tag) {
        data = data.filter((item: EvidenceWithFiles) => item.tag === filters.tag);
      }

      setEvidence(data);
    } catch (error: any) {
      console.error("Error loading evidence:", error);
      notify({
        type: "error",
        title: "Load failed",
        message: error.message || "Could not load evidence from RD Companion"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (item: EvidenceWithFiles) => {
    setSelectedItem(item);
    setPreviewLoading(true);
    
    try {
      const response = await fetch(`/api/sidekick/evidence/${item.id}/export`);
      if (!response.ok) throw new Error("Failed to load preview");
      
      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      console.error("Error loading preview:", error);
      notify({
        type: "error",
        title: "Preview failed",
        message: "Could not load evidence details"
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAttach = async () => {
    setAttaching(true);
    try {
      const response = await fetch("/api/rdpro/sidekick/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId,
          org_id: orgId,
          evidence_ids: Array.from(selectedIds)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to attach evidence");
      }

      const result = await response.json();

      notify({
        type: "success",
        title: "Evidence attached",
        message: `Attached ${result.attached_count} item${result.attached_count !== 1 ? "s" : ""} from RD Companion`
      });

      onClose();
    } catch (error: any) {
      console.error("Error attaching evidence:", error);
      notify({
        type: "error",
        title: "Attach failed",
        message: error.message || "Could not attach evidence"
      });
    } finally {
      setAttaching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#001F3F] to-[#003366]">
          <div>
            <h2 className="text-2xl font-bold text-white">Attach from RD Companion</h2>
            <p className="text-sm text-gray-300 mt-1">Browse and select evidence to attach to your R&D claim</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 mb-1">Project</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                value={filters.projectId}
                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 mb-1">From Date</label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="border-gray-300"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 mb-1">To Date</label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="border-gray-300"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 mb-1">Tag Filter</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                value={filters.tag}
                onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
              >
                <option value="">All tags</option>
                <option value="Prototype">Prototype</option>
                <option value="Test">Test</option>
                <option value="Failure">Failure</option>
                <option value="Iteration">Iteration</option>
                <option value="Work-in-progress">WIP</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={loadEvidence} 
                variant="outline" 
                disabled={loading}
                className="w-full border-[#001F3F] text-[#001F3F] hover:bg-[#001F3F] hover:text-white"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Filter size={16} className="mr-2" />
                )}
                Apply Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Evidence List */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                <p className="ml-3 text-gray-500">Loading evidence...</p>
              </div>
            ) : evidence.length === 0 ? (
              <div className="text-center py-12">
                <StickyNote className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">No evidence found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or add evidence in RD Companion</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {evidence.map((item) => {
                  const Icon = typeIcons[item.type] || FileText;
                  const isSelected = selectedIds.has(item.id);
                  const isViewing = selectedItem?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${
                        isViewing
                          ? "border-[#001F3F] bg-blue-50 shadow-md"
                          : isSelected
                          ? "border-[#FF6B35] bg-orange-50"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() => loadPreview(item)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <Icon size={24} className="text-[#001F3F] flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 mb-1">
                            {item.description || "No description"}
                          </p>
                          {item.project_name && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                              <Folder size={12} />
                              <span>{item.project_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.tag && (
                              <Badge variant="secondary" className="text-xs">
                                <TagIcon size={10} className="mr-1" />
                                {item.tag}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400 flex items-center">
                              <Calendar size={10} className="mr-1" />
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadPreview(item);
                          }}
                          className="text-[#001F3F] hover:text-[#FF6B35]"
                        >
                          <Eye size={16} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Pane */}
          <div className="w-96 bg-gray-50 overflow-y-auto border-l border-gray-200">
            {!selectedItem ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Eye className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No item selected</p>
                <p className="text-gray-400 text-sm mt-2">Click an item to see details</p>
              </div>
            ) : previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
              </div>
            ) : previewData ? (
              <div className="p-6">
                <h3 className="text-lg font-bold text-[#001F3F] mb-4">Evidence Details</h3>
                
                {/* Preview Files */}
                {previewData.evidence_files && previewData.evidence_files.length > 0 && (
                  <div className="mb-6">
                    {previewData.evidence_files.map((file: any, index: number) => (
                      <div key={index} className="mb-4">
                        {file.file_type?.startsWith("image/") && file.signed_url ? (
                          <div className="relative group">
                            <img 
                              src={file.signed_url} 
                              alt="Evidence preview"
                              className="w-full rounded-lg border border-gray-200 shadow-sm"
                            />
                            <a 
                              href={file.signed_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Eye size={16} />
                            </a>
                          </div>
                        ) : (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                            <FileText className="h-8 w-8 text-[#001F3F]" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.file_name || "File"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "Unknown size"}
                              </p>
                            </div>
                            {file.signed_url && (
                              <a 
                                href={file.signed_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#001F3F] hover:text-[#FF6B35]"
                              >
                                <Eye size={16} />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Separator className="my-4" />

                {/* Metadata */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Type</label>
                    <div className="flex items-center gap-2">
                      {React.createElement(typeIcons[previewData.type] || FileText, { size: 16, className: "text-[#001F3F]" })}
                      <span className="text-sm text-gray-900 capitalize">{previewData.type}</span>
                    </div>
                  </div>

                  {previewData.description && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Description</label>
                      <p className="text-sm text-gray-900 bg-white p-3 rounded-lg border border-gray-100">{previewData.description}</p>
                    </div>
                  )}

                  {previewData.project_name && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Project</label>
                      <div className="flex items-center gap-2">
                        <Folder size={16} className="text-gray-400" />
                        <p className="text-sm text-gray-900">{previewData.project_name}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {previewData.tag && (
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Tag</label>
                        <Badge variant="secondary" className="mt-1">
                          <TagIcon size={12} className="mr-1" />
                          {previewData.tag}
                        </Badge>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Date</label>
                      <p className="text-sm text-gray-900">
                        {new Date(previewData.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {previewData.location && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Location</label>
                      <p className="text-sm text-gray-900">{previewData.location}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm font-medium">
              {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
            </Badge>
            {selectedIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAttach} 
              disabled={selectedIds.size === 0 || attaching}
              className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white"
            >
              {attaching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Attaching...
                </>
              ) : (
                `Attach Selected (${selectedIds.size})`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function AttachSidekickPage() {
  const router = useRouter();
  const { user, currentOrg, loading } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  const handleClose = () => {
    setIsModalOpen(false);
    router.back();
  };

  if (loading) {
    return (
      <Layout showNav={false}>
        <SEO title="Attach Evidence - RD Companion" />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
        </div>
      </Layout>
    );
  }

  if (!currentOrg) {
    return (
      <Layout showNav={false}>
        <SEO title="Attach Evidence - RD Companion" />
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md p-6 text-center">
            <h2 className="text-xl font-bold text-[#001F3F] mb-4">No Organisation Selected</h2>
            <p className="text-gray-600 mb-6">Please select an organisation to attach evidence.</p>
            <Button onClick={() => router.push("/home")}>
              Go to Home
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={false}>
      <SEO title="Attach Evidence - RD Companion" />
      <AttachSidekickModal
        isOpen={isModalOpen}
        onClose={handleClose}
        orgId={currentOrg.id}
        claimId={router.query.claimId as string || ""}
      />
    </Layout>
  );
}