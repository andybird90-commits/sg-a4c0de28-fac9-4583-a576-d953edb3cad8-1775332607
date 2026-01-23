import React, { createContext, useContext, useState, useCallback } from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
};

interface NotificationContextType {
  notifications: Notification[];
  notify: (notification: Omit<Notification, "id">) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((notification: Omit<Notification, "id">) => {
    const id = `notif_${Date.now()}_${Math.random()}`;
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    const duration = notification.duration || 4000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, notify, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}