"use client";

import Link from "next/link";
import { Doc } from "@/convex/_generated/dataModel";

type SiteMemory = {
  domain: string;
  personaCount: number;
  leadCount: number;
};

type RunToolbarProps = {
  run: Doc<"runs">;
  runId?: string;
  isRunning: boolean;
  statusLabel: string;
  siteMemory?: SiteMemory | null;
  onExport?: () => void;
};

export function RunToolbar({
  run,
  runId,
  isRunning,
  statusLabel,
  siteMemory,
  onExport,
}: RunToolbarProps) {
  let hostname = run.url;
  try {
    hostname = new URL(run.url).hostname;
  } catch {
    /* keep raw url */
  }

  return (
    <div className="surface border-x-0 border-t-0 bg-white">
      <div className="app-shell flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate font-mono text-sm text-[#0a0a0a]">{hostname}</span>
          <StatusPill running={isRunning} label={statusLabel} failed={run.status === "failed"} />
          {siteMemory && (siteMemory.personaCount > 0 || siteMemory.leadCount > 0) && (
            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-950">
              Remembered · {siteMemory.personaCount} personas · {siteMemory.leadCount} leads
            </span>
          )}
        </div>
        {run.valueProp ? (
          <p className="hidden min-w-0 flex-1 truncate text-sm text-[#3f3f46] lg:block">
            {run.valueProp}
          </p>
        ) : isRunning ? (
          <p className="hidden min-w-0 flex-1 truncate text-sm text-[#52525b] lg:block">
            Reading your site and building personas — results stream in live
          </p>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {runId && (
            <Link
              href={`/run/${runId}/pipeline`}
              className="rounded-md border border-[#d4d4cc] bg-white px-3 py-1.5 text-sm font-medium text-[#0a0a0a] hover:bg-[#ecece7]"
            >
              Pipeline board
            </Link>
          )}
          {run.status === "complete" && onExport && (
            <button
              onClick={onExport}
              className="rounded-md border border-[#d4d4cc] bg-white px-3 py-1.5 text-sm text-[#0a0a0a] hover:bg-[#ecece7]"
            >
              Export CSV
            </button>
          )}
        </div>
        {run.error && (
          <p className="w-full text-sm font-medium text-red-800">{run.error}</p>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  running,
  label,
  failed,
}: {
  running: boolean;
  label: string;
  failed?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        failed
          ? "border-red-300 bg-red-100 text-red-900"
          : running
            ? "border-[#d4d4cc] bg-[#ecece7] text-[#3f3f46]"
            : "border-emerald-300 bg-emerald-100 text-emerald-900"
      }`}
    >
      {running && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0a0a0a]" />
      )}
      {label}
    </span>
  );
}
