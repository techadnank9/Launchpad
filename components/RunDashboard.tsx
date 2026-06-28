"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { RevenueCockpit } from "./RevenueCockpit";

export function RunDashboard({ runId }: { runId: string }) {
  const typedRunId = runId as Id<"runs">;
  const run = useQuery(api.runs.getRun, { runId: typedRunId });
  const siteMemory = useQuery(api.sites.getSiteForRun, { runId: typedRunId });
  const personas = useQuery(api.personas.listByRun, { runId: typedRunId });
  const exportCsv = useMutation(api.leads.exportCsv);

  async function handleExport() {
    const csv = await exportCsv({ runId: typedRunId });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "launchpad-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (run === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-zinc-500">Loading your GTM workspace…</p>
      </div>
    );
  }

  if (run === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a]">
        <p className="text-zinc-400">Run not found.</p>
        <Link
          href="/"
          className="mt-4 text-sm font-medium text-white underline underline-offset-2"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <RevenueCockpit
      runId={runId}
      run={run}
      siteMemory={siteMemory ?? null}
      personas={personas}
      onExport={run.status === "complete" ? handleExport : undefined}
    />
  );
}
