"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SEQUENCE_EXPLAINER } from "@/lib/email-sequence";
import { EmailTimeline } from "./EmailTimeline";

type EmailSequenceProps = {
  personaId: Id<"personas">;
  variant?: "light" | "dark";
};

export function EmailSequence({
  personaId,
  variant = "light",
}: EmailSequenceProps) {
  const isDark = variant === "dark";
  const email = useQuery(api.emails.getByPersona, { personaId });

  const t = {
    muted: isDark ? "text-zinc-500" : "text-[#52525b]",
    skeleton: isDark ? "bg-white/10" : "bg-[#ecece7]",
    note: isDark ? "text-zinc-400" : "text-[#52525b]",
  };

  if (email === undefined) {
    return <div className={`h-24 animate-pulse rounded ${t.skeleton}`} />;
  }

  if (!email) {
    return (
      <p className={`py-8 text-center text-sm ${t.muted}`}>
        Writing email sequence…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className={`text-xs leading-relaxed ${t.note}`}>{SEQUENCE_EXPLAINER}</p>
      <p className={`text-xs ${t.muted}`}>
        Open a lead from Accounts or Pipeline to send the opener — follow-ups
        drip automatically on the timeline.
      </p>
      <EmailTimeline
        touches={email.touches}
        subject={email.subject}
        variant={variant}
      />
    </div>
  );
}
