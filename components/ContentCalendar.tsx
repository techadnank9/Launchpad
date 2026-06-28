"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { CalendarView } from "./CalendarView";
import { RunProgress } from "./RunProgress";

type ContentCalendarProps = {
  runId: Id<"runs">;
  siteId?: Id<"sites"> | null;
  personas: Array<{ _id: Id<"personas">; name: string }>;
  runStatus?: Doc<"runs">["status"];
  hostname?: string;
};

const platformLabels: Record<Doc<"posts">["platform"], string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  instagram: "Instagram",
};

type CampaignGroup = {
  personaId: Id<"personas">;
  caption: string;
  posterUrl: string;
  scheduledAt: number;
  posts: Doc<"posts">[];
};

const tabs = ["Calendar", "Campaigns"] as const;
type Tab = (typeof tabs)[number];

export function ContentCalendar({
  runId,
  siteId,
  personas,
  runStatus,
  hostname = "your site",
}: ContentCalendarProps) {
  const [tab, setTab] = useState<Tab>("Calendar");
  const posts = useQuery(api.posts.listByRun, { runId });
  const approveCampaign = useMutation(api.posts.approvePersonaCampaign);
  const [approvedPersonas, setApprovedPersonas] = useState<Set<string>>(
    new Set(),
  );

  const personaMap = Object.fromEntries(personas.map((p) => [p._id, p.name]));

  const campaigns = useMemo(() => {
    if (!posts) return [];
    const byPersona = new Map<string, CampaignGroup>();
    for (const post of posts) {
      const key = post.personaId;
      const existing = byPersona.get(key);
      if (existing) {
        existing.posts.push(post);
      } else {
        byPersona.set(key, {
          personaId: post.personaId,
          caption: post.caption,
          posterUrl: post.posterUrl,
          scheduledAt: post.scheduledAt,
          posts: [post],
        });
      }
    }
    return Array.from(byPersona.values()).sort(
      (a, b) => a.scheduledAt - b.scheduledAt,
    );
  }, [posts]);

  const isEarlyRun =
    runStatus === "pending" ||
    runStatus === "analyzing" ||
    runStatus === "personas_ready";

  if (posts === undefined) {
    return (
      <section className="surface overflow-hidden rounded-xl p-5">
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-[#ecece7]" />
        <div className="h-48 animate-pulse rounded-lg bg-[#ecece7]" />
        <p className="mt-3 text-center text-xs text-[#52525b]">
          Loading schedule…
        </p>
      </section>
    );
  }

  async function handleApprove(personaId: Id<"personas">) {
    await approveCampaign({ personaId });
    setApprovedPersonas((prev) => new Set(prev).add(personaId));
  }

  function isCampaignDone(group: CampaignGroup) {
    if (approvedPersonas.has(group.personaId)) return true;
    return group.posts.every(
      (p) => p.status === "scheduled" || p.status === "posted",
    );
  }

  return (
    <section className="surface overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d4d4cc] px-5 py-4">
        <div>
          <h2 className="text-sm font-medium text-[#0a0a0a]">Schedule</h2>
          <p className="mt-0.5 text-xs text-[#52525b]">
            Posts and outbound meetings across your GTM calendar
          </p>
        </div>
        <div className="flex gap-1 rounded-md bg-[#ecece7] p-0.5">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                tab === t
                  ? "bg-white text-[#0a0a0a] shadow-sm"
                  : "text-[#52525b] hover:text-[#0a0a0a]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {tab === "Calendar" ? (
          isEarlyRun && posts.length === 0 ? (
            <RunProgress
              status={runStatus ?? "analyzing"}
              hostname={hostname}
              variant="compact"
            />
          ) : (
            <CalendarView runId={runId} siteId={siteId} />
          )
        ) : campaigns.length === 0 ? (
          isEarlyRun || runStatus === "processing" ? (
            <div className="rounded-lg border border-[#ecece7] bg-[#fafaf8] px-4 py-6 text-center">
              <p className="text-sm font-medium text-[#0a0a0a]">
                Campaigns are on the way
              </p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#52525b]">
                Each persona gets a branded poster and caption for LinkedIn, X,
                and Instagram once inbound content finishes generating.
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#52525b]">
              Campaigns appear here as each persona&apos;s poster and caption are
              generated.
            </p>
          )
        ) : (
          <div className="divide-y divide-[#ecece7] rounded-lg border border-[#ecece7]">
            {campaigns.map((group) => {
              const done = isCampaignDone(group);
              const platforms = [...group.posts]
                .map((p) => p.platform)
                .sort()
                .map((p) => platformLabels[p]);

              return (
                <article
                  key={group.personaId}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[88px_1fr_auto]"
                >
                  <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-lg border border-[#d4d4cc] bg-[#fafaf8]">
                    {group.posterUrl ? (
                      <Image
                        src={group.posterUrl}
                        alt=""
                        width={88}
                        height={88}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[#a1a1aa]">
                        No poster
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-[#0a0a0a]">
                        {personaMap[group.personaId] ?? "Persona"}
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {platforms.map((label) => (
                          <span
                            key={label}
                            className="rounded-full bg-[#ecece7] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#3f3f46]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-[#18181b]">
                      {group.caption}
                    </p>
                    <p className="text-xs text-[#52525b]">
                      Scheduled{" "}
                      {new Date(group.scheduledAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex items-start lg:justify-end">
                    {done ? (
                      <span className="text-xs font-medium text-emerald-800">
                        Scheduled on all platforms
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApprove(group.personaId)}
                        className="btn-primary whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium"
                      >
                        Approve all platforms
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
