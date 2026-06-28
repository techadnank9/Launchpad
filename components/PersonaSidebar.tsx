"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";

type PersonaSidebarProps = {
  personas: Doc<"personas">[];
  selectedId: Id<"personas"> | null;
  onSelect: (id: Id<"personas">) => void;
  loading?: boolean;
  runStatus?: Doc<"runs">["status"];
};

const statusLabel: Record<string, string> = {
  pending: "Queued",
  processing: "Running",
  complete: "Done",
  failed: "Failed",
};

const loadingLabels = [
  "Reading site content…",
  "Mapping buyer segments…",
  "Drafting messaging angles…",
];

export function PersonaSidebar({
  personas,
  selectedId,
  onSelect,
  loading,
  runStatus,
}: PersonaSidebarProps) {
  const isEarlyPhase =
    runStatus === "pending" ||
    runStatus === "analyzing" ||
    (runStatus === "personas_ready" && personas.length === 0);

  if (loading || (personas.length === 0 && isEarlyPhase)) {
    return (
      <aside className="w-full shrink-0 lg:w-56">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-[#52525b]">Personas</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-800">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-600" />
            Detecting…
          </span>
        </div>
        <div className="space-y-2">
          {loadingLabels.map((label, i) => (
            <div
              key={label}
              className="rounded-lg border border-[#d4d4cc] bg-white px-3 py-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-[#d4d4cc]"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
                <span className="text-xs text-[#52525b]">{label}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#a1a1aa]">
          Usually 15–30 seconds. Personas appear here first.
        </p>
      </aside>
    );
  }

  if (personas.length === 0) {
    return (
      <aside className="w-full shrink-0 lg:w-56">
        <p className="mb-3 text-xs font-medium text-[#52525b]">Personas</p>
        <div className="rounded-lg border border-dashed border-[#d4d4cc] bg-white px-3 py-4 text-xs text-[#52525b]">
          No personas detected for this site.
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <p className="mb-3 text-xs font-medium text-[#52525b]">
        Personas · {personas.length}
      </p>
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {personas.map((persona) => {
          const active = selectedId === persona._id;
          return (
            <li key={persona._id} className="shrink-0 lg:shrink">
              <button
                onClick={() => onSelect(persona._id)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                  active
                    ? "persona-active"
                    : "surface border-[#d4d4cc] bg-white text-[#0a0a0a] hover:border-[#a1a1aa]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-snug">
                    {persona.name}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-medium ${
                      active ? "text-white/90" : "text-[#52525b]"
                    }`}
                  >
                    {persona.status === "processing" ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-current" />
                        {statusLabel[persona.status]}
                      </span>
                    ) : (
                      statusLabel[persona.status]
                    )}
                  </span>
                </div>
                <p
                  className={`mt-1 line-clamp-2 text-xs leading-relaxed ${
                    active ? "text-white/90" : "text-[#3f3f46]"
                  }`}
                >
                  {persona.status === "processing" && !persona.leadCount
                    ? "Finding leads…"
                    : `${persona.leadCount ?? 0} leads`}
                  {persona.posterUrl ? " · poster" : persona.caption ? " · caption" : ""}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
