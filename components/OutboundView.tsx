"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { SEQUENCE_EXPLAINER } from "@/lib/email-sequence";
import { EmailSequence } from "./EmailSequence";

type OutboundViewProps = {
  runId: Id<"runs">;
  personas: Doc<"personas">[];
  personaFilter: Id<"personas"> | "all";
  runStatus?: Doc<"runs">["status"];
  onNotice?: (message: string) => void;
};

export function OutboundView({
  runId,
  personas,
  personaFilter,
  runStatus,
  onNotice,
}: OutboundViewProps) {
  const regenerateEmailSequences = useMutation(api.runs.regenerateEmailSequences);

  const visible =
    personaFilter === "all"
      ? personas
      : personas.filter((persona) => persona._id === personaFilter);

  const isGenerating =
    runStatus === "pending" ||
    runStatus === "analyzing" ||
    runStatus === "personas_ready" ||
    runStatus === "processing";

  if (personas.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-white">
          Outbound sequences arrive with personas
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
          Each buyer segment gets a 3-step drip template — send the opener per
          lead; follow-ups run on the timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="max-w-2xl text-sm text-zinc-400">{SEQUENCE_EXPLAINER}</p>
        <button
          type="button"
          onClick={() =>
            void regenerateEmailSequences({ runId }).then((result) =>
              onNotice?.(result.message),
            )
          }
          className="shrink-0 text-xs font-medium text-white underline-offset-2 hover:underline"
        >
          Rewrite all sequences
        </button>
      </div>

      {visible.map((persona) => (
        <section
          key={persona._id}
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]"
        >
          <header className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm font-medium text-white">{persona.name}</h2>
            <p className="mt-1 text-xs text-zinc-500">{persona.messagingAngle}</p>
          </header>
          <div className="p-5">
            <EmailSequence personaId={persona._id} variant="dark" />
          </div>
        </section>
      ))}

      {visible.length === 0 && (
        <p className="text-sm text-zinc-500">No persona selected.</p>
      )}

      {isGenerating && visible.length > 0 && (
        <p className="text-xs text-zinc-500">
          Sequences generate after leads are scored for each persona — refresh
          in a moment if one still says “Writing…”
        </p>
      )}
    </div>
  );
}
