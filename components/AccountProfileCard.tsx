"use client";

import Link from "next/link";
import { type BoardLead, formatCurrency, scoreTier } from "@/lib/pipeline-board";
import { stageLabel } from "@/lib/pipeline";

type AccountProfileCardProps = {
  lead: BoardLead;
  brandColors?: string[];
  className?: string;
};

function contactInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function linkedinLabel(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (match?.[1]) return `in/${match[1]}`;
  return url.replace(/^https?:\/\//, "");
}

function locationFromSignals(signals: string[]): string | undefined {
  for (const signal of signals) {
    const cityState = signal.match(
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\b/,
    );
    if (cityState) return `${cityState[1]}, ${cityState[2]}`;

    const cityOnly = signal.match(
      /\b(?:based in|located in|headquarters in|HQ in)\s+([A-Za-z\s]+?)(?:\.|,|$)/i,
    );
    if (cityOnly?.[1]) return cityOnly[1].trim();
  }
  return undefined;
}

function cardGradient(colors?: string[]): string {
  const primary = colors?.[0];
  if (primary && /^#[0-9a-fA-F]{6}$/i.test(primary)) {
    return `linear-gradient(145deg, ${primary}ee 0%, ${primary}88 45%, #0a1218 100%)`;
  }
  return "linear-gradient(145deg, rgba(15,118,110,0.92) 0%, rgba(15,23,42,0.95) 100%)";
}

export function AccountProfileCard({
  lead,
  brandColors,
  className = "",
}: AccountProfileCardProps) {
  const grade = scoreTier(lead.intentScore);
  const signalCount = lead.intentSignals.filter(
    (signal) => !signal.startsWith("Deal estimate:"),
  ).length;
  const location = locationFromSignals(lead.intentSignals);
  const linkedin = linkedinLabel(lead.linkedin);

  const stats = [
    {
      label: "Intent score",
      value: `${lead.intentScore}`,
      hint: grade.label,
      icon: StatIcons.intent,
    },
    {
      label: "Est. deal",
      value: formatCurrency(lead.value),
      hint: lead.pricingModel,
      icon: StatIcons.deal,
    },
    {
      label: "Pipeline",
      value: stageLabel(lead.stage),
      hint: lead.personaName ?? "Account",
      icon: StatIcons.pipeline,
    },
    {
      label: location ? "Location" : "Signals",
      value: location ?? String(signalCount),
      hint: location ? "From Orange Slice" : "Buying signals",
      icon: location ? StatIcons.location : StatIcons.signals,
    },
  ];

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-white/10 shadow-xl ${className}`}
      style={{ background: cardGradient(brandColors) }}
    >
      <div className="px-5 pb-4 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {lead.company}
        </p>

        <div className="mt-4 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white ring-1 ring-white/20">
            {contactInitials(lead.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{lead.name}</p>
            <p className="truncate text-sm text-white/65">{lead.title}</p>
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-white/80">
          {lead.email && (
            <li className="flex items-center gap-2.5">
              <ContactIcon>{StatIcons.mail}</ContactIcon>
              <a
                href={`mailto:${lead.email}`}
                className="truncate hover:text-white"
              >
                {lead.email}
              </a>
            </li>
          )}
          {linkedin && (
            <li className="flex items-center gap-2.5">
              <ContactIcon>{StatIcons.linkedin}</ContactIcon>
              <Link
                href={lead.linkedin!}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-white"
              >
                {linkedin}
              </Link>
            </li>
          )}
          {!lead.email && !linkedin && (
            <li className="text-white/50">Contact details enriching…</li>
          )}
        </ul>
      </div>

      <div className="border-t border-white/10 bg-black/15 px-5 py-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80">
                {stat.icon}
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                  {stat.label}
                </dt>
                <dd className="truncate text-sm font-semibold text-white">
                  {stat.value}
                </dd>
                {stat.hint && (
                  <dd className="truncate text-[11px] text-white/50">{stat.hint}</dd>
                )}
              </div>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

function ContactIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-white/55">
      {children}
    </span>
  );
}

const StatIcons = {
  intent: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M2 12 6 8l3 3 5-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  deal: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M3 5h10v8H3V5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M3 7h10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  pipeline: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M4 4h8v8H4V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M7 7h2v2H7V7Z" fill="currentColor" />
    </svg>
  ),
  location: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M8 2.5c2 0 3.5 1.6 3.5 3.5 0 2.6-3.5 7-3.5 7S4.5 8.6 4.5 6C4.5 4.1 6 2.5 8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8" cy="6" r="1" fill="currentColor" />
    </svg>
  ),
  signals: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M3 4.5h10M3 8h7M3 11.5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M2.5 4.5h11v7h-11v-7Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="m2.5 5.5 5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M3.5 2.5h2v2h-2v-2Zm0 3h2v8h-2v-8Zm3.5 0h2v1.1c.4-.8 1.3-1.2 2.3-1.2 2.2 0 2.6 1.4 2.6 3.3v4.8h-2v-4.3c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2v4.4h-2v-8Z" />
    </svg>
  ),
};
