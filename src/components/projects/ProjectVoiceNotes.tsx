import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications } from "@/contexts/NotificationContext";
import { useApp } from "@/contexts/AppContext";
import { organisationService, type Project as OrgProject } from "@/services/organisationService";
import { voiceNoteService, type ProjectVoiceNote } from "@/services/voiceNoteService";
import { Loader2, Trash2, RefreshCcw } from "lucide-react";

interface ProjectVoiceNotesProps {
  projectId: string;
}

export function ProjectVoiceNotes({ projectId }: ProjectVoiceNotesProps) {
  const { notify } = useNotifications();
  const { currentOrg } = useApp();
  const [voiceNotes, setVoiceNotes] = useState<ProjectVoiceNote[]>([]);
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [draftTranscripts, setDraftTranscripts] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);

        if (currentOrg) {
          const [notes, orgProjects] = await Promise.all([
          voiceNoteService.getByProject(projectId),
          organisationService.getProjects(currentOrg.id)]
          );

          if (!isMounted) return;

          setVoiceNotes(notes);
          setProjects(orgProjects);

          const drafts: Record<string, string> = {};
          notes.forEach((note) => {
            drafts[note.id] = note.transcript_cleaned || note.transcript_raw || "";
          });
          setDraftTranscripts(drafts);
        } else {
          const notes = await voiceNoteService.getByProject(projectId);
          if (!isMounted) return;

          setVoiceNotes(notes);
          const drafts: Record<string, string> = {};
          notes.forEach((note) => {
            drafts[note.id] = note.transcript_cleaned || note.transcript_raw || "";
          });
          setDraftTranscripts(drafts);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load voice notes.";
        console.error("Voice notes load error:", error);
        notify({
          type: "error",
          title: "Voice notes",
          message
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (projectId) {
      void load();
    }

    return () => {
      isMounted = false;
    };
  }, [projectId, currentOrg, notify]);

  const handleTranscriptChange = (id: string, value: string) => {
    setDraftTranscripts((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSaveTranscript = async (id: string) => {
    const text = draftTranscripts[id] ?? "";
    if (!text.trim()) {
      notify({
        type: "error",
        title: "Transcript",
        message: "Transcript cannot be empty."
      });
      return;
    }

    setSavingIds((prev) => new Set(prev).add(id));
    try {
      const updated = await voiceNoteService.updateTranscript(id, text.trim());
      setVoiceNotes((prev) => prev.map((n) => n.id === id ? updated : n));
      notify({
        type: "success",
        title: "Transcript updated",
        message: "Voice note transcript saved."
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save transcript.";
      notify({
        type: "error",
        title: "Transcript",
        message
      });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMoveToProject = async (id: string, newProjectId: string) => {
    if (!newProjectId) return;

    setMovingIds((prev) => new Set(prev).add(id));
    try {
      const updated = await voiceNoteService.moveToProject(id, newProjectId);
      setVoiceNotes((prev) => prev.filter((n) => n.id !== id || n.project_id === projectId));
      // If moved away from this project, it will be removed by the filter above.
      notify({
        type: "success",
        title: "Voice note moved",
        message: "Voice note moved to another project."
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to move voice note.";
      notify({
        type: "error",
        title: "Move voice note",
        message
      });
    } finally {
      setMovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("Delete this voice note? This cannot be undone.");
    if (!confirm) return;

    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await voiceNoteService.delete(id);
      setVoiceNotes((prev) => prev.filter((n) => n.id !== id));
      notify({
        type: "success",
        title: "Voice note deleted",
        message: "The voice note has been removed."
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete voice note.";
      notify({
        type: "error",
        title: "Delete voice note",
        message
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-950 border-slate-800">
        <CardContent className="py-8 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading voice notes...</span>
          </div>
        </CardContent>
      </Card>);

  }

  if (!voiceNotes.length) {
    return (
      <Card className="bg-slate-950 border-slate-800">
        <CardContent className="py-8 text-center text-slate-400">
          No voice notes have been captured for this project yet.
        </CardContent>
      </Card>);

  }

  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader style={{ backgroundColor: "rgba(15, 29, 45, 0)" }}>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          Voice Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4" style={{ backgroundColor: "rgba(15, 29, 45, 0)" }}>
        {voiceNotes.map((note) => {
          const saving = savingIds.has(note.id);
          const moving = movingIds.has(note.id);
          const deleting = deletingIds.has(note.id);
          const draft = draftTranscripts[note.id] ?? note.transcript_cleaned ?? note.transcript_raw ?? "";
          const createdAt = note.created_at ? new Date(note.created_at).toLocaleString() : "";

          return (
            <div
              key={note.id}
              className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="text-sm text-slate-300">
                  <div className="font-medium text-slate-100">Voice note</div>
                  {createdAt && <div className="text-xs text-slate-500">{createdAt}</div>}
                  {note.ai_summary &&
                  <div className="mt-1 text-xs text-slate-400">
                      {note.ai_summary}
                    </div>
                  }
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {projects.length > 0 &&
                  <Select
                    defaultValue={note.project_id ?? projectId}
                    onValueChange={(value) => handleMoveToProject(note.id, value)}
                    disabled={moving || deleting}>
                    
                      <SelectTrigger className="w-48 bg-slate-950 border-slate-800 text-xs text-slate-200">
                        <SelectValue placeholder="Move to project" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-slate-800">
                        {projects.map((p) =>
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name}
                          </SelectItem>
                      )}
                      </SelectContent>
                    </Select>
                  }
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(note.id)}
                    disabled={deleting || moving || saving}
                    className="border-red-500/60 text-red-400 hover:bg-red-500/10">
                    
                    {deleting ?
                    <Loader2 className="h-4 w-4 animate-spin" /> :

                    <Trash2 className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </div>

              {note.original_audio_url &&
              <audio
                controls
                src={note.original_audio_url}
                className="w-full">
                
                  Your browser does not support audio playback.
                </audio>
              }

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Transcript</span>
                </div>
                <Textarea
                  rows={4}
                  value={draft}
                  onChange={(event) => handleTranscriptChange(note.id, event.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm" />
                
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSaveTranscript(note.id)}
                    disabled={saving || deleting || moving}
                    className="px-3 py-1 h-8 text-xs">
                    
                    {saving && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                    Save transcript
                  </Button>
                </div>
              </div>
            </div>);

        })}
      </CardContent>
    </Card>);

}