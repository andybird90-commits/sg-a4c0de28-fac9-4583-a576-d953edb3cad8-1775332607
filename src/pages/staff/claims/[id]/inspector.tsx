import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type ClaimRow = Database["public"]["Tables"]["claims"]["Row"];
type InspectorSessionRow =
  Database["public"]["Tables"]["hmrc_inspector_sessions"]["Row"];
type InspectorMessageRow =
  Database["public"]["Tables"]["hmrc_inspector_messages"]["Row"];
type InspectorFindingRow =
  Database["public"]["Tables"]["hmrc_inspector_findings"]["Row"];

type InspectorMode = "standard" | "strict" | "aggressive";

interface InspectorTurnResponse {
  session: InspectorSessionRow;
  inspector_response: string | null;
  advisor_hint: string | null;
  new_findings: InspectorFindingRow[];
  overall_score: number;
  risk_level: "low" | "medium" | "high";
}

function formatRiskBadge(level: InspectorSessionRow["risk_level"]) {
  if (!level) return <Badge variant="outline">Unknown</Badge>;
  if (level === "low") return <Badge className="bg-emerald-500 text-white">Low</Badge>;
  if (level === "medium") return <Badge className="bg-amber-500 text-white">Medium</Badge>;
  return <Badge className="bg-red-500 text-white">High</Badge>;
}

function formatScore(score: number | null) {
  if (typeof score !== "number") return "—";
  return `${score}/100`;
}

function groupFindingsBySeverity(findings: InspectorFindingRow[]) {
  return {
    high: findings.filter((f) => f.severity === "high"),
    medium: findings.filter((f) => f.severity === "medium"),
    low: findings.filter((f) => f.severity === "low"),
  };
}

