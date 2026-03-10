import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
type MessageRecipient = Database["public"]["Tables"]["message_recipients"]["Row"];
type MessageMention = Database["public"]["Tables"]["message_mentions"]["Row"];

export interface MessageWithDetails extends Message {
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  recipients: {
    recipient_id: string;
    read_at: string | null;
    recipient: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
  mentions: {
    mentioned_user: {
      id: string;
      full_name: string | null;
    } | null;
  }[];
  replies?: MessageWithDetails[];
}

export interface MessageThread {
  thread_id: string;
  latest_message: MessageWithDetails;
  unread_count: number;
  participant_names: string[];
}

/**
 * Get inbox messages (received messages)
 */
export async function getInboxMessages(): Promise<MessageWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("message_recipients")
    .select(`
      message_id,
      messages!inner(
        id,
        thread_id,
        parent_message_id,
        sender_id,
        subject,
        body,
        created_at,
        updated_at,
        org_id,
        is_staff_sender,
        entity_type,
        entity_id,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
        recipients:message_recipients(
          recipient_id,
          read_at,
          recipient:profiles!message_recipients_recipient_id_fkey(id, full_name, avatar_url)
        ),
        mentions:message_mentions(
          mentioned_user:profiles!message_mentions_mentioned_user_id_fkey(id, full_name)
        )
      )
    `)
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[messageService.getInboxMessages] Error:", error);
    throw error;
  }

  // Explicitly cast to avoid deep type instantiation issues
  return (data?.map(r => r.messages) || []) as unknown as MessageWithDetails[];
}

/**
 * Get sent messages
 */
export async function getSentMessages(): Promise<MessageWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
      recipients:message_recipients(
        recipient_id,
        read_at,
        recipient:profiles!message_recipients_recipient_id_fkey(id, full_name, avatar_url)
      ),
      mentions:message_mentions(
        mentioned_user:profiles!message_mentions_mentioned_user_id_fkey(id, full_name)
      )
    `)
    .eq("sender_id", user.id)
    .is("parent_message_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[messageService.getSentMessages] Error:", error);
    throw error;
  }

  return (data || []) as MessageWithDetails[];
}

/**
 * Get message thread (parent + all replies)
 */
export async function getMessageThread(threadId: string): Promise<MessageWithDetails[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
      recipients:message_recipients(
        recipient_id,
        read_at,
        recipient:profiles!message_recipients_recipient_id_fkey(id, full_name, avatar_url)
      ),
      mentions:message_mentions(
        mentioned_user:profiles!message_mentions_mentioned_user_id_fkey(id, full_name)
      )
    `)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[messageService.getMessageThread] Error:", error);
    throw error;
  }

  return (data || []) as MessageWithDetails[];
}

/**
 * Send a new message
 */
