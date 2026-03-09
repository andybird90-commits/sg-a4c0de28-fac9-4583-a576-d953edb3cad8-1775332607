import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Camera, Upload, CheckCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { organisationNotificationStatusService } from "@/services/organisationNotificationStatusService";
import type { NotificationStatusState } from "@/services/organisationNotificationStatusService";

const slides = [
  {
    icon: Camera,
    title: "Your R&D companion.",
    description: "Capture evidence wherever you are."
  },
  {
    icon: Upload,
    title: "Snap, upload, done.",
    description: "Photos, documents, and notes sync automatically."
  },
  {
    icon: CheckCircle,
    title: "Stay organised effortlessly.",
    description: "Everything feeds into your consultant's system."
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, currentOrg } = useApp();
  const { toast } = useToast();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifChecking, setNotifChecking] = useState(false);

  const [hasClaimedBefore, setHasClaimedBefore] = useState<"yes" | "no" | "dont_know">("dont_know");
  const [claimedWithinLast3Years, setClaimedWithinLast3Years] = useState<"yes" | "no" | "dont_know">("dont_know");
  const [accountingPeriodStart, setAccountingPeriodStart] = useState<string>("");
  const [accountingPeriodEnd, setAccountingPeriodEnd] = useState<string>("");
  const [internalRdContactName, setInternalRdContactName] = useState<string>("");
  const [internalRdContactEmail, setInternalRdContactEmail] = useState<string>("");
  const [organisationRdSummary, setOrganisationRdSummary] = useState<string>("");

  const [notificationStatus, setNotificationStatus] = useState<NotificationStatusState | null>(null);
  const [notificationRequired, setNotificationRequired] = useState<boolean | null>(null);
  const [deadlineDate, setDeadlineDate] = useState<string | null>(null);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  useEffect(() => {
    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const loadExistingNotificationStatus = async () => {
      if (!currentOrg) return;
      try {
        const existing = await organisationNotificationStatusService.getOrganisationNotificationStatus(
          currentOrg.id
        );
        if (existing) {
          setNotificationStatus(existing.status as NotificationStatusState);
          setNotificationRequired(existing.notification_required);
          setDeadlineDate(existing.deadline_date);
          setAccountingPeriodStart(existing.accounting_period_start ?? "");
          setAccountingPeriodEnd(existing.accounting_period_end ?? "");
          setInternalRdContactName(existing.internal_rd_contact_name ?? "");
          setInternalRdContactEmail(existing.internal_rd_contact_email ?? "");
          setOrganisationRdSummary(existing.organisation_rd_summary ?? "");
          if (existing.has_claimed_before === true) setHasClaimedBefore("yes");
          else if (existing.has_claimed_before === false) setHasClaimedBefore("no");
          else setHasClaimedBefore("dont_know");
          if (existing.claimed_within_last_3_years === true) setClaimedWithinLast3Years("yes");
          else if (existing.claimed_within_last_3_years === false) setClaimedWithinLast3Years("no");
          else setClaimedWithinLast3Years("dont_know");
        }
      } catch (error) {
        console.error("Failed to load organisation notification status", error);
      }
    };

    loadExistingNotificationStatus();
  }, [user, router, currentOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setLoading(true);
    try {
      // Existing onboarding save logic...
      toast({
        title: "Onboarding complete",
        description: "Your details have been saved.",
      });
      router.push("/home");
    } catch (error: any) {
      // Existing error handling...
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationCheck = async () => {
    if (!currentOrg) return;
    setNotifChecking(true);
    try {
      const result =
        await organisationNotificationStatusService.upsertOrganisationNotificationStatus({
          organisation_id: currentOrg.id,
          accounting_period_start: accountingPeriodStart || null,
          accounting_period_end: accountingPeriodEnd || null,
          has_claimed_before:
            hasClaimedBefore === "yes"
              ? true
              : hasClaimedBefore === "no"
              ? false
              : null,
          claimed_within_last_3_years:
            claimedWithinLast3Years === "yes"
              ? true
              : claimedWithinLast3Years === "no"
              ? false
              : null,
          internal_rd_contact_name: internalRdContactName || null,
          internal_rd_contact_email: internalRdContactEmail || null,
          organisation_rd_summary: organisationRdSummary || null,
        });

      setNotificationStatus(result.status as NotificationStatusState);
      setNotificationRequired(result.notification_required);
      setDeadlineDate(result.deadline_date);

      toast({
        title: "HMRC notification status updated",
        description:
          result.status === "required"
            ? "An HMRC claim notification is required for this organisation."
            : result.status === "not_required"
            ? "Notification is not required for this organisation."
            : "Notification position is currently unclear. Please review before submission.",
      });
    } catch (error: any) {
      console.error("Notification status update failed", error);
      toast({
        title: "Notification check failed",
        description: error?.message || "Unable to update notification status.",
        variant: "destructive",
      });
    } finally {
      setNotifChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-12 text-center">
          <div className="w-32 h-32 mx-auto rounded-3xl accent-gradient flex items-center justify-center shadow-professional-md">
            <Icon className="w-16 h-16 text-white" strokeWidth={2.5} />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground leading-tight">
              {slide.title}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {slide.description}
            </p>
          </div>

          <div className="flex gap-2 justify-center">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "w-8 bg-[#ff6b35]"
                    : "w-2 bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3 safe-bottom bg-background border-t border-border">
        {!isLastSlide ? (
          <Button 
            className="w-full h-14 text-lg font-semibold bg-[#ff6b35] hover:bg-[#ff8c42] text-slate-950 rounded-xl shadow-professional-md"
            onClick={handleNext}
          >
            Next
          </Button>
        ) : (
          <>
            <Button 
              className="w-full h-14 text-lg font-semibold bg-[#ff6b35] hover:bg-[#ff8c42] text-slate-950 rounded-xl shadow-professional-md"
              onClick={() => router.push("/auth/login")}
            >
              Log in
            </Button>
            <Button 
              className="w-full h-14 text-lg font-semibold bg-card hover:bg-muted text-foreground rounded-xl border border-border"
              onClick={() => router.push("/auth/signup")}
            >
              Sign up
            </Button>
          </>
        )}
      </div>
    </div>
  );
}