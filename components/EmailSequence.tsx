"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

type EmailSequenceProps = {
  personaId: Id<"personas">;
};

export function EmailSequence({ personaId }: EmailSequenceProps) {
  const email = useQuery(api.emails.getByPersona, { personaId });
  const approveAndSend = useMutation(api.emails.approveAndSend);
  const [sent, setSent] = useState(false);

  if (email === undefined) {
    return <div className="h-24 animate-pulse rounded bg-[#ecece7]" />;
  }

  if (!email) {
    return (
      <p className="py-8 text-center text-sm text-[#52525b]">
        Writing email sequence…
      </p>
    );
  }

  async function handleApprove() {
    await approveAndSend({ emailId: email!._id });
    setSent(true);
  }

  const queued = sent || email.sent;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#d4d4cc] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#52525b]">
            Subject line
          </p>
          <p className="mt-0.5 text-sm font-medium text-[#0a0a0a]">{email.subject}</p>
        </div>
        {queued ? (
          <span className="text-sm font-medium text-emerald-800">Queued</span>
        ) : (
          <button
            onClick={handleApprove}
            className="btn-primary rounded-md px-4 py-2 text-sm font-medium"
          >
            Approve & send
          </button>
        )}
      </div>
      <ol className="space-y-4">
        {email.touches.map((touch) => (
          <li key={touch.step}>
            <p className="mb-1.5 font-mono text-xs font-medium text-[#52525b]">
              Touch {touch.step}
            </p>
            <div className="rounded-lg border border-[#d4d4cc] bg-[#fafaf8] p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#18181b]">
                {touch.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
