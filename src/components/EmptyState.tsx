import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-16 text-center px-6">
      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Icon className="h-12 w-12 text-slate-400" strokeWidth={2} />
      </div>
      <h3 className="text-xl font-bold text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-500 mb-6">{description}</p>
      {action}
    </div>
  );
}