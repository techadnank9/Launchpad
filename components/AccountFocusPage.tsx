"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  defaultStageForColumn,
  toBoardLead,
  type PipelineColumnId,
} from "@/lib/pipeline-board";
import { runWorkspaceUrl } from "@/lib/run-urls";
import { ClientSwitcher } from "./ClientSwitcher";
import { LeadDetailPanel } from "./LeadDetailPanel";
import { getHostname } from "./RunProgress";

type AccountFocusPageProps = {
  runId: string;
  leadId: string;
};

export function AccountFocusPage({ runId, leadId }: AccountFocusPageProps) {
  const typedRunId = runId as Id<"runs">;
  const typedLeadId = leadId as Id<"leads">;
  const run = useQuery(api.runs.getRun, { runId: typedRunId });
  const leads = useQuery(api.leads.listByRun, { runId: typedRunId });
  const personas = useQuery(api.personas.listByRun, { runId: typedRunId });
  const siteMemory = useQuery(api.sites.getSiteForRun, { runId: typedRunId });
  const updateStage = useMutation(api.leads.updatePipelineStage);

  const lead = useMemo(() => {
    if (!leads || !personas) return undefined;
    const doc = leads.find((l) => l._id === typedLeadId);
    if (!doc) return null;
    const persona = personas.find((p) => p._id === doc.personaId);
    return toBoardLead(doc, persona);
  }, [leads, personas, typedLeadId]);

  const moveLead = useCallback(
    async (columnId: PipelineColumnId) => {
      await updateStage({
        leadId: typedLeadId,
        pipelineStage: defaultStageForColumn(columnId),
      });
    },
    [typedLeadId, updateStage],
  );

  if (run === undefined || lead === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-zinc-500">Loading account…</p>
      </div>
    );
  }

  if (run === null || lead === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a]">
        <p className="text-zinc-400">Account not found.</p>
        <Link
          href={runWorkspaceUrl(runId)}
          className="mt-4 text-sm font-medium text-white underline underline-offset-2"
        >
          Back to workspace
        </Link>
      </div>
    );
  }

  const hostname = getHostname(run.url);
  const siteId = run.siteId ?? siteMemory?.site._id;
  const workspaceAccountsUrl = `${runWorkspaceUrl(runId)}?tab=accounts&lead=${leadId}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="app-shell flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-xl tracking-tight text-white"
            >
              Autogrow
            </Link>
            <span className="hidden text-zinc-600 sm:inline">/</span>
            <Link
              href={workspaceAccountsUrl}
              className="hidden truncate text-sm text-zinc-400 hover:text-white sm:inline"
            >
              {hostname}
            </Link>
            <span className="hidden text-zinc-600 sm:inline">/</span>
            <span className="truncate text-sm text-white">{lead.company}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={workspaceAccountsUrl}
              className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
            >
              Back to accounts
            </Link>
            <ClientSwitcher activeSiteId={siteId} />
          </div>
        </div>
      </header>

      <main className="app-shell flex flex-1 flex-col py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-2xl">
          <LeadDetailPanel
            lead={lead}
            runId={typedRunId}
            companyName={run.brandCompanyName}
            logoUrl={run.brandLogoUrl}
            brandColor={run.brandColors?.[0]}
            brandColors={run.brandColors ?? []}
            onMove={moveLead}
          />
        </div>
      </main>
    </div>
  );
}
