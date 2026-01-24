// IndexedDB wrapper for offline queue
const DB_NAME = "rd_sidekick_offline";
const DB_VERSION = 1;
const QUEUE_STORE = "evidence_queue";

export type QueuedEvidence = {
  local_id: string;
  type: string;
  org_id: string;
  project_id: string | null;
  description: string | null;
  tag: string | null;
  claim_year: number | null;
  file_data?: string; // base64 encoded
  file_name?: string;
  mime_type?: string;
  created_at: string;
  status: "pending" | "uploading" | "failed" | "complete";
  error_message?: string;
};

export interface QueuedItem {
  id?: number;
  type: "image" | "video" | "audio" | "document" | "note" | "FILE_UPLOAD" | string;
  payload: any;
  file?: File | null; // For temporary storage before serialization
}

class IndexedDBQueue {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === "undefined") return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const store = db.createObjectStore(QUEUE_STORE, { keyPath: "local_id" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("created_at", "created_at", { unique: false });
        }
      };
    });
  }

  async addItem(item: QueuedEvidence): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.add(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<QueuedEvidence[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], "readonly");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPending(): Promise<QueuedEvidence[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], "readonly");
      const store = transaction.objectStore(QUEUE_STORE);
      const index = store.index("status");
      const request = index.getAll("pending");

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateItem(local_id: string, updates: Partial<QueuedEvidence>): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const getRequest = store.get(local_id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          const updated = { ...item, ...updates };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error("Item not found"));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteItem(local_id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.delete(local_id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearCompleted(): Promise<void> {
    if (!this.db) await this.init();
    const all = await this.getAll();
    const completed = all.filter(item => item.status === "complete");
    
    for (const item of completed) {
      await this.deleteItem(item.local_id);
    }
  }
}

export const indexedDBQueue = new IndexedDBQueue();