"use client";

import { Doc } from "@/convex/_generated/dataModel";

type RunStatus = Doc<"runs">["status"];

const STEPS = [
  {
    label: "Scanning your website",
    detail: "Reading pages, meta tags, and brand signals from your URL",
  },
  {
    label: "Detecting buyer personas",
    detail: "GPT-4o maps segments, pain points, and messaging angles",
  },
  {
    label: "Running outbound pipelines",
    detail: "Fiber AI leads · Orange Slice intent · cold email sequences",
  },
  {
    label: "Creating inbound content",
    detail: "Branded posters and captions for LinkedIn, X, and Instagram",
  },
  {
    label: "Scheduling calendar",
    detail: "Posts and follow-up meetings appear on your GTM calendar",
  },
] as const;

function stepState(
  status: RunStatus,
  index: number,
): "done" | "active" | "pending" {
  if (status === "failed") return index === 0 ? "active" : "pending";
  if (status === "complete") return "done";

  if (status === "pending") return index === 0 ? "active" : "pending";
  if (status === "analyzing") {
    if (index === 0) return "done";
    if (index === 1) return "active";
    return "pending";
  }
  if (status === "personas_ready") {
    if (index <= 1) return "done";
    if (index === 2) return "active";
    return "pending";
  }
  if (status === "processing") {
    if (index <= 1) return "done";
    if (index <= 3) return "active";
    return "pending";
  }
  return "pending";
}

function statusHeadline(status: RunStatus, hostname: string): string {
  switch (status) {
    case "pending":
      return "Starting your GTM run…";
    case "analyzing":
      return `Analyzing ${hostname}`;
    case "personas_ready":
      return "Personas found — launching pipelines";
    case "processing":
      return "Building your full GTM stack";
    case "complete":
      return "Your GTM run is ready";
    case "failed":
      return "Something went wrong";
    default:
      return "Working…";
  }
}

function statusSubtext(status: RunStatus): string {
  switch (status) {
    case "pending":
      return "Queuing site analysis and persona detection. This usually takes 15–30 seconds.";
    case "analyzing":
      return "We're reading your site and detecting buyer personas. Pipelines start automatically when ready.";
    case "personas_ready":
      return "Buyer segments are locked in. Outbound and inbound agents are spinning up in parallel.";
    case "processing":
      return "Leads, emails, posters, and calendar events stream in as each persona finishes. Nothing is broken — check back in a moment.";
    case "complete":
      return "Explore personas on the left, approve campaigns below, and switch clients from the top right.";
    case "failed":
      return "Try a new run or paste the URL again.";
    default:
      return "";
  }
}

type RunProgressProps = {
  status: RunStatus;
  hostname: string;
  variant?: "hero" | "hero-dark" | "compact" | "strip";
  personaCount?: number;
  personasComplete?: number;
};

export function RunProgress({
  status,
  hostname,
  variant = "hero",
  personaCount = 0,
  personasComplete = 0,
}: RunProgressProps) {
  if (variant === "strip") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, i) => {
          const state = stepState(status, i);
          return (
            <span
              key={step.label}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                state === "done"
                  ? "bg-emerald-100 text-emerald-900"
                  : state === "active"
                    ? "tab-active"
                    : "bg-[#ecece7] text-[#a1a1aa]"
              }`}
            >
              {state === "done" ? "✓" : state === "active" ? "●" : "○"}{" "}
              {step.label.split(" ")[0]}
            </span>
          );
        })}
      </div>
    );
  }

  const steps = variant === "compact" ? STEPS.slice(0, 4) : STEPS;
  const isDark = variant === "hero-dark";

  return (
    <div
      className={
        variant === "hero"
          ? "surface flex min-h-[420px] flex-col justify-center rounded-xl px-6 py-10 sm:px-10"
          : variant === "hero-dark"
            ? "flex min-h-[420px] flex-col justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-10 sm:px-10"
            : "rounded-lg border border-[#ecece7] bg-[#fafaf8] px-4 py-5"
      }
    >
      <div className={variant === "hero" || variant === "hero-dark" ? "mx-auto w-full max-w-lg" : ""}>
        <div className="flex items-center gap-3">
          {status !== "failed" && status !== "complete" && (
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${isDark ? "bg-violet-400" : "bg-violet-400"}`} />
              <span className={`relative inline-flex h-3 w-3 rounded-full ${isDark ? "bg-violet-400" : "bg-violet-600"}`} />
            </span>
          )}
          <p
            className={`font-[family-name:var(--font-display)] tracking-tight ${
              isDark ? "text-white" : "text-[#0a0a0a]"
            } ${variant === "hero" || variant === "hero-dark" ? "text-2xl sm:text-3xl" : "text-base"}`}
          >
            {statusHeadline(status, hostname)}
          </p>
        </div>
        <p
          className={`mt-3 leading-relaxed ${
            isDark ? "text-zinc-400" : "text-[#3f3f46]"
          } ${variant === "hero" || variant === "hero-dark" ? "text-sm sm:text-base" : "text-xs"}`}
        >
          {statusSubtext(status)}
        </p>

        {status === "processing" && personaCount > 0 && (
          <p className={`mt-2 text-xs font-medium ${isDark ? "text-violet-300" : "text-violet-900"}`}>
            {personasComplete} of {personaCount} persona
            {personaCount === 1 ? "" : "s"} complete
          </p>
        )}

        <ol className={`space-y-3 ${variant === "hero" || variant === "hero-dark" ? "mt-8" : "mt-4"}`}>
          {steps.map((step, i) => {
            const state = stepState(status, i);
            return (
              <li key={step.label} className="flex gap-3">
                <StepIcon state={state} dark={isDark} />
                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-sm font-medium ${
                      state === "pending"
                        ? isDark
                          ? "text-zinc-600"
                          : "text-[#a1a1aa]"
                        : isDark
                          ? "text-white"
                          : "text-[#0a0a0a]"
                    }`}
                  >
                    {step.label}
                  </p>
                  {(state === "active" || variant === "hero" || variant === "hero-dark") && (
                    <p
                      className={`mt-0.5 leading-relaxed ${
                        state === "active"
                          ? isDark
                            ? "text-zinc-400"
                            : "text-[#52525b]"
                          : isDark
                            ? "text-zinc-600"
                            : "text-[#a1a1aa]"
                      } ${variant === "compact" ? "text-[11px]" : "text-xs"}`}
                    >
                      {step.detail}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function StepIcon({
  state,
  dark,
}: {
  state: "done" | "active" | "pending";
  dark?: boolean;
}) {
  if (state === "done") {
    return (
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        dark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-800"
      }`}>
        ✓
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${dark ? "bg-violet-400" : "bg-violet-600"}`} />
      </span>
    );
  }
  return (
    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
      dark ? "border-white/15 bg-white/5" : "border-[#d4d4cc] bg-white"
    }`} />
  );
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
