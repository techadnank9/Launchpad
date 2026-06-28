"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import type { BoardLead } from "@/lib/pipeline-board";
import { GrowthBrainView } from "./GrowthBrainView";
import { RunProgress } from "./RunProgress";

type RunOnboardingProps = {
  phase: "checklist" | "brain";
  run: Doc<"runs">;
  hostname: string;
  personas: Doc<"personas">[] | undefined;
  leads: BoardLead[];
  personasComplete: number;
  onEnterWorkspace: () => void;
};

export function RunOnboarding({
  phase,
  run,
  hostname,
  personas,
  leads,
  personasComplete,
  onEnterWorkspace,
}: RunOnboardingProps) {
  if (phase === "checklist") {
    return (
      <div className="mx-auto max-w-2xl">
        <RunProgress
          status={run.status}
          hostname={hostname}
          variant="hero-dark"
          personaCount={personas?.length ?? 0}
          personasComplete={personasComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400">
            Personas mapped
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight text-white">
            Your growth brain is ready
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            We mapped your site to buyer segments and spelled out who your ideal
            customers are — roles, pains, and matched account traits. Pipelines
            keep running in the background.
          </p>
        </div>
        <button
          type="button"
          onClick={onEnterWorkspace}
          className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-100"
        >
          Open GTM workspace
        </button>
      </div>

      <GrowthBrainView
        run={run}
        personas={personas ?? []}
        leads={leads}
        hostname={hostname}
        autoSelectFirst
      />
    </div>
  );
}
