"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ClientSwitcher } from "./ClientSwitcher";
import { PipelineBoard } from "./PipelineBoard";
import { getHostname } from "./RunProgress";

export function PipelinePage({ runId }: { runId: string }) {
  const typedRunId = runId as Id<"runs">;
  const run = useQuery(api.runs.getRun, { runId: typedRunId });
  const siteMemory = useQuery(api.sites.getSiteForRun, { runId: typedRunId });
  const leadCount = useQuery(api.leads.listByRun, { runId: typedRunId });

  const hostname = run ? getHostname(run.url) : "";
  const siteId = run?.siteId ?? siteMemory?.site._id;
  const totalLeads = leadCount?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="app-shell flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-xl tracking-tight text-white"
            >
              Launchpad
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href={`/run/${runId}`}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>
              <span className="tab-active rounded-md px-3 py-1.5 text-sm">
                Pipeline
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
          <Link
            href="/how-it-works"
            className="hidden rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5 sm:inline"
          >
            How it works
          </Link>
          <Link
            href="/"
            className="hidden rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5 sm:inline"
          >
            New run
          </Link>
            <ClientSwitcher activeSiteId={siteId} />
          </div>
        </div>
      </header>

      <main className="app-shell py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
              Revenue pipeline
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight text-white sm:text-4xl">
              {run?.brandCompanyName ?? hostname}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Agents working for you — leads move from Discovery to Proposal
              based on Orange Slice intent scores.
            </p>
          </div>
          {totalLeads > 0 && (
            <p className="font-mono text-sm tabular-nums text-zinc-500">
              {totalLeads} lead{totalLeads === 1 ? "" : "s"} in pipeline
            </p>
          )}
        </div>

        <PipelineBoard runId={typedRunId} />
      </main>
    </div>
  );
}
