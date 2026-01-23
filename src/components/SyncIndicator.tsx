import React from "react";
import { Loader2 } from "lucide-react";

interface SyncIndicatorProps {
  count: number;
}

export function SyncIndicator({ count }: SyncIndicatorProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#001F3F] text-white py-2 px-4 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 z-40">
      <Loader2 size={16} className="animate-spin" />
      <span>Syncing {count} {count === 1 ? "item" : "items"}…</span>
    </div>
  );
}