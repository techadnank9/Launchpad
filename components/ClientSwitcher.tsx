"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";

const STORAGE_KEY = "launchpad:activeSiteId";

type ClientSwitcherProps = {
  activeSiteId?: Id<"sites"> | null;
  compact?: boolean;
};

export function ClientSwitcher({ activeSiteId, compact }: ClientSwitcherProps) {
  const router = useRouter();
  const sites = useQuery(api.sites.listSites);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSiteId) return;
    localStorage.setItem(STORAGE_KEY, activeSiteId);
  }, [activeSiteId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const activeSite =
    sites?.find((s) => s.siteId === activeSiteId) ?? sites?.[0] ?? null;

  function handleSelect(siteId: Id<"sites">, latestRunId: Id<"runs"> | null) {
    localStorage.setItem(STORAGE_KEY, siteId);
    setOpen(false);
    if (latestRunId) {
      router.push(`/run/${latestRunId}`);
    }
  }

  if (sites === undefined) {
    return (
      <div className="h-9 w-32 animate-pulse rounded-md bg-[#ecece7]" />
    );
  }

  if (sites.length === 0) {
    return null;
  }

  const label =
    activeSite?.brandCompanyName ?? activeSite?.domain ?? "Select client";

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-md border border-[#d4d4cc] bg-white text-left hover:bg-[#ecece7] ${
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-1.5 text-sm"
        }`}
      >
        <ClientAvatar name={label} colors={[]} />
        <span className="max-w-[120px] truncate font-medium text-[#0a0a0a]">
          {label}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-[#d4d4cc] bg-white shadow-lg">
          <div className="border-b border-[#ecece7] px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#52525b]">
              Clients
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {sites.map((site) => {
              const selected = site.siteId === (activeSiteId ?? activeSite?.siteId);
              return (
                <li key={site.siteId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(site.siteId, site.latestRunId)}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-[#fafaf8] ${
                      selected ? "bg-violet-50" : ""
                    }`}
                  >
                    <ClientAvatar
                      name={site.brandCompanyName ?? site.domain}
                      colors={[]}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0a0a0a]">
                        {site.brandCompanyName ?? site.domain}
                      </p>
                      <p className="truncate text-xs text-[#52525b]">
                        {site.domain}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#a1a1aa]">
                        {site.personaCount} personas · {site.leadCount} leads
                      </p>
                    </div>
                    {selected && (
                      <span className="mt-1 text-[10px] font-medium text-violet-700">
                        Active
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ClientProfilePanel({
  siteId,
  runUrl,
  runStatus,
}: {
  siteId?: Id<"sites"> | null;
  runUrl?: string;
  runStatus?: Doc<"runs">["status"];
}) {
  const siteData = useQuery(
    api.sites.getSite,
    siteId ? { siteId } : "skip",
  );

  const isAnalyzing =
    runStatus === "pending" ||
    runStatus === "analyzing" ||
    runStatus === "personas_ready";

  if (!siteId) {
    const fallbackName = runUrl
      ? runUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
      : "Client";

    return (
      <aside className="surface hidden w-56 shrink-0 rounded-xl p-4 xl:block">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#52525b]">
          Client
        </p>
        <div className="mt-3 flex items-center gap-2">
          <ClientAvatar name={fallbackName} colors={[]} large />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#0a0a0a]">
              {fallbackName}
            </p>
            <p className="text-xs text-violet-800">
              {isAnalyzing ? "Analyzing site…" : "Setting up…"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-[#52525b]">
          Brand kit, persona counts, and lead memory appear here once site
          analysis completes.
        </p>
      </aside>
    );
  }

  if (siteData === undefined) {
    return (
      <aside className="surface hidden w-56 shrink-0 rounded-xl p-4 xl:block">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#52525b]">
          Client
        </p>
        <div className="mt-3 space-y-2">
          <div className="h-10 animate-pulse rounded bg-[#ecece7]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#ecece7]" />
        </div>
        <p className="mt-4 text-[11px] text-[#52525b]">Loading client profile…</p>
      </aside>
    );
  }

  if (!siteData) return null;

  const { site, personaCount, leadCount } = siteData;
  const name = site.brandCompanyName ?? site.domain;

  return (
    <aside className="surface hidden w-56 shrink-0 rounded-xl p-4 xl:block">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#52525b]">
        Client
      </p>
      <div className="mt-3 flex items-center gap-2">
        <ClientAvatar name={name} colors={site.brandColors ?? []} large />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#0a0a0a]">{name}</p>
          <p className="truncate text-xs text-[#52525b]">{site.domain}</p>
        </div>
      </div>

      {site.brandTagline ? (
        <p className="mt-3 text-xs leading-relaxed text-[#3f3f46]">
          {site.brandTagline}
        </p>
      ) : isAnalyzing ? (
        <p className="mt-3 text-xs leading-relaxed text-[#52525b]">
          Extracting tagline and brand colors…
        </p>
      ) : null}

      {site.brandColors && site.brandColors.length > 0 && (
        <div className="mt-3 flex gap-1">
          {site.brandColors.slice(0, 4).map((color) => (
            <span
              key={color}
              className="h-4 w-4 rounded-full border border-[#d4d4cc]"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      <dl className="mt-4 space-y-2 border-t border-[#ecece7] pt-4 text-xs">
        <div className="flex justify-between">
          <dt className="text-[#52525b]">Personas</dt>
          <dd className="font-medium tabular-nums text-[#0a0a0a]">{personaCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#52525b]">Leads</dt>
          <dd className="font-medium tabular-nums text-[#0a0a0a]">{leadCount}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-[#ecece7] pt-4">
        <ClientSwitcher activeSiteId={siteId} compact />
      </div>
    </aside>
  );
}

function ClientAvatar({
  name,
  colors,
  large,
}: {
  name: string;
  colors: string[];
  large?: boolean;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const bg = colors[0] ?? "#ecece7";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-[#d4d4cc] font-semibold text-[#0a0a0a] ${
        large ? "h-10 w-10 text-sm" : "h-7 w-7 text-xs"
      }`}
      style={{ backgroundColor: bg }}
    >
      {initial}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-[#52525b] transition ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}
