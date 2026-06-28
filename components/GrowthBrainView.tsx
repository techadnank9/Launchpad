"use client";

import { useEffect, useMemo, useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import type { BoardLead } from "@/lib/pipeline-board";
import { GrowthBrainGraph } from "./GrowthBrainGraph";
import { IdealCustomerPanel } from "./IdealCustomerPanel";

type GrowthBrainViewProps = {
  run: Doc<"runs">;
  personas: Doc<"personas">[];
  leads: BoardLead[];
  hostname: string;
  autoSelectFirst?: boolean;
};

function shortPersonaName(name: string, max = 28): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

export function GrowthBrainView({
  run,
  personas,
  leads,
  hostname,
  autoSelectFirst = false,
}: GrowthBrainViewProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  const matchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      counts.set(lead.personaId, (counts.get(lead.personaId) ?? 0) + 1);
    }
    return counts;
  }, [leads]);

  useEffect(() => {
    if (!autoSelectFirst || personas.length === 0) return;
    setSelectedPersonaId((current) => current ?? personas[0]._id);
  }, [autoSelectFirst, personas]);

  return (
    <div className="space-y-4">
      {personas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {personas.map((persona) => {
            const active = selectedPersonaId === persona._id;
            const matched = matchCounts.get(persona._id) ?? 0;
            return (
              <button
                key={persona._id}
                type="button"
                onClick={() =>
                  setSelectedPersonaId(active ? null : persona._id)
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-sky-500/50 bg-sky-500/20 text-sky-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {shortPersonaName(persona.name)}
                <span className="ml-1.5 text-[10px] opacity-70">
                  {matched > 0 ? `${matched} matched` : "inferred"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <GrowthBrainGraph
          run={run}
          personas={personas}
          leads={leads}
          hostname={hostname}
          selectedPersonaId={selectedPersonaId}
          onSelectPersona={setSelectedPersonaId}
        />
        <IdealCustomerPanel
          personas={personas}
          leads={leads}
          selectedPersonaId={selectedPersonaId}
          onSelectPersona={setSelectedPersonaId}
        />
      </div>
    </div>
  );
}
