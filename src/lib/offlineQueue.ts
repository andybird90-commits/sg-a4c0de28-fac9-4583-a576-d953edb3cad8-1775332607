import { EvidenceItem } from "@/services/evidenceService";

const QUEUE_KEY = "rd_sidekick_offline_queue";

export type QueuedItem = {
  id: string;
  action: "create_evidence";
  payload: Partial<EvidenceItem>;
  timestamp: number;
};

export const offlineQueue = {
  addItem: (item: QueuedItem) => {
    if (typeof window === "undefined") return;
    const queue = offlineQueue.getQueue();
    queue.push(item);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  getQueue: (): QueuedItem[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  removeItem: (id: string) => {
    if (typeof window === "undefined") return;
    const queue = offlineQueue.getQueue().filter(i => i.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clearQueue: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(QUEUE_KEY);
  }
};