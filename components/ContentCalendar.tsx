"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { CalendarView } from "./CalendarView";
import { RunProgress } from "./RunProgress";
import { PostEditorModal } from "./PostEditorModal";
import { ConnectSocialBanner } from "./ConnectSocialBanner";

type ContentCalendarProps = {
  runId: Id<"runs">;
  siteId?: Id<"sites"> | null;
  personas: Array<{ _id: Id<"personas">; name: string }>;
  runStatus?: Doc<"runs">["status"];
  hostname?: string;
  variant?: "light" | "dark";
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
  variant = "light",
}: ContentCalendarProps) {
  const isDark = variant === "dark";
  const [tab, setTab] = useState<Tab>("Calendar");
  const posts = useQuery(api.posts.listByRun, { runId });
  const approveCampaign = useMutation(api.posts.approvePersonaCampaign);
  const [approvedPersonas, setApprovedPersonas] = useState<Set<string>>(
    new Set(),
  );
  const [editingPostId, setEditingPostId] = useState<Id<"posts"> | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

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
    const result = await approveCampaign({ personaId });
    setPublishNotice(result.message);
    setApprovedPersonas((prev) => new Set(prev).add(personaId));
  }

  function openCampaign(group: CampaignGroup, postId?: Id<"posts">) {
    const target =
      postId ??
      group.posts.find((p) => p.status === "draft")?._id ??
      group.posts[0]!._id;
    setEditingPostId(target);
  }

  function isCampaignDone(group: CampaignGroup) {
    if (approvedPersonas.has(group.personaId)) return true;
    return group.posts.every(
      (p) => p.status === "scheduled" || p.status === "posted",
    );
  }

  const editingCampaign = editingPostId
    ? campaigns.find((group) =>
        group.posts.some((post) => post._id === editingPostId),
      )
    : null;

  const t = {
    surface: isDark
      ? "border-white/10 bg-[#141414] text-white"
      : "border-[#d4d4cc] bg-white text-[#0a0a0a]",
    headerBorder: isDark ? "border-white/10" : "border-[#d4d4cc]",
    heading: isDark ? "text-white" : "text-[#0a0a0a]",
    muted: isDark ? "text-zinc-400" : "text-[#52525b]",
    body: isDark ? "text-zinc-300" : "text-[#18181b]",
    tabTrack: isDark ? "bg-white/10" : "bg-[#ecece7]",
    tabActive: isDark
      ? "bg-white text-black shadow-sm"
      : "bg-white text-[#0a0a0a] shadow-sm",
    tabIdle: isDark
      ? "text-zinc-400 hover:text-white"
      : "text-[#52525b] hover:text-[#0a0a0a]",
    cardBorder: isDark ? "border-white/10 divide-white/10" : "border-[#ecece7] divide-[#ecece7]",
    posterBorder: isDark ? "border-white/15 bg-white/5" : "border-[#d4d4cc] bg-[#fafaf8]",
    chip: isDark
      ? "bg-white/10 text-zinc-300 hover:bg-white/15"
      : "bg-[#ecece7] text-[#3f3f46] hover:bg-[#e4e4dc]",
    chipScheduled: isDark
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    postBtnPrimary: isDark
      ? "bg-white text-black hover:bg-zinc-200"
      : "btn-primary",
    emptyBox: isDark
      ? "border-white/10 bg-white/5"
      : "border-[#ecece7] bg-[#fafaf8]",
    link: isDark
      ? "text-zinc-400 hover:text-white"
      : "text-[#52525b] hover:text-[#0a0a0a]",
    success: isDark ? "text-emerald-400" : "text-emerald-800",
    skeleton: isDark ? "bg-white/10" : "bg-[#ecece7]",
  };

  return (
    <>
      {editingCampaign && editingPostId && (
        <PostEditorModal
          posts={editingCampaign.posts}
          initialPostId={editingPostId}
          personaName={
            personaMap[editingCampaign.personaId] ?? "Persona"
          }
          variant={variant}
          onClose={() => setEditingPostId(null)}
          onPosted={() => {
            setPublishNotice(`Posting to ${platformLabels[
              editingCampaign.posts.find((p) => p._id === editingPostId)!
                .platform
            ]}…`);
            if (
              editingCampaign.posts.every(
                (p) =>
                  p._id === editingPostId ||
                  p.status === "scheduled" ||
                  p.status === "posted",
              )
            ) {
              setApprovedPersonas((prev) =>
                new Set(prev).add(editingCampaign.personaId),
              );
            }
          }}
        />
      )}
    <section className={`surface overflow-hidden rounded-xl border ${t.surface}`}>
      <div className={`flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4 ${t.headerBorder}`}>
        <div>
          <h2 className={`text-sm font-medium ${t.heading}`}>Schedule</h2>
          <p className={`mt-0.5 text-xs ${t.muted}`}>
            Posts and outbound meetings across your GTM calendar
          </p>
        </div>
        <div className={`flex gap-1 rounded-md p-0.5 ${t.tabTrack}`}>
          {tabs.map((tabName) => (
            <button
              key={tabName}
              type="button"
              onClick={() => setTab(tabName)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                tab === tabName ? t.tabActive : t.tabIdle
              }`}
            >
              {tabName}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        <ConnectSocialBanner variant={variant} />
        {publishNotice && (
          <p className={`mb-4 text-xs ${t.success}`}>{publishNotice}</p>
        )}
        {tab === "Calendar" ? (
          isEarlyRun && posts.length === 0 ? (
            <RunProgress
              status={runStatus ?? "analyzing"}
              hostname={hostname}
              variant="compact"
            />
          ) : (
            <CalendarView runId={runId} siteId={siteId} variant={variant} />
          )
        ) : campaigns.length === 0 ? (
          isEarlyRun || runStatus === "processing" ? (
            <div className={`rounded-lg border px-4 py-6 text-center ${t.emptyBox}`}>
              <p className={`text-sm font-medium ${t.heading}`}>
                Campaigns are on the way
              </p>
              <p className={`mx-auto mt-2 max-w-md text-xs leading-relaxed ${t.muted}`}>
                Each persona gets a branded poster and caption for LinkedIn, X,
                and Instagram once inbound content finishes generating.
              </p>
            </div>
          ) : (
            <p className={`text-sm ${t.muted}`}>
              Campaigns appear here as each persona&apos;s poster and caption are
              generated.
            </p>
          )
        ) : (
          <div className={`divide-y rounded-lg border ${t.cardBorder}`}>
            {campaigns.map((group) => {
              const done = isCampaignDone(group);

              return (
                <article
                  key={group.personaId}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[88px_1fr_auto]"
                >
                  <div className={`h-[88px] w-[88px] shrink-0 overflow-hidden rounded-lg border ${t.posterBorder}`}>
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
                      <div className={`flex h-full items-center justify-center text-xs ${t.muted}`}>
                        No poster
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-sm font-medium ${t.heading}`}>
                        {personaMap[group.personaId] ?? "Persona"}
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {group.posts.map((p) => {
                          const label = platformLabels[p.platform];
                          const scheduled =
                            p.status === "scheduled" || p.status === "posted";
                          return (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => openCampaign(group, p._id)}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition ${
                                scheduled ? t.chipScheduled : t.chip
                              }`}
                            >
                              {label}
                              {p.status === "posted"
                                ? " · posted"
                                : p.status === "scheduled"
                                  ? " · queued"
                                  : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed ${t.body}`}>
                      {group.caption}
                    </p>
                    <p className={`text-xs ${t.muted}`}>
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

                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    {done ? (
                      <span className={`text-xs font-medium ${t.success}`}>
                        Scheduled on all platforms
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openCampaign(group)}
                          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${t.postBtnPrimary}`}
                        >
                          Open post
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(group.personaId)}
                          className={`text-xs underline-offset-2 hover:underline ${t.link}`}
                        >
                          Post all platforms
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
    </>
  );
}
