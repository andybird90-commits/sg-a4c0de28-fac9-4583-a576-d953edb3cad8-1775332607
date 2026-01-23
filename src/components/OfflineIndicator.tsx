import React, { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi } from "lucide-react";
import { offlineQueue } from "@/lib/offlineQueue";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      setQueueCount(offlineQueue.getQueue().length);
    };

    updateOnlineStatus();

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    const interval = setInterval(updateOnlineStatus, 5000);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && queueCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 safe-top">
      {!isOnline ? (
        <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 font-medium">
            You&apos;re offline. Evidence will be saved locally and synced when you reconnect.
          </AlertDescription>
        </Alert>
      ) : queueCount > 0 ? (
        <Alert className="rounded-none border-x-0 border-t-0 bg-blue-50 border-blue-200">
          <Wifi className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 font-medium">
            Syncing {queueCount} queued {queueCount === 1 ? "item" : "items"}...
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}