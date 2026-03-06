import { useEffect, useRef, useState } from "react";

type RecordingStatus = "idle" | "recording" | "stopped";

interface UseAudioRecorderOptions {
  maxDurationSeconds?: number;
}

interface UseAudioRecorderResult {
  status: RecordingStatus;
  isRecording: boolean;
  audioUrl: string | null;
  audioBlob: Blob | null;
  recordingSeconds: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderResult {
  const { maxDurationSeconds = 120 } = options;
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopRecordingInternal = () => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setStatus("stopped");
  };

  const startRecording = async () => {
    try {
      setError(null);

      if (typeof window === "undefined" || !navigator.mediaDevices) {
        setError("Audio recording is not supported in this browser.");
        return;
      }

      if (status === "recording") {
        return;
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioBlob(null);
      setRecordingSeconds(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setStatus("recording");

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          if (next >= maxDurationSeconds) {
            stopRecordingInternal();
          }
          return next;
        });
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start recording.");
      stopStream();
      clearTimer();
      setStatus("idle");
    }
  };

  const stopRecording = () => {
    stopRecordingInternal();
  };

  const reset = () => {
    clearTimer();
    stopStream();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingSeconds(0);
    setStatus("idle");
    setError(null);
  };

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return {
    status,
    isRecording: status === "recording",
    audioUrl,
    audioBlob,
    recordingSeconds,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}