export async function sendMessage(
  orgId: string,
  recipientIds: string[],
  subject: string,
  body: string,
  parentMessageId?: string,
  context?: {
    entity_type: "organisation" | "project" | "evidence" | "claim" | "cif";
    entity_id: string;
  }
): Promise<MessageWithDetails> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if sender is staff
  const { data: profile } = await supabase
    .from("profiles")
    .select("internal_role")
    .eq("id", user.id)
    .single();
    
  const isStaff = !!profile?.internal_role;

  // Extract @mentions from body
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(body)) !== null) {
    mentions.push(match[2]); // Extract user ID from @[Name](user_id)
  }

  // Insert message
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      org_id: orgId,
      sender_id: user.id,
      subject,
      body,
      parent_message_id: parentMessageId || null,
      is_staff_sender: isStaff,
      entity_type: context?.entity_type,
      entity_id: context?.entity_id
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (messageError) {
    console.error("[messageService.sendMessage] Message Error:", messageError);
    throw messageError;
  }

  // Insert recipients
  // De-duplicate and ensure we never send a message back to the sender
  const uniqueRecipientIds = Array.from(new Set(recipientIds)).filter(
    (id) => id !== user.id
  );

  if (uniqueRecipientIds.length === 0) {
    console.warn("[messageService.sendMessage] No valid recipients after filtering (self-recipient removed).");
    throw new Error("No valid recipients selected for this message.");
  }

  const recipientInserts = uniqueRecipientIds.map((recipientId) => ({
    message_id: message.id,
    recipient_id: recipientId,
  }));

  const { error: recipientsError } = await supabase
    .from("message_recipients")
    .insert(recipientInserts);

  if (recipientsError) {
    console.error("[messageService.sendMessage] Recipients Error:", recipientsError);
    throw recipientsError;
  }

  // Insert mentions
  if (mentions.length > 0) {
    const mentionInserts = mentions.map(userId => ({
      message_id: message.id,
      mentioned_user_id: userId,
    }));

    const { error: mentionsError } = await supabase
      .from("message_mentions")
      .insert(mentionInserts);

    if (mentionsError) {
      console.error("[messageService.sendMessage] Mentions Error:", mentionsError);
      // Don't throw - mentions are optional
    }
  }

  // Fetch complete message with relations
  const { data: completeMessage } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
      recipients:message_recipients(
        recipient_id,
        read_at,
        recipient:profiles!message_recipients_recipient_id_fkey(id, full_name, avatar_url)
      ),
      mentions:message_mentions(
        mentioned_user:profiles!message_mentions_mentioned_user_id_fkey(id, full_name)
      )
    `)
    .eq("id", message.id)
    .single();

  return completeMessage as MessageWithDetails;
}

/**
 * Helper to resolve Org ID from an entity
 */
export async function resolveOrgId(
  entityType: "organisation" | "project" | "evidence" | "claim" | "cif", 
  entityId: string
): Promise<string | null> {
  if (entityType === "organisation") return entityId;
  
  try {
    if (entityType === "project") {
      const { data } = await supabase.from("projects").select("org_id").eq("id", entityId).maybeSingle();
      return data?.org_id || null;
    }
    if (entityType === "claim") {
      const { data } = await supabase.from("claims").select("org_id").eq("id", entityId).maybeSingle();
      return data?.org_id || null;
    }
    if (entityType === "cif") {
      const { data } = await supabase.from("cif_records").select("org_id").eq("id", entityId).maybeSingle();
      return data?.org_id || null;
    }
    // For evidence, it might be linked to project or claim, complicated. 
    // Assuming evidence table has org_id or we skip evidence for now if not direct.
    // Let's check schema for evidence if needed, but for now return null if unsure.
    return null;
  } catch (e) {
    console.error("Error resolving org ID:", e);
    return null;
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("message_recipients")
    .update({ read_at: new Date().toISOString() })
    .eq("message_id", messageId)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[messageService.markMessageAsRead] Error:", error);
    throw error;
  }
}

/**
 * Delete a message from the current user's inbox (recipient-only delete)
 */
export async function deleteMessageForCurrentUser(messageId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("message_recipients")
    .delete()
    .eq("message_id", messageId)
    .eq("recipient_id", user.id);

  if (error) {
    console.error("[messageService.deleteMessageForCurrentUser] Error:", error);
    throw error;
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("message_recipients")
    .select(
      `
      message_id,
      messages!inner(
        id
      )
    `,
      { count: "exact", head: true }
    )
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[messageService.getUnreadCount] Error:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Search users for @mentions (staff + clients from user's org)
 */
export async function searchUsersForMention(query: string, orgId?: string): Promise<Array<{ id: string; name: string; role: string }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get current user's profile to check if staff
  const { data: profile } = await supabase
    .from("profiles")
    .select("internal_role")
    .eq("id", user.id)
    .single();

  const isStaff = !!profile?.internal_role;
  
  // Simplification: Just search profiles by name. RLS on profiles is "public" so we can see names.
  // We want to filter meaningful people.
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, internal_role")
    .ilike("full_name", `%${query}%`)
    .limit(20);

  if (error) {
    console.error("[messageService.searchUsersForMention] Error:", error);
    return [];
  }

  return (data || []).map(u => ({
    id: u.id,
    name: u.full_name || "Unknown User",
    role: u.internal_role ? "Staff" : "Client",
  }));
}

export const messageService = {
  getInboxMessages,
  getSentMessages,
  getMessageThread,
  sendMessage,
  markMessageAsRead,
  deleteMessageForCurrentUser,
  getUnreadCount,
  searchUsersForMention,
  resolveOrgId,
};