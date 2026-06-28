"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { type BoardLead, type PipelineColumnId } from "@/lib/pipeline-board";
import { accountFocusUrl } from "@/lib/run-urls";
import { LeadDetailPanel } from "./LeadDetailPanel";

type LeadDrawerProps = {
  lead: BoardLead;
  run: Doc<"runs">;
  runId: Id<"runs">;
  onClose: () => void;
  onMove: (columnId: PipelineColumnId) => Promise<void>;
};

export function LeadDrawer({
  lead,
  run,
  runId,
  onClose,
  onMove,
}: LeadDrawerProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-[#111] shadow-2xl"
        role="dialog"
        aria-label="Lead details"
      >
        <LeadDetailPanel
          lead={lead}
          runId={runId}
          companyName={run.brandCompanyName}
          logoUrl={run.brandLogoUrl}
          brandColor={run.brandColors?.[0]}
          brandColors={run.brandColors ?? []}
          onMove={onMove}
          headerExtra={
            <>
              <a
                href={accountFocusUrl(runId, lead.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                Open in new tab
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </>
          }
        />
      </aside>
    </>
  );
}
