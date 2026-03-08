import { useState, useEffect } from "react";
import { X, Send, AtSign, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { messageService } from "@/services/messageService";
import { profileService } from "@/services/profileService";
import type { Profile } from "@/services/profileService";
import { useApp } from "@/contexts/AppContext";

interface QuickMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "organisation" | "project" | "evidence" | "claim" | "cif";
  entityId: string;
  entityName: string;
}

export function QuickMessageModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName
}: QuickMessageModalProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const { toast } = useToast();
  const { currentOrg, user } = useApp();
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);

  // Generate subject based on entity type
  const getSubject = () => {
    const prefixes = {
      organisation: "Client",
      project: "Project",
      evidence: "Evidence",
      claim: "Claim",
      cif: "CIF"
    };
    return `Re: ${prefixes[entityType]} - ${entityName}`;
  };

  // Load users for @mentions
  useEffect(() => {
    if (isOpen) {
      profileService.getAllProfiles().then(setUsers).catch(console.error);
    }
  }, [isOpen]);

  // Handle @mention detection
  const handleContentChange = (value: string) => {
    setContent(value);
    
    const lastAtIndex = value.lastIndexOf("@", cursorPosition);
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1, cursorPosition);
      if (!textAfterAt.includes(" ")) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention and track selected user IDs explicitly
  const insertMention = (profile: Profile) => {
    const lastAtIndex = content.lastIndexOf("@", cursorPosition);
    const beforeMention = content.slice(0, lastAtIndex);
    const afterMention = content.slice(cursorPosition);
    const displayName = profile.full_name || profile.email || "User";
    const newContent = `${beforeMention}@${displayName} ${afterMention}`;
    setContent(newContent);
    setShowMentions(false);
    setMentionSearch("");

    setMentionUserIds((prev) => {
      if (!profile.id || prev.includes(profile.id)) {
        return prev;
      }
      return [...prev, profile.id];
    });
  };

  // Filter users based on search, excluding the current user so you can't message yourself
  const filteredUsers = users.filter((profile) =>
    profile.id !== user?.id &&
    (
      (profile.full_name || "").toLowerCase().includes(mentionSearch.toLowerCase()) ||
      (profile.email || "").toLowerCase().includes(mentionSearch.toLowerCase())
    )
  );

  const handleSend = async () => {
    if (!content.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message before sending.",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      // Use explicitly selected mention recipients, excluding the sender
      const uniqueMentionIds = Array.from(new Set(mentionUserIds));
      const recipientIds = uniqueMentionIds.filter((id) => id !== user?.id);

      if (recipientIds.length === 0) {
        toast({
          title: "Select recipient",
          description: "Mention at least one team member using @ before sending.",
          variant: "destructive"
        });
        setSending(false);
        return;
      }

      const resolvedFromEntity = await messageService.resolveOrgId(entityType, entityId);
      const orgId = resolvedFromEntity || currentOrg?.id || null;

      if (!orgId) {
        toast({
          title: "Cannot send message",
          description:
            "We could not determine which organisation this message belongs to. Please make sure you have a client selected or contact support.",
          variant: "destructive"
        });
        setSending(false);
        return;
      }

      // Send message
      await messageService.sendMessage(
        orgId,
        recipientIds,
        getSubject(),
        content,
        undefined, // parentMessageId
        {
          entity_type: entityType,
          entity_id: entityId
        }
      );

      toast({
        title: "Message Sent",
        description: `Your message about "${entityName}" has been sent.`
      });

      setContent("");
      setMentionUserIds([]);
      onClose();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Send Message</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subject Badge */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Subject
            </label>
            <div className="mt-1">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {getSubject()}
              </Badge>
            </div>
          </div>

          {/* Message Content */}
          <div className="relative">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Message
            </label>
            <Textarea
              value={content}
              onChange={(e) => {
                handleContentChange(e.target.value);
                setCursorPosition(e.target.selectionStart || 0);
              }}
              onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart || 0)}
              onClick={(e) => setCursorPosition(e.currentTarget.selectionStart || 0)}
              placeholder="Type @ to mention someone..."
              className="mt-1 min-h-[150px] resize-none font-sans"
              disabled={sending}
            />
            
            {/* @Mention Dropdown */}
            {showMentions && filteredUsers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto left-0 bottom-full mb-1">
                {filteredUsers.slice(0, 5).map((user) => (
                  <button
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <AtSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{user.full_name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hint */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AtSign className="h-3 w-3" />
            <span>Type @ to mention team members</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !content.trim()}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}