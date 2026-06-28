"use client";

import { useCallback, useMemo, useState } from "react";
import {
  MONACO_COLUMNS,
  type BoardLead,
  type MonacoColumnId,
  defaultStageForColumn,
  formatCurrency,
  groupLeadsByColumn,
} from "@/lib/monaco-board";
import { ScoreBadge } from "./ScoreBadge";

type PipelineBoardProps = {
  leads: BoardLead[];
  loading?: boolean;
  onSelectLead: (lead: BoardLead) => void;
  onMoveLead: (leadId: string, columnId: MonacoColumnId) => Promise<void>;
};

export function PipelineBoard({
  leads,
  loading,
  onSelectLead,
  onMoveLead,
}: PipelineBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<MonacoColumnId | null>(null);

  const columns = useMemo(
    () => (leads.length ? groupLeadsByColumn(leads) : null),
    [leads],
  );

  const handleDrop = useCallback(
    async (columnId: MonacoColumnId) => {
      if (!draggingId) return;
      await onMoveLead(draggingId, columnId);
      setDraggingId(null);
      setDropTarget(null);
    },
    [draggingId, onMoveLead],
  );

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[480px] w-[280px] shrink-0 animate-pulse rounded-2xl bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-white">
          Pipeline fills as leads arrive
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
          Fiber AI and Orange Slice score leads per persona — they land in
          Discovery, Nurture, and Proposal automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns!.map((column) => (
        <section
          key={column.id}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTarget(column.id);
          }}
          onDragLeave={() =>
            setDropTarget((current) => (current === column.id ? null : current))
          }
          onDrop={(e) => {
            e.preventDefault();
            void handleDrop(column.id);
          }}
          className={`flex w-[280px] shrink-0 flex-col rounded-2xl border bg-[#141414] transition ${
            dropTarget === column.id
              ? "border-sky-400 ring-2 ring-sky-400/30"
              : "border-white/10"
          }`}
        >
          <header className="border-b border-white/10 px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-lg text-white">
                {column.label}
              </h2>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-500 px-2 text-xs font-semibold text-white">
                {column.count}
              </span>
            </div>
            <p className="mt-1 font-mono text-sm tabular-nums text-zinc-400">
              {formatCurrency(column.total)}
            </p>
          </header>

          <ul className="flex max-h-[520px] flex-col gap-2 overflow-y-auto p-3">
            {column.items.map((lead) => (
              <li key={lead.id}>
                <LeadCard
                  lead={lead}
                  dragging={draggingId === lead.id}
                  onOpen={() => onSelectLead(lead)}
                  onDragStart={() => setDraggingId(lead.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropTarget(null);
                  }}
                />
              </li>
            ))}
            {column.items.length === 0 && (
              <li className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-xs text-zinc-600">
                Drop leads here
              </li>
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

function LeadCard({
  lead,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  lead: BoardLead;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`cursor-grab rounded-xl border border-white/10 bg-[#1c1c1c] p-3 transition hover:border-white/20 hover:bg-[#222] active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <CompanyMark name={lead.company} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">
              {lead.company}
            </p>
            <p className="shrink-0 font-mono text-xs tabular-nums text-zinc-300">
              {formatCurrency(lead.value)}
            </p>
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {lead.name} · {lead.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ScoreBadge intentScore={lead.intentScore} compact />
            {lead.personaName && (
              <span className="truncate text-[10px] uppercase tracking-wide text-zinc-600">
                {lead.personaName}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function CompanyMark({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
      style={{ backgroundColor: `hsl(${hue} 45% 35%)` }}
    >
      {initial}
    </span>
  );
}

// defaultStageForColumn is exported from @/lib/monaco-board