export default function ClaimInspectorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const claimId = router.query.id as string | undefined;

  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [session, setSession] = useState<InspectorSessionRow | null>(null);
  const [messages, setMessages] = useState<InspectorMessageRow[]>([]);
  const [findings, setFindings] = useState<InspectorFindingRow[]>([]);
  const [mode, setMode] = useState<InspectorMode>("standard");
  const [userInput, setUserInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const groupedFindings = useMemo(
    () => groupFindingsBySeverity(findings),
    [findings]
  );

  useEffect(() => {
    if (!claimId) return;

    const loadInitial = async () => {
      const {
        data: { session: authSession },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError || !authSession?.access_token) {
        toast({
          title: "Authentication required",
          description: "Sign in again to use HMRC Inspector.",
          variant: "destructive",
        });
        return;
      }

      const { data: claimRow, error: claimError } = await supabase
        .from("claims")
        .select("*")
        .eq("id", claimId)
        .maybeSingle();

      if (claimError) {
        toast({
          title: "Failed to load claim",
          description: "Could not load claim details for inspector.",
          variant: "destructive",
        });
      } else {
        setClaim(claimRow);
      }

      const { data: existingSession, error: sessionError } = await supabase
        .from("hmrc_inspector_sessions")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sessionError && existingSession) {
        setSession(existingSession);

        const { data: sessionMessages } = await supabase
          .from("hmrc_inspector_messages")
          .select("*")
          .eq("session_id", existingSession.id)
          .order("created_at", { ascending: true });

        if (sessionMessages) {
          setMessages(sessionMessages);
        }

        const { data: sessionFindings } = await supabase
          .from("hmrc_inspector_findings")
          .select("*")
          .eq("session_id", existingSession.id)
          .order("created_at", { ascending: true });

        if (sessionFindings) {
          setFindings(sessionFindings);
        }

        if (
          existingSession.mode === "strict" ||
          existingSession.mode === "aggressive" ||
          existingSession.mode === "standard"
        ) {
          setMode(existingSession.mode);
        }
      }
    };

    void loadInitial();
  }, [claimId, toast]);

  const handleStart = async () => {
    if (!claimId || isStarting) return;

    setIsStarting(true);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession?.access_token) {
        toast({
          title: "Authentication required",
          description: "Sign in again to use HMRC Inspector.",
          variant: "destructive",
        });
        setIsStarting(false);
        return;
      }

      const response = await fetch("/api/claims/inspector/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({
          claimId,
          mode,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast({
          title: "Inspector error",
          description:
            error?.error ??
            "Failed to start HMRC Inspector. Please try again.",
          variant: "destructive",
        });
        setIsStarting(false);
        return;
      }

      const data: InspectorTurnResponse = await response.json();

      setSession(data.session);
      setMessages((prev) => {
        const next = [...prev];
        if (data.inspector_response) {
          next.push({
            id: crypto.randomUUID(),
            session_id: data.session.id,
            role: "inspector",
            message_text: data.inspector_response,
            created_at: new Date().toISOString(),
          } as InspectorMessageRow);
        }
        if (data.advisor_hint) {
          next.push({
            id: crypto.randomUUID(),
            session_id: data.session.id,
            role: "advisor",
            message_text: data.advisor_hint,
            created_at: new Date().toISOString(),
          } as InspectorMessageRow);
        }
        return next;
      });
      if (data.new_findings?.length) {
        setFindings((prev) => [...prev, ...data.new_findings]);
      }
      toast({
        title: "Inspector started",
        description: "HMRC-style review has begun for this claim.",
      });
    } catch (error) {
      console.error("HMRC Inspector start error", error);
      toast({
        title: "Inspector error",
        description: "Unexpected error starting inspector session.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSend = async () => {
    if (!claimId || !session || !userInput.trim() || isSending) return;

    const messageText = userInput.trim();
    setUserInput("");

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        session_id: session.id,
        role: "user",
        message_text: messageText,
        created_at: new Date().toISOString(),
      } as InspectorMessageRow,
    ]);

    setIsSending(true);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession?.access_token) {
        toast({
          title: "Authentication required",
          description: "Sign in again to use HMRC Inspector.",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      const response = await fetch("/api/claims/inspector/turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({
          sessionId: session.id,
          claimId,
          userMessage: messageText,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast({
          title: "Inspector error",
          description:
            error?.error ??
            "Failed to process inspector turn. Please try again.",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      const data: InspectorTurnResponse = await response.json();

      setSession(data.session);
      setMessages((prev) => {
        const next = [...prev];
        if (data.inspector_response) {
          next.push({
            id: crypto.randomUUID(),
            session_id: data.session.id,
            role: "inspector",
            message_text: data.inspector_response,
            created_at: new Date().toISOString(),
          } as InspectorMessageRow);
        }
        if (data.advisor_hint) {
          next.push({
            id: crypto.randomUUID(),
            session_id: data.session.id,
            role: "advisor",
            message_text: data.advisor_hint,
            created_at: new Date().toISOString(),
          } as InspectorMessageRow);
        }
        return next;
      });
      if (data.new_findings?.length) {
        setFindings((prev) => [...prev, ...data.new_findings]);
      }
    } catch (error) {
      console.error("HMRC Inspector turn error", error);
      toast({
        title: "Inspector error",
        description: "Unexpected error during inspector turn.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleEnd = async () => {
    if (!session || isEnding) return;
    setIsEnding(true);

    try {
      const { data: updated, error } = await supabase
        .from("hmrc_inspector_sessions")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("HMRC Inspector end error", error);
        toast({
          title: "Failed to end review",
          description: "Could not mark the inspector session as completed.",
          variant: "destructive",
        });
      } else if (updated) {
        setSession(updated);
        toast({
          title: "Review ended",
          description: "Inspector session marked as completed.",
        });
      }
    } catch (error) {
      console.error("HMRC Inspector end error", error);
      toast({
        title: "Failed to end review",
        description: "Unexpected error ending inspector session.",
        variant: "destructive",
      });
    } finally {
      setIsEnding(false);
    }
  };

  const inspectorMessages = useMemo(
    () =>
      messages.filter((m) => m.role === "inspector" || m.role === "user"),
    [messages]
  );

  const latestAdvisorHint = useMemo(() => {
    const advisorMessages = messages.filter((m) => m.role === "advisor");
    if (!advisorMessages.length) return null;
    return advisorMessages[advisorMessages.length - 1];
  }, [messages]);

  return (
    <StaffLayout title="HMRC Inspector">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              HMRC Inspector
            </h1>
            <p className="text-sm text-muted-foreground">
              Live HMRC-style enquiry for this R&amp;D claim.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {session?.overall_score != null && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  Current score
                </div>
                <div className="text-xl font-semibold">
                  {formatScore(session.overall_score)}
                </div>
              </div>
            )}
            {session?.risk_level && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  Risk level
                </div>
                <div className="mt-1">{formatRiskBadge(session.risk_level)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]">
          {/* Left column – Claim Context */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Claim Context</CardTitle>
              <CardDescription>
                Key details to orient the inspector review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Claim
                </div>
                <div className="font-medium">
                  {claim
                    ? `FY ${claim.claim_year} claim`
                    : "Claim"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Company
                </div>
                <div>{claim?.org_id ?? "Unknown organisation"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Mode
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["standard", "strict", "aggressive"] as InspectorMode[]).map(
                    (m) => (
                      <Button
                        key={m}
                        size="sm"
                        variant={mode === m ? "default" : "outline"}
                        disabled={!!session}
                        onClick={() => setMode(m)}
                      >
                        {m === "standard"
                          ? "Standard"
                          : m === "strict"
                          ? "Strict"
                          : "Aggressive"}
                      </Button>
                    )
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Inspector session
                </div>
                {session ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Status</span>
                      <Badge variant="outline">
                        {session.status === "completed"
                          ? "Completed"
                          : "In progress"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Last updated</span>
                      <span>
                        {session.updated_at
                          ? new Date(session.updated_at).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No inspector session has been started yet.
                  </p>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Claim page
                </div>
                {claimId && (
                  <Link
                    href={`/staff/claims/${claimId}`}
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Back to claim
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main column – Inspector Dialogue */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Inspector Dialogue</CardTitle>
              <CardDescription>
                HMRC-style questions and your responses, one focused issue at a time.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-[600px] flex-col gap-4">
              <div className="flex-1 space-y-3 overflow-y-auto rounded-md bg-muted/40 p-3 text-sm">
                {inspectorMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Start the inspector to generate the first question based on this claim.
                  </p>
                ) : (
                  inspectorMessages.map((m) => (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-medium">
                          {m.role === "inspector" ? "Inspector" : "You"}
                        </span>
                        <span>
                          {m.created_at
                            ? new Date(m.created_at).toLocaleTimeString()
                            : ""}
                        </span>
                      </div>
                      <div
                        className={
                          m.role === "inspector"
                            ? "rounded-md bg-background p-2 shadow-sm"
                            : "ml-4 rounded-md bg-primary/10 p-2"
                        }
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {m.message_text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Write your response to the inspector..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  rows={3}
                  disabled={isSending || isStarting || session?.status === "completed"}
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleStart}
                      disabled={!!session || isStarting || !claimId}
                      size="sm"
                    >
                      {isStarting ? "Starting..." : "Start Inspector"}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSend}
                      disabled={
                        !session ||
                        !userInput.trim() ||
                        isSending ||
                        session.status === "completed"
                      }
                      size="sm"
                    >
                      {isSending ? "Sending..." : "Send Response"}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnd}
                    disabled={!session || session.status === "completed" || isEnding}
                  >
                    {isEnding ? "Ending..." : "End Review"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right column – Live Findings */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Live Findings</CardTitle>
              <CardDescription>
                Weaknesses and guidance as the review progresses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Current score
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {formatScore(session?.overall_score ?? null)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Risk level
                </div>
                <div className="mt-1">
                  {formatRiskBadge(session?.risk_level ?? null)}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Findings (by severity)
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-red-600">High</span>
                      <span>{groupedFindings.high.length}</span>
                    </div>
                    <ul className="mt-1 space-y-1 text-xs">
                      {groupedFindings.high.slice(0, 3).map((f) => (
                        <li key={f.id} className="leading-snug">
                          • {f.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-amber-600">Medium</span>
                      <span>{groupedFindings.medium.length}</span>
                    </div>
                    <ul className="mt-1 space-y-1 text-xs">
                      {groupedFindings.medium.slice(0, 3).map((f) => (
                        <li key={f.id} className="leading-snug">
                          • {f.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-emerald-600">Low</span>
                      <span>{groupedFindings.low.length}</span>
                    </div>
                    <ul className="mt-1 space-y-1 text-xs">
                      {groupedFindings.low.slice(0, 3).map((f) => (
                        <li key={f.id} className="leading-snug">
                          • {f.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Advisor guidance
                </div>
                {latestAdvisorHint ? (
                  <div className="rounded-md bg-muted p-2 text-xs leading-relaxed">
                    <p className="mb-1 font-medium">Private hint</p>
                    <p className="whitespace-pre-wrap">
                      {latestAdvisorHint.message_text}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Advisor-only guidance will appear here as the inspector identifies
                    weaknesses.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StaffLayout>
  );
}