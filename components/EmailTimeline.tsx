"use client";

import { Doc } from "@/convex/_generated/dataModel";
import {
  EmailTouch,
  formatTimelineDate,
  touchLabel,
  touchTimelineLabel,
  touchWaitDays,
  waitLabel,
} from "@/lib/email-sequence";
import { useState } from "react";

type EmailSend = Doc<"emailSends">;

type EmailTimelineProps = {
  touches: EmailTouch[];
  sends?: EmailSend[] | null;
  recipientLabel?: string;
  subject?: string;
  variant?: "light" | "dark";
  onSelectStep?: (step: number) => void;
};

function sendForStep(sends: EmailSend[] | undefined | null, step: number) {
  return sends?.find((send) => send.step === step);
}

function stepStatus(
  touch: EmailTouch,
  send: EmailSend | undefined,
): "upcoming" | "active" | "sent" | "failed" | "scheduled" {
  if (send?.status === "sent") return "sent";
  if (send?.status === "failed") return "failed";
  if (send?.status === "scheduled") {
    if (touch.step === 1 && send.scheduledAt <= Date.now()) return "active";
    return "scheduled";
  }
  return "upcoming";
}

export function EmailTimeline({
  touches,
  sends,
  recipientLabel,
  subject,
  variant = "dark",
  onSelectStep,
}: EmailTimelineProps) {
  const isDark = variant === "dark";
  const sorted = [...touches].sort((a, b) => a.step - b.step);
  const [selectedStep, setSelectedStep] = useState(sorted[0]?.step ?? 1);

  const t = {
    muted: isDark ? "text-zinc-500" : "text-[#52525b]",
    heading: isDark ? "text-white" : "text-[#0a0a0a]",
    body: isDark ? "text-zinc-300" : "text-[#18181b]",
    line: isDark ? "bg-white/10" : "bg-[#d4d4cc]",
    active: isDark ? "border-white/30 bg-white/10" : "border-[#a1a1aa] bg-[#f4f4f0]",
    idle: isDark ? "border-white/10 bg-transparent" : "border-[#e4e4e7] bg-white",
    sent: isDark ? "text-emerald-400" : "text-emerald-700",
    failed: isDark ? "text-red-400" : "text-red-700",
    wait: isDark ? "text-zinc-600" : "text-[#71717a]",
  };

  const activeTouch = sorted.find((touch) => touch.step === selectedStep) ?? sorted[0];
  const activeSend = sendForStep(sends, selectedStep);
  const previewBody = activeSend?.body ?? activeTouch?.body ?? "";
  const previewSubject = activeSend?.subject ?? subject ?? "";

  function selectStep(step: number) {
    setSelectedStep(step);
    onSelectStep?.(step);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <div>
        {recipientLabel && (
          <p className={`mb-4 text-xs ${t.muted}`}>
            Sequence to <span className={t.heading}>{recipientLabel}</span>
          </p>
        )}
        <ol className="relative space-y-0">
          {sorted.map((touch, index) => {
            const send = sendForStep(sends, touch.step);
            const status = stepStatus(touch, send);
            const isSelected = selectedStep === touch.step;
            const waitDays = touchWaitDays(touch);

            return (
              <li key={touch.step} className="relative pb-1">
                {index < sorted.length - 1 && (
                  <span
                    className={`absolute left-[15px] top-8 h-[calc(100%-8px)] w-px ${t.line}`}
                    aria-hidden
                  />
                )}

                <button
                  type="button"
                  onClick={() => selectStep(touch.step)}
                  className={`relative flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                    isSelected ? t.active : t.idle
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      status === "sent"
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                        : status === "failed"
                          ? "border-red-500/40 bg-red-500/15 text-red-400"
                          : status === "active"
                            ? "border-white/40 bg-white text-black"
                            : isDark
                              ? "border-white/20 text-zinc-400"
                              : "border-[#d4d4cc] text-[#71717a]"
                    }`}
                  >
                    {touch.step}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${t.heading}`}>
                      {touchLabel(touch)}
                    </span>
                    <span className={`mt-0.5 block text-[11px] ${t.muted}`}>
                      {send?.status === "sent" && send.sentAt
                        ? `Sent · ${formatTimelineDate(send.sentAt)}`
                        : send?.status === "scheduled"
                          ? formatTimelineDate(send.scheduledAt)
                          : touchTimelineLabel(touch, sorted)}
                    </span>
                    {status === "failed" && send?.error && (
                      <span className={`mt-1 block text-[10px] ${t.failed}`}>
                        {send.error}
                      </span>
                    )}
                  </span>
                </button>

                {index < sorted.length - 1 && waitDays > 0 && (
                  <div className={`flex items-center gap-2 py-2 pl-[15px] text-[11px] ${t.wait}`}>
                    <span className={`h-px flex-1 ${t.line}`} />
                    <span className="shrink-0 px-1">{waitLabel(waitDays)}</span>
                    <span className={`h-px flex-1 ${t.line}`} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div
        className={`rounded-xl border p-4 ${
          isDark ? "border-white/10 bg-[#1a1a1a]" : "border-[#d4d4cc] bg-[#fafaf8]"
        }`}
      >
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.muted}`}>
          {activeSend?.status === "sent" ? "Sent email" : "Preview"}
        </p>
        {previewSubject && (
          <p className={`mt-2 text-sm font-medium ${t.heading}`}>{previewSubject}</p>
        )}
        <p className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed ${t.body}`}>
          {previewBody}
        </p>
      </div>
    </div>
  );
}
