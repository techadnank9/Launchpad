"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import type { BoardLead } from "@/lib/pipeline-board";
import {
  buildIdealCustomerProfiles,
  type IdealCustomerAttribute,
  type IdealCustomerProfile,
  type IdealCustomerSignal,
} from "@/lib/ideal-customers";

type IdealCustomerPanelProps = {
  personas: Doc<"personas">[];
  leads: BoardLead[];
  selectedPersonaId?: string | null;
  onSelectPersona?: (personaId: string | null) => void;
};

export function IdealCustomerPanel({
  personas,
  leads,
  selectedPersonaId = null,
  onSelectPersona,
}: IdealCustomerPanelProps) {
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const profiles = useMemo(
    () => buildIdealCustomerProfiles({ personas, leads }),
    [personas, leads],
  );

  useEffect(() => {
    if (!selectedPersonaId) return;
    const element = cardRefs.current.get(selectedPersonaId);
    element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedPersonaId]);

  return (
    <div className="space-y-6 xl:max-h-[min(560px,72vh)] xl:min-h-[440px] xl:overflow-y-auto xl:pr-1">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Ideal customers
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-white">
          {selectedPersonaId ? "Segment detail" : "Who to reach for growth"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {selectedPersonaId
            ? "Pain points, messaging, and matched account signals for this persona."
            : "Buyer segments inferred from your site — refined when real accounts match in this run."}
        </p>
      </div>

      <div className="space-y-4">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.personaId}
            profile={profile}
            selected={selectedPersonaId === profile.personaId}
            dimmed={Boolean(
              selectedPersonaId && selectedPersonaId !== profile.personaId,
            )}
            onSelect={() =>
              onSelectPersona?.(
                selectedPersonaId === profile.personaId
                  ? null
                  : profile.personaId,
              )
            }
            setCardRef={(element) => {
              if (element) cardRefs.current.set(profile.personaId, element);
              else cardRefs.current.delete(profile.personaId);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ProfileCard({
  profile,
  selected,
  dimmed,
  onSelect,
  setCardRef,
}: {
  profile: IdealCustomerProfile;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
  setCardRef: (element: HTMLElement | null) => void;
}) {
  const personaAttrs = profile.attributes.filter((a) => a.source === "persona");
  const matchedAttrs = profile.attributes.filter((a) => a.source !== "persona");

  return (
    <article
      ref={setCardRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-2xl border p-5 transition ${
        selected
          ? "border-sky-500/40 bg-sky-500/[0.08] ring-1 ring-sky-500/20"
          : dimmed
            ? "border-white/5 bg-[#101010] opacity-45 hover:opacity-70"
            : "border-white/10 bg-[#141414] hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-white">{profile.personaName}</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {profile.headline}
          </p>
        </div>
        {profile.matchedLeads > 0 ? (
          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
            {profile.matchedLeads} matched
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            inferred
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {personaAttrs.map((attr) => (
          <AttributeRow key={`${attr.label}:${attr.value}`} attribute={attr} />
        ))}
      </div>

      {matchedAttrs.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Observed in matched accounts
          </p>
          <div className="mt-3 space-y-2">
            {matchedAttrs.map((attr) => (
              <AttributeRow key={`${attr.label}:${attr.value}`} attribute={attr} />
            ))}
          </div>
        </div>
      )}

      {(profile.exampleCompanies.length > 0 || profile.exampleTitles.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.exampleCompanies.map((company) => (
            <span
              key={company}
              className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100"
            >
              {company}
            </span>
          ))}
        </div>
      )}

      {profile.signals.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Signals
          </p>
          <ul className="mt-3 space-y-2">
            {profile.signals.map((signal) => (
              <SignalRow key={`${signal.headline}:${signal.detail}`} signal={signal} />
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function SignalRow({ signal }: { signal: IdealCustomerSignal }) {
  return (
    <li className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-sm font-medium leading-snug text-zinc-100">
        {signal.headline}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-500">{signal.detail}</p>
    </li>
  );
}

function AttributeRow({ attribute }: { attribute: IdealCustomerAttribute }) {
  return (
    <div className="grid grid-cols-[112px_1fr] gap-3 text-sm">
      <p className="text-zinc-500">{attribute.label}</p>
      <p className="text-zinc-200">{attribute.value}</p>
    </div>
  );
}
