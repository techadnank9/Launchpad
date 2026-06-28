"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  defaultStageForColumn,
  toBoardLead,
  type MonacoColumnId,
} from "@/lib/monaco-board";
import { AccountsTable } from "./AccountsTable";
import { ClientSwitcher } from "./ClientSwitcher";
import { ContentCalendar } from "./ContentCalendar";
import { LeadDrawer } from "./LeadDrawer";
import { PipelineBoard } from "./PipelineBoard";
import { RunProgress, getHostname } from "./RunProgress";

const MODES = ["Pipeline", "Accounts", "Publish"] as const;
type Mode = (typeof MODES)[number];

const statusLabels: Record<string, string> = {
  pending: "Starting",
  analyzing: "Analyzing site",
  personas_ready: "Personas found",
  processing: "Running pipelines",
  complete: "Complete",
  failed: "Failed",
};

type RevenueCockpitProps = {
  runId: string;
  run: Doc<"runs">;
  siteMemory: {
    site: { _id: Id<"sites">; domain: string };
    personaCount: number;
    leadCount: number;
  } | null;
  personas: Doc<"personas">[] | undefined;
  onExport?: () => void;
};

export function RevenueCockpit({
  runId,
  run,
  siteMemory,
  personas,
  onExport,
}: RevenueCockpitProps) {
  const typedRunId = runId as Id<"runs">;
  const leads = useQuery(api.leads.listByRun, { runId: typedRunId });
  const updateStage = useMutation(api.leads.updatePipelineStage);

  const [mode, setMode] = useState<Mode>("Pipeline");
  const [personaFilter, setPersonaFilter] = useState<Id<"personas"> | "all">(
    "all",
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const hostname = getHostname(run.url);
  const siteId = run.siteId ?? siteMemory?.site._id;

  const isRunning =
    run.status === "pending" ||
    run.status === "analyzing" ||
    run.status === "processing" ||
    run.status === "personas_ready";

  const personaNames = useMemo(
    () => Object.fromEntries((personas ?? []).map((p) => [p._id, p.name])),
    [personas],
  );

  const boardLeads = useMemo(() => {
    if (!leads) return [];
    const personaById = Object.fromEntries((personas ?? []).map((p) => [p._id, p]));
    return leads
      .filter(
        (l) => personaFilter === "all" || l.personaId === personaFilter,
      )
      .map((l) => {
        const p = personaById[l.personaId];
        return toBoardLead(l, p ?? { name: personaNames[l.personaId] });
      });
  }, [leads, personaFilter, personas, personaNames]);

  const selectedLead = useMemo(
    () => boardLeads.find((l) => l.id === selectedLeadId) ?? null,
    [boardLeads, selectedLeadId],
  );

  const moveLead = useCallback(
    async (leadId: string, columnId: MonacoColumnId) => {
      await updateStage({
        leadId: leadId as Id<"leads">,
        pipelineStage: defaultStageForColumn(columnId),
      });
    },
    [updateStage],
  );

  const showProgressHero =
    isRunning &&
    (personas === undefined || personas.length === 0) &&
    (leads === undefined || leads.length === 0);

  const personasComplete =
    personas?.filter((p) => p.status === "complete").length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="app-shell flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-xl tracking-tight text-white"
            >
              Launchpad
            </Link>
            <span className="hidden truncate font-mono text-sm text-zinc-500 sm:inline">
              {hostname}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/how-it-works"
              className="hidden rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white sm:inline"
            >
              How it works
            </Link>
            <Link
              href="/"
              className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
            >
              New run
            </Link>
            <ClientSwitcher activeSiteId={siteId} />
          </div>
        </div>

        <div className="app-shell border-t border-white/5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                running={isRunning}
                label={statusLabels[run.status] ?? run.status}
                failed={run.status === "failed"}
              />
              {siteMemory &&
                (siteMemory.personaCount > 0 || siteMemory.leadCount > 0) && (
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-300">
                    Remembered · {siteMemory.personaCount} personas ·{" "}
                    {siteMemory.leadCount} leads
                  </span>
                )}
              {leads && leads.length > 0 && (
                <span className="font-mono text-xs tabular-nums text-zinc-600">
                  {boardLeads.length} lead{boardLeads.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {run.status === "complete" && onExport && (
                <button
                  type="button"
                  onClick={onExport}
                  className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
                >
                  Export CSV
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-white/5 p-0.5">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    mode === m
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {personas && personas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-l border-white/10 pl-2">
                <PersonaChip
                  active={personaFilter === "all"}
                  onClick={() => setPersonaFilter("all")}
                  label="All personas"
                />
                {personas.map((p) => (
                  <PersonaChip
                    key={p._id}
                    active={personaFilter === p._id}
                    onClick={() => setPersonaFilter(p._id)}
                    label={p.name}
                    status={p.status}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-shell py-8">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-white sm:text-4xl">
            {run.brandCompanyName ?? hostname}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {mode === "Pipeline" &&
              "Review scored leads, drag between stages, click to approve outbound and inbound."}
            {mode === "Accounts" &&
              "Companies ranked by Orange Slice intent — expand to see suggested contacts."}
            {mode === "Publish" &&
              "Campaign calendar and meetings across all personas."}
          </p>
        </div>

        {showProgressHero ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <RunProgress
              status={run.status}
              hostname={hostname}
              variant="hero"
              personaCount={personas?.length ?? 0}
              personasComplete={personasComplete}
            />
          </div>
        ) : mode === "Pipeline" ? (
          <PipelineBoard
            leads={boardLeads}
            loading={leads === undefined || personas === undefined}
            onSelectLead={(lead) => setSelectedLeadId(lead.id)}
            onMoveLead={moveLead}
          />
        ) : mode === "Accounts" ? (
          <AccountsTable
            leads={boardLeads}
            onSelectLead={(lead) => setSelectedLeadId(lead.id)}
          />
        ) : (
          <ContentCalendar
              runId={typedRunId}
              siteId={siteId}
              personas={personas ?? []}
              runStatus={run.status}
              hostname={hostname}
              variant="dark"
            />
        )}
      </main>

      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          run={run}
          runId={typedRunId}
          onClose={() => setSelectedLeadId(null)}
          onMove={async (columnId) => {
            await moveLead(selectedLead.id, columnId);
          }}
        />
      )}
    </div>
  );
}

function PersonaChip({
  label,
  active,
  onClick,
  status,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  status?: Doc<"personas">["status"];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
          : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
      }`}
    >
      {label}
      {status === "processing" && (
        <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
      )}
    </button>
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
          ? "border-red-500/40 bg-red-500/15 text-red-300"
          : running
            ? "border-white/15 bg-white/5 text-zinc-400"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {running && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
      )}
      {label}
    </span>
  );
}
