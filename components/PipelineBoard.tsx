"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { stageLabel } from "@/lib/pipeline";
import {
  MONACO_COLUMNS,
  type BoardLead,
  type MonacoColumnId,
  columnLabel,
  defaultStageForColumn,
  formatCurrency,
  groupLeadsByColumn,
  toBoardLead,
} from "@/lib/monaco-board";

type PipelineBoardProps = {
  runId: Id<"runs">;
};

export function PipelineBoard({ runId }: PipelineBoardProps) {
  const leads = useQuery(api.leads.listByRun, { runId });
  const personas = useQuery(api.personas.listByRun, { runId });
  const updateStage = useMutation(api.leads.updatePipelineStage);

  const [selectedLead, setSelectedLead] = useState<BoardLead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<MonacoColumnId | null>(null);

  const personaNames = useMemo(
    () => Object.fromEntries((personas ?? []).map((p) => [p._id, p.name])),
    [personas],
  );

  const boardLeads = useMemo(() => {
    if (!leads) return [];
    return leads.map((l) => toBoardLead(l, personaNames[l.personaId]));
  }, [leads, personaNames]);

  const columns = useMemo(
    () => (boardLeads.length ? groupLeadsByColumn(boardLeads) : null),
    [boardLeads],
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

  const handleDrop = useCallback(
    async (columnId: MonacoColumnId) => {
      if (!draggingId) return;
      await moveLead(draggingId, columnId);
      setDraggingId(null);
      setDropTarget(null);
      setSelectedLead((current) =>
        current?.id === draggingId
          ? {
              ...current,
              columnId,
              stage: defaultStageForColumn(columnId),
            }
          : current,
      );
    },
    [draggingId, moveLead],
  );

  if (leads === undefined || personas === undefined) {
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
    <>
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
                    onOpen={() => setSelectedLead(lead)}
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

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onMove={async (columnId) => {
            await moveLead(selectedLead.id, columnId);
            setSelectedLead({
              ...selectedLead,
              columnId,
              stage: defaultStageForColumn(columnId),
            });
          }}
        />
      )}
    </>
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
          {lead.personaName && (
            <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
              {lead.personaName}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function LeadDetailModal({
  lead,
  onClose,
  onMove,
}: {
  lead: BoardLead;
  onClose: () => void;
  onMove: (columnId: MonacoColumnId) => Promise<void>;
}) {
  const [moving, setMoving] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#141414] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-start gap-4">
            <CompanyMark name={lead.company} large />
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-display)] text-2xl text-white">
                {lead.company}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {lead.name} · {lead.title}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <DetailItem label="Stage" value={stageLabel(lead.stage)} />
            <DetailItem label="Column" value={columnLabel(lead.columnId)} />
            <DetailItem
              label="Est. value"
              value={formatCurrency(lead.value)}
            />
            <DetailItem label="Intent score" value={String(lead.intentScore)} />
            {lead.personaName && (
              <DetailItem label="Persona" value={lead.personaName} span />
            )}
          </dl>

          {lead.intentSignals.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Intent signals
              </p>
              <ul className="mt-2 space-y-1.5">
                {lead.intentSignals.map((signal) => (
                  <li
                    key={signal}
                    className="rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300"
                  >
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-sky-400 hover:bg-white/5"
              >
                {lead.email}
              </a>
            )}
            {lead.linkedin && (
              <a
                href={lead.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-sky-400 hover:bg-white/5"
              >
                LinkedIn profile
              </a>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Move to column
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MONACO_COLUMNS.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  disabled={moving || lead.columnId === column.id}
                  onClick={async () => {
                    setMoving(true);
                    try {
                      await onMove(column.id);
                    } finally {
                      setMoving(false);
                    }
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-40 ${
                    lead.columnId === column.id
                      ? "border-sky-500 bg-sky-500/20 text-sky-300"
                      : "border-white/15 text-zinc-300 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  {column.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              Or drag the card between columns on the board.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-white">{value}</dd>
    </div>
  );
}

function CompanyMark({ name, large }: { name: string; large?: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg font-semibold text-white ${
        large ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm"
      }`}
      style={{ backgroundColor: `hsl(${hue} 45% 35%)` }}
    >
      {initial}
    </span>
  );
}
