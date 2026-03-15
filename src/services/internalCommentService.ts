import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type InternalCommentRow = Database["public"]["Tables"]["internal_comments"]["Row"];
type CommentMentionInsert = Database["public"]["Tables"]["comment_mentions"]["Insert"];

export interface InternalCommentWithAuthor extends InternalCommentRow {
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

function extractMentionUserIds(body: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(body)) !== null) {
    if (match[2]) {
      mentions.push(match[2]);
    }
  }
  return Array.from(new Set(mentions));
}

async function getCommentsForClaim(claimId: string): Promise<InternalCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("internal_comments")
    .select(
      `
      *,
      author:profiles!internal_comments_author_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq("entity_type", "claim")
    .eq("entity_id", claimId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[internalCommentService.getCommentsForClaim] Error:", error);
    throw error;
  }

  return (data || []) as InternalCommentWithAuthor[];
}

async function addManualCommentForClaim(claimId: string, body: string): Promise<InternalCommentWithAuthor> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const mentionUserIds = extractMentionUserIds(body);

  const { data: comment, error } = await supabase
    .from("internal_comments")
    .insert({
      entity_type: "claim",
      entity_id: claimId,
      author_id: user.id,
      body,
    })
    .select(
      `
      *,
      author:profiles!internal_comments_author_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `
    )
    .single();

  if (error) {
    console.error("[internalCommentService.addManualCommentForClaim] Comment Error:", error);
    throw error;
  }

  if (mentionUserIds.length > 0) {
    const mentionInserts: CommentMentionInsert[] = mentionUserIds.map((mentionedId) => ({
      comment_id: comment.id,
      mentioned_user_id: mentionedId,
    }));

    const { error: mentionsError } = await supabase.from("comment_mentions").insert(mentionInserts);

    if (mentionsError) {
      console.error("[internalCommentService.addManualCommentForClaim] Mentions Error:", mentionsError);
    }
  }

  return comment as InternalCommentWithAuthor;
}

export const internalCommentService = {
  getCommentsForClaim,
  addManualCommentForClaim,
};