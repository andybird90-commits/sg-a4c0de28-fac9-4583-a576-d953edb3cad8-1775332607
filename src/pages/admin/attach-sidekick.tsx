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
import { X, Search, Filter, Image, FileText, Mic, Video, StickyNote, Loader2 } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import type { EvidenceWithFiles } from "@/services/evidenceService";

const typeIcons = {
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<EvidenceWithFiles | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    projectId: "",
    fromDate: "",
    toDate: "",
    tag: ""
  });

  useEffect(() => {
    if (isOpen && orgId) {
      loadEvidence();
    }
  }, [isOpen, orgId]);

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

      const data = await response.json();
      setEvidence(data);
    } catch (error: any) {
      console.error("Error loading evidence:", error);
      notify({
        type: "error",
        title: "Load failed",
        message: error.message || "Could not load evidence from RD Sidekick"
      });
    } finally {
      setLoading(false);
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

      if (!response.ok) throw new Error("Failed to attach evidence");

      notify({
        type: "success",
        title: "Evidence attached",
        message: `Attached ${selectedIds.size} items from RD Sidekick`
      });

      onClose();
    } catch (error) {
      console.error("Error attaching evidence:", error);
      notify({
        type: "error",
        title: "Attach failed",
        message: "Could not attach evidence"
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#001F3F]">Attach from RD Sidekick</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="date"
              placeholder="From date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
            />
            <Input
              type="date"
              placeholder="To date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
            />
            <select
              className="border border-gray-300 rounded-lg px-3 py-2"
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
            <Button onClick={loadEvidence} variant="outline" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter size={16} className="mr-2" />}
              Apply Filters
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
              <p className="ml-3 text-gray-500">Loading evidence...</p>
            </div>
          ) : evidence.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No evidence found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {evidence.map((item) => {
                const Icon = typeIcons[item.type];
                const isSelected = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#FF6B35] bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => toggleSelection(item.id)}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox checked={isSelected} />
                      <Icon size={24} className="text-[#001F3F]" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.description || "No description"}
                        </p>
                        <p className="text-xs text-gray-500">{item.project_name}</p>
                      </div>
                    </div>
                    {item.tag && (
                      <Badge variant="secondary" className="text-xs">
                        {item.tag}
                      </Badge>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAttach} disabled={selectedIds.size === 0}>
              Attach Selected
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

  // Show loading state while app context initializes
  if (loading) {
    return (
      <Layout showNav={false}>
        <SEO title="Attach Evidence - RD Sidekick" />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
        </div>
      </Layout>
    );
  }

  // Show error if no organisation is selected
  if (!currentOrg) {
    return (
      <Layout showNav={false}>
        <SEO title="Attach Evidence - RD Sidekick" />
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
      <SEO title="Attach Evidence - RD Sidekick" />
      <AttachSidekickModal
        isOpen={isModalOpen}
        onClose={handleClose}
        orgId={currentOrg.id}
        claimId={router.query.claimId as string || ""}
      />
    </Layout>
  );
}