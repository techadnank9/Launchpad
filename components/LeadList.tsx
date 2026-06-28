"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  PIPELINE_STAGES,
  type PipelineStage,
  defaultPipelineStage,
  stageLabel,
  stageTone,
} from "@/lib/pipeline";

type LeadListProps = {
  personaId: Id<"personas">;
};

export function LeadList({ personaId }: LeadListProps) {
  const leads = useQuery(api.leads.listByPersona, { personaId });
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");

  const stageCounts = useMemo(() => {
    if (!leads) return new Map<PipelineStage, number>();
    const counts = new Map<PipelineStage, number>();
    for (const lead of leads) {
      const stage = defaultPipelineStage(lead.pipelineStage);
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (stageFilter === "all") return leads;
    return leads.filter(
      (lead) =>
        defaultPipelineStage(lead.pipelineStage) === stageFilter,
    );
  }, [leads, stageFilter]);

  if (leads === undefined) {
    return <TableSkeleton rows={4} />;
  }

  if (leads.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#52525b]">
        Waiting on Fiber AI…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StagePill
          active={stageFilter === "all"}
          onClick={() => setStageFilter("all")}
          label="All"
          count={leads.length}
          tone="btn-primary border-[#0a0a0a]"
        />
        {PIPELINE_STAGES.map((stage) => {
          const count = stageCounts.get(stage.id) ?? 0;
          if (count === 0) return null;
          return (
            <StagePill
              key={stage.id}
              active={stageFilter === stage.id}
              onClick={() => setStageFilter(stage.id)}
              label={stage.label}
              count={count}
              tone={stage.tone}
            />
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PIPELINE_STAGES.filter((stage) => (stageCounts.get(stage.id) ?? 0) > 0)
          .slice(0, 4)
          .map((stage) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => setStageFilter(stage.id)}
              className={`rounded-lg border p-3 text-left transition hover:opacity-90 ${
                stageFilter === stage.id ? "ring-2 ring-[#0a0a0a] ring-offset-1" : ""
              } ${stage.tone}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {stage.label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
                {stageCounts.get(stage.id)}
              </p>
            </button>
          ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#d4d4cc] text-xs font-semibold uppercase tracking-wide text-[#52525b]">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2 pr-4">Company</th>
              <th className="pb-2 pr-4">Stage</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">LinkedIn</th>
              <th className="pb-2 pr-4">Signal</th>
              <th className="pb-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const stage =
                defaultPipelineStage(lead.pipelineStage);
              return (
              <tr
                key={lead._id}
                className="border-b border-[#ecece7] last:border-0"
              >
                <td className="py-3 pr-4 font-medium text-[#0a0a0a]">
                  {lead.name}
                </td>
                <td className="py-3 pr-4 text-[#3f3f46]">{lead.title}</td>
                <td className="py-3 pr-4 text-[#3f3f46]">{lead.company}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${stageTone(stage)}`}
                  >
                    {stageLabel(stage)}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-[#0a0a0a] underline underline-offset-2 hover:no-underline"
                    >
                      {lead.email}
                    </a>
                  ) : (
                    <span className="text-[#a1a1aa]">Not available</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {lead.linkedin ? (
                    <a
                      href={lead.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0a0a0a] underline underline-offset-2 hover:no-underline"
                    >
                      Profile
                    </a>
                  ) : (
                    <span className="text-[#a1a1aa]">Not available</span>
                  )}
                </td>
                <td className="max-w-[200px] truncate py-3 pr-4 text-xs text-[#52525b]">
                  {lead.intentSignals[0] ?? "—"}
                </td>
                <td className="py-3 text-right">
                  <span className="font-mono text-sm font-medium tabular-nums text-[#0a0a0a]">
                    {lead.intentScore}
                  </span>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-[#52525b]">
          Fiber AI discovery + Orange Slice scoring · {filteredLeads.length} of{" "}
          {leads.length} leads · stages from intent score
        </p>
      </div>
    </div>
  );
}

function StagePill({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        active ? tone : "border-[#d4d4cc] bg-white text-[#3f3f46] hover:bg-[#ecece7]"
      }`}
    >
      {label}
      <span className="tabular-nums opacity-80">{count}</span>
    </button>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-[#ecece7]" />
      ))}
    </div>
  );
}
