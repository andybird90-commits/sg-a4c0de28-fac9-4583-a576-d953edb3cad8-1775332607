import React from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useNotifications, type Notification } from "@/contexts/NotificationContext";

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle
};

const colorMap = {
  success: "bg-green-50 border-green-200 text-green-900",
  error: "bg-red-50 border-red-200 text-red-900",
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-orange-50 border-orange-200 text-orange-900"
};

const iconColorMap = {
  success: "text-green-600",
  error: "text-red-600",
  info: "text-blue-600",
  warning: "text-orange-600"
};

export function NotificationToast() {
  const { notifications, dismiss } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map(notification => {
        const Icon = iconMap[notification.type];
        return (
          <div
            key={notification.id}
            className={`${colorMap[notification.type]} border rounded-lg shadow-lg p-4 pointer-events-auto animate-in slide-in-from-bottom-5 duration-300`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`${iconColorMap[notification.type]} flex-shrink-0 mt-0.5`} size={20} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{notification.title}</p>
                <p className="text-sm mt-1 opacity-90">{notification.message}</p>
              </div>
              <button
                onClick={() => dismiss(notification.id)}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}