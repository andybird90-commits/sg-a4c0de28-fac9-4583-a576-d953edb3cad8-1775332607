import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Mic, Square, Play, Loader2 } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

interface VoiceNoteModalProps {
  open: boolean;
  onClose: () => void;
  organisationId: string;
  userId: string;
  projects?: { id: string; name: string }[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const parts = result.split(",");
      resolve(parts.length > 1 ? parts[1] : "");
    };
    reader.onerror = () => {
      reject(new Error("Failed to read audio data."));
    };
    reader.readAsDataURL(blob);
  });
}

export function VoiceNoteModal({ open, onClose, organisationId, userId, projects }: VoiceNoteModalProps) {
  const { status, isRecording, audioUrl, audioBlob, recordingSeconds, error: recordingError, startRecording, stopRecording, reset } =
    useAudioRecorder({ maxDurationSeconds: 120 });

  const [additionalContext, setAdditionalContext] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);

  const { notify } = useNotifications();

  const handleClose = () => {
    if (!isSaving) {
      reset();
      setAdditionalContext("");
      setSaveError(null);
      setSelectedProjectId(null);
      setSelectedProjectName(null);
      onClose();
    }
  };

  const handleSave = async () => {
    try {
      setSaveError(null);

      if (!audioBlob) {
        setSaveError("Please record a voice note before saving.");
        return;
      }

      setIsSaving(true);

      const audioBase64 = await blobToBase64(audioBlob);

      const response = await fetch("/api/voice-notes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type || "audio/webm",
          organisationId,
          userId,
          additionalContext: additionalContext.trim() || null,
          projectId: selectedProjectId,
          projectName: selectedProjectName,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: string;
            message?: string;
            projectName?: string | null;
            needsConfirmation?: boolean;
            transcript?: string | null;
          }
        | null;

      if (!response.ok || !body || !body.success) {
        const message =
          body?.error ||
          body?.message ||
          (!response.ok ? "Failed to save voice note." : "Voice note could not be saved.");

        if (body?.transcript) {
          setAdditionalContext(body.transcript);
        }

        setSaveError(message);
        notify({
          type: "error",
          title: "Voice note not saved",
          message,
        });
        return;
      }

      const projectName = body.projectName || "a project";
      const needsConfirmation = Boolean(body.needsConfirmation);

      notify({
        type: "success",
        title: "Voice note saved",
        message: needsConfirmation
          ? "Voice note saved. Project assignment needs confirmation."
          : `Voice note saved to ${projectName}.`,
      });

      reset();
      setAdditionalContext("");
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save voice note.";
      setSaveError(message);
      notify({
        type: "error",
        title: "Voice note error",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalMinutes = Math.floor(recordingSeconds / 60);
  const totalSeconds = recordingSeconds % 60;
  const formattedDuration = `${totalMinutes}:${totalSeconds.toString().padStart(2, "0")}`;

  const hasAudio = Boolean(audioBlob || audioUrl);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? handleClose() : undefined)}>
      <DialogContent className="sm:max-w-lg bg-slate-950 border border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-50">New Voice Note</DialogTitle>
          <DialogDescription className="text-slate-400">
            Record up to 2 minutes. We will transcribe and try to auto-assign this note to the right project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between rounded-md bg-slate-900 px-3 py-2 border border-slate-800">
            <div className="text-xs text-slate-400">
              <div className="font-medium text-slate-200">
                {status === "recording" ? "Recording..." : hasAudio ? "Recorded note ready" : "Ready to record"}
              </div>
              <div>Max 2 minutes per note</div>
            </div>
            <div className="text-sm font-mono text-slate-200">{formattedDuration}</div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {status === "recording" ? (
              <Button
                type="button"
                variant="destructive"
                className="flex-1 sm:flex-none sm:w-40 justify-center"
                onClick={stopRecording}
                disabled={isSaving}
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1 sm:flex-none sm:w-40 justify-center gradient-primary text-slate-950"
                onClick={startRecording}
                disabled={isSaving}
              >
                <Mic className="mr-2 h-4 w-4" />
                {hasAudio ? "Re-record" : "Record"}
              </Button>
            )}

            {hasAudio && (
              <div className="flex-1 flex items-center gap-2">
                <Play className="h-4 w-4 text-slate-400" />
                <audio controls src={audioUrl || undefined} className="w-full">
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}
          </div>

          {recordingError && <p className="text-xs text-red-400">{recordingError}</p>}
          {saveError && <p className="text-xs text-red-400">{saveError}</p>}

          <div className="space-y-2 pt-1">
            <label className="text-xs font-medium text-slate-300" htmlFor="voice-note-context">
              Transcript & context (edit if needed)
            </label>
            <Textarea
              id="voice-note-context"
              rows={3}
              value={additionalContext}
              onChange={(event) => setAdditionalContext(event.target.value)}
              placeholder="We’ll auto-fill this with the transcript. You can edit it or add the exact project name if we didn’t detect it."
              className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {projects && projects.length > 0 && (
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-slate-300">
                Or choose project now
              </label>
              <Select
                value={selectedProjectId ?? ""}
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  const match = projects.find((project) => project.id === value) || null;
                  setSelectedProjectName(match ? match.name : null);
                }}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100">
                  <SelectValue placeholder="Optional: pick a project to attach this note to" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-slate-100">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                If we cannot detect the project from the transcript, we will use this selection instead.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasAudio}
            className="gradient-primary text-slate-950"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Voice Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}