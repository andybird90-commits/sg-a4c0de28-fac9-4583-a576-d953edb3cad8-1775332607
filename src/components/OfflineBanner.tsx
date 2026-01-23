import React from "react";
import { WifiOff } from "lucide-react";

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null;

  return (
    <div className="bg-orange-500 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff size={16} />
      <span>You're offline – new evidence will be queued and uploaded later.</span>
    </div>
  );
}