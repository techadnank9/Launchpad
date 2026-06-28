"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { SiteNav } from "./SiteNav";
import { RunToolbar } from "./RunToolbar";
import { PersonaSidebar } from "./PersonaSidebar";
import { PersonaDetail } from "./PersonaDetail";
import { ContentCalendar } from "./ContentCalendar";
import { ClientProfilePanel } from "./ClientSwitcher";
import { RunProgress, getHostname } from "./RunProgress";

const statusLabels: Record<string, string> = {
  pending: "Starting",
  analyzing: "Analyzing site",
  personas_ready: "Personas found",
  processing: "Running pipelines",
  complete: "Complete",
  failed: "Failed",
};

export function RunDashboard({ runId }: { runId: string }) {
  const typedRunId = runId as Id<"runs">;
  const run = useQuery(api.runs.getRun, { runId: typedRunId });
  const siteMemory = useQuery(api.sites.getSiteForRun, { runId: typedRunId });
  const personas = useQuery(api.personas.listByRun, { runId: typedRunId });
  const exportCsv = useMutation(api.leads.exportCsv);

  const [selectedPersonaId, setSelectedPersonaId] = useState<Id<"personas"> | null>(
    null,
  );

  const selectedPersona =
    personas?.find((p) => p._id === selectedPersonaId) ?? personas?.[0] ?? null;

  const isRunning =
    run?.status === "pending" ||
    run?.status === "analyzing" ||
    run?.status === "processing" ||
    run?.status === "personas_ready";

  const hostname = run ? getHostname(run.url) : "";
  const personasComplete =
    personas?.filter((p) => p.status === "complete").length ?? 0;

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
      <div className="min-h-screen">
        <SiteNav showNewRun activeSiteId={siteMemory?.site._id} />
        <div className="app-shell py-8">
          <div className="h-12 animate-pulse rounded-lg bg-[#ecece7]" />
          <div className="mt-8 grid gap-8 xl:grid-cols-[14rem_1fr_14rem]">
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-[#ecece7]" />
              ))}
            </div>
            <div className="h-[420px] animate-pulse rounded-xl bg-[#ecece7]" />
            <div className="hidden h-64 animate-pulse rounded-xl bg-[#ecece7] xl:block" />
          </div>
          <p className="mt-6 text-center text-sm text-[#52525b]">
            Loading your GTM workspace…
          </p>
        </div>
      </div>
    );
  }

  if (run === null) {
    return (
      <div className="min-h-screen">
        <SiteNav showNewRun />
        <div className="app-shell py-24 text-center">
          <p className="text-[#3f3f46]">Run not found.</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-[#0a0a0a] underline underline-offset-2"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const showProgressHero =
    !selectedPersona &&
    (isRunning || run.status === "failed") &&
    (personas === undefined || personas.length === 0);

  return (
    <div className="min-h-screen">
      <SiteNav showNewRun activeSiteId={run.siteId ?? siteMemory?.site._id} runId={runId} />

      <RunToolbar
        run={run}
        runId={runId}
        isRunning={isRunning}
        statusLabel={statusLabels[run.status] ?? run.status}
        siteMemory={
          siteMemory
            ? {
                domain: siteMemory.site.domain,
                personaCount: siteMemory.personaCount,
                leadCount: siteMemory.leadCount,
              }
            : null
        }
        onExport={run.status === "complete" ? handleExport : undefined}
      />

      <main className="app-shell py-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
          <PersonaSidebar
            personas={personas ?? []}
            selectedId={selectedPersona?._id ?? null}
            onSelect={setSelectedPersonaId}
            loading={personas === undefined}
            runStatus={run.status}
          />
          <div className="min-w-0 flex-1">
            {showProgressHero ? (
              <RunProgress
                status={run.status}
                hostname={hostname}
                variant="hero"
                personaCount={personas?.length ?? 0}
                personasComplete={personasComplete}
              />
            ) : (
              <PersonaDetail
                persona={selectedPersona}
                run={run}
                runStatus={run.status}
              />
            )}
          </div>
          <ClientProfilePanel
            siteId={run.siteId ?? siteMemory?.site._id}
            runUrl={run.url}
            runStatus={run.status}
          />
        </div>

        <div className="mt-8">
          <ContentCalendar
            runId={typedRunId}
            siteId={run.siteId ?? siteMemory?.site._id}
            personas={personas ?? []}
            runStatus={run.status}
            hostname={hostname}
          />
        </div>
      </main>
    </div>
  );
}
