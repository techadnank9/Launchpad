"use client";

import { useState } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { LeadList } from "./LeadList";
import { EmailSequence } from "./EmailSequence";
import { PosterPreview } from "./PosterPreview";
import { RunProgress, getHostname } from "./RunProgress";

type PersonaDetailProps = {
  persona: Doc<"personas"> | null;
  run: Doc<"runs"> | null;
  runStatus?: Doc<"runs">["status"];
};

const tabs = ["Overview", "Leads", "Outbound", "Inbound"] as const;
type Tab = (typeof tabs)[number];

export function PersonaDetail({ persona, run, runStatus }: PersonaDetailProps) {
  const [tab, setTab] = useState<Tab>("Overview");

  if (!persona) {
    if (run && runStatus && runStatus !== "complete") {
      return (
        <RunProgress
          status={runStatus}
          hostname={getHostname(run.url)}
          variant="hero"
        />
      );
    }
    return (
      <div className="surface flex min-h-[420px] flex-col items-center justify-center rounded-xl px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl text-[#0a0a0a]">
          Select a persona
        </p>
        <p className="mt-2 max-w-sm text-sm text-[#52525b]">
          Choose a buyer segment on the left to view leads, outbound emails, and
          inbound content.
        </p>
      </div>
    );
  }

  return (
    <div className="surface min-h-[420px] rounded-xl">
      <div className="border-b border-[#d4d4cc] px-5 pt-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[#0a0a0a]">
          {persona.name}
        </h2>
        <p className="mt-1 text-sm text-[#3f3f46]">{persona.messagingAngle}</p>
        <div className="mt-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t
                  ? "tab-active"
                  : "text-[#3f3f46] hover:bg-[#ecece7] hover:text-[#0a0a0a]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 text-[#0a0a0a]">
        {tab === "Overview" && (
          <div className="grid gap-6 sm:grid-cols-2">
            <Section title="Pain points">
              <ul className="space-y-1.5">
                {persona.painPoints.map((p) => (
                  <li key={p} className="text-sm text-[#3f3f46]">
                    {p}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Outbound targets">
              <p className="text-sm text-[#3f3f46]">{persona.outboundTargets}</p>
            </Section>
            <Section title="Content tone">
              <p className="text-sm text-[#3f3f46]">{persona.contentTone}</p>
            </Section>
            <Section title="Poster direction">
              <p className="text-sm text-[#3f3f46]">{persona.posterStyle}</p>
            </Section>
          </div>
        )}
        {tab === "Leads" && <LeadList personaId={persona._id} />}
        {tab === "Outbound" && <EmailSequence personaId={persona._id} />}
        {tab === "Inbound" && <PosterPreview persona={persona} run={run} />}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#52525b]">
        {title}
      </h3>
      {children}
    </div>
  );
}
