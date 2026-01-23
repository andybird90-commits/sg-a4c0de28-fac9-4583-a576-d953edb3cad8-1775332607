import { useState, useEffect, useCallback } from "react";
import { indexedDBQueue, type QueuedEvidence } from "@/lib/indexedDB";
import { evidenceService } from "@/services/evidenceService";
import { useNotifications } from "@/contexts/NotificationContext";

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedItems, setQueuedItems] = useState<QueuedEvidence[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { notify } = useNotifications();

  // Initialize and load queue
  useEffect(() => {
    indexedDBQueue.init().then(() => {
      loadQueue();
    });
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadQueue = async () => {
    try {
      const items = await indexedDBQueue.getAll();
      setQueuedItems(items);
    } catch (error) {
      console.error("Failed to load queue:", error);
    }
  };

  const addToQueue = async (evidence: Omit<QueuedEvidence, "local_id" | "created_at" | "status">) => {
    const queuedItem: QueuedEvidence = {
      ...evidence,
      local_id: `local_${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
      status: "pending"
    };

    try {
      await indexedDBQueue.addItem(queuedItem);
      await loadQueue();
      notify({
        type: "info",
        title: "Saved offline",
        message: "We'll upload when you're back online."
      });
    } catch (error) {
      console.error("Failed to add to queue:", error);
      notify({
        type: "error",
        title: "Queue error",
        message: "Failed to save offline. Please try again."
      });
    }
  };

  const syncQueue = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      const pending = await indexedDBQueue.getPending();
      
      if (pending.length === 0) {
        setSyncing(false);
        return;
      }

      notify({
        type: "info",
        title: "Syncing evidence",
        message: `Uploading ${pending.length} queued ${pending.length === 1 ? "item" : "items"}…`
      });

      let successCount = 0;
      let failCount = 0;

      for (const item of pending) {
        try {
          await indexedDBQueue.updateItem(item.local_id, { status: "uploading" });

          // Create evidence item
          const evidenceData = {
            org_id: item.org_id,
            project_id: item.project_id,
            created_by: item.org_id, // Will be set by RLS
            type: item.type,
            description: item.description,
            tag: item.tag,
            claim_year: item.claim_year
          };

          const createdEvidence = await evidenceService.createEvidence(evidenceData);

          // Upload file if present
          if (item.file_data && item.file_name && item.mime_type) {
            const base64Data = item.file_data.split(",")[1];
            const binaryData = atob(base64Data);
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              bytes[i] = binaryData.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: item.mime_type });
            const file = new File([blob], item.file_name, { type: item.mime_type });

            await evidenceService.uploadFile(item.org_id, createdEvidence.id, file);
          }

          await indexedDBQueue.updateItem(item.local_id, { status: "complete" });
          successCount++;
        } catch (error) {
          console.error("Failed to sync item:", error);
          await indexedDBQueue.updateItem(item.local_id, {
            status: "failed",
            error_message: error instanceof Error ? error.message : "Upload failed"
          });
          failCount++;
        }
      }

      await loadQueue();

      if (successCount > 0) {
        notify({
          type: "success",
          title: "Sync complete",
          message: `${successCount} ${successCount === 1 ? "item" : "items"} uploaded successfully.`
        });
      }

      if (failCount > 0) {
        notify({
          type: "error",
          title: "Some uploads failed",
          message: "Tap failed items to retry."
        });
      }

      // Clear completed items after successful sync
      setTimeout(() => {
        indexedDBQueue.clearCompleted();
        loadQueue();
      }, 2000);
    } catch (error) {
      console.error("Sync error:", error);
      notify({
        type: "error",
        title: "Sync failed",
        message: "Please try again later."
      });
    } finally {
      setSyncing(false);
    }
  };

  const retryItem = async (local_id: string) => {
    try {
      await indexedDBQueue.updateItem(local_id, { status: "pending" });
      await loadQueue();
      if (isOnline) {
        syncQueue();
      }
    } catch (error) {
      console.error("Failed to retry item:", error);
    }
  };

  const deleteQueuedItem = async (local_id: string) => {
    try {
      await indexedDBQueue.deleteItem(local_id);
      await loadQueue();
      notify({
        type: "info",
        title: "Draft deleted",
        message: "Local draft has been removed."
      });
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const syncingCount = queuedItems.filter(i => i.status === "uploading").length;

  return {
    isOnline,
    queuedItems,
    syncing,
    syncingCount,
    addToQueue,
    syncQueue,
    retryItem,
    deleteQueuedItem
  };
}