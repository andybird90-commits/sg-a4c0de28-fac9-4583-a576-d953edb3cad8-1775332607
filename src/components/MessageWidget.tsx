import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickMessageModal } from "./QuickMessageModal";
import { renderTextWithMentions } from "@/lib/formatMentions";

interface MessageWidgetProps {
  entityType: "organisation" | "project" | "evidence" | "claim" | "cif";
  entityId: string;
  entityName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MessageWidget({
  entityType,
  entityId,
  entityName,
  className = "",
  size = "sm"
}: MessageWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={`${sizeClasses[size]} rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110 ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        title="Send message about this item" style={{ color: "#1a1a1a" }}>
        
        <MessageCircle className="h-4 w-4" size={iconSizes[size]} />
      </Button>

      <QuickMessageModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName} />
      
    </>);

}