"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { campaignGroupKey, countMissingEventCampaigns } from "@/lib/marketing-events";
import { CalendarView } from "./CalendarView";
import { RunProgress } from "./RunProgress";
import { PostEditorModal } from "./PostEditorModal";
import { ConnectSocialBanner } from "./ConnectSocialBanner";
import { BrandedPoster } from "./BrandedPoster";
import { PostsTimeline } from "./PostsTimeline";

type ContentCalendarProps = {
  runId: Id<"runs">;
  siteId?: Id<"sites"> | null;
  personas: Array<{ _id: Id<"personas">; name: string }>;
  runStatus?: Doc<"runs">["status"];
  hostname?: string;
  brandColors?: string[];
  brandCompanyName?: string;
  brandLogoUrl?: string;
  variant?: "light" | "dark";
};

const platformLabels: Record<Doc<"posts">["platform"], string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  instagram: "Instagram",
};

type CampaignGroup = {
  groupKey: string;
  personaId: Id<"personas">;
  campaignKey: string;
  eventLabel?: string;
  caption: string;
  posterUrl: string;
  scheduledAt: number;
  posts: Doc<"posts">[];
};

const tabs = ["Calendar", "Timeline", "Campaigns"] as const;
type Tab = (typeof tabs)[number];

export function ContentCalendar({
  runId,
  siteId,
  personas,
  runStatus,
  hostname = "your site",
  brandColors = [],
  brandCompanyName,
  brandLogoUrl,
  variant = "light",
}: ContentCalendarProps) {
  const isDark = variant === "dark";
  const [tab, setTab] = useState<Tab>("Timeline");
  const posts = useQuery(api.posts.listByRun, { runId });
  const approveCampaignGroup = useMutation(api.posts.approveCampaignGroup);
  const generateEventCampaigns = useMutation(api.posts.generateUpcomingEventCampaigns);
  const refreshBrandColors = useMutation(api.runs.refreshBrandColors);
  const regeneratePosters = useMutation(api.runs.regeneratePosters);
  const [approvedGroups, setApprovedGroups] = useState<Set<string>>(new Set());
  const [editingPostId, setEditingPostId] = useState<Id<"posts"> | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  const campaigns = useMemo(() => {
    if (!posts) return [];
    const byGroup = new Map<string, CampaignGroup>();
    for (const post of posts) {
      const campaignKey = post.campaignKey ?? "evergreen";
      const groupKey = campaignGroupKey(post.personaId, campaignKey);
      const existing = byGroup.get(groupKey);
      if (existing) {
        existing.posts.push(post);
        existing.scheduledAt = Math.min(existing.scheduledAt, post.scheduledAt);
      } else {
        byGroup.set(groupKey, {
          groupKey,
          personaId: post.personaId,
          campaignKey,
          eventLabel: post.eventLabel,
          caption: post.caption,
          posterUrl: post.posterUrl,
          scheduledAt: post.scheduledAt,
          posts: [post],
        });
      }
    }
    return Array.from(byGroup.values()).sort(
      (a, b) => a.scheduledAt - b.scheduledAt,
    );
  }, [posts]);

  const personaMap = Object.fromEntries(personas.map((p) => [p._id, p.name]));
  const missingEventCampaigns = countMissingEventCampaigns(
    posts ?? [],
    personas.map((persona) => persona._id),
  );
  const canGenerateEvents =
    missingEventCampaigns > 0 &&
    (posts?.length ?? 0) > 0 &&
    runStatus === "complete";

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

  async function handleApprove(group: CampaignGroup) {
    const result = await approveCampaignGroup({
      personaId: group.personaId,
      campaignKey: group.campaignKey,
    });
    setPublishNotice(result.message);
    setApprovedGroups((prev) => new Set(prev).add(group.groupKey));
  }

  function openCampaign(group: CampaignGroup, postId?: Id<"posts">) {
    const target =
      postId ??
      group.posts.find((p) => p.status === "draft")?._id ??
      group.posts[0]!._id;
    setEditingPostId(target);
  }

  function isCampaignDone(group: CampaignGroup) {
    if (approvedGroups.has(group.groupKey)) return true;
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
    eventBadge: isDark
      ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30"
      : "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
    evergreenBadge: isDark
      ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30"
      : "bg-violet-50 text-violet-900 ring-1 ring-violet-200",
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
  };

  return (
    <>
      {editingCampaign && editingPostId && (
        <PostEditorModal
          posts={editingCampaign.posts}
          initialPostId={editingPostId}
          personaName={personaMap[editingCampaign.personaId] ?? "Persona"}
          companyName={brandCompanyName}
          logoUrl={brandLogoUrl}
          brandColor={brandColors[0]}
          variant={variant}
          onClose={() => setEditingPostId(null)}
          onPosted={() => {
            setPublishNotice(
              `Posting to ${platformLabels[
                editingCampaign.posts.find((p) => p._id === editingPostId)!
                  .platform
              ]}…`,
            );
            if (
              editingCampaign.posts.every(
                (p) =>
                  p._id === editingPostId ||
                  p.status === "scheduled" ||
                  p.status === "posted",
              )
            ) {
              setApprovedGroups((prev) =>
                new Set(prev).add(editingCampaign.groupKey),
              );
            }
          }}
        />
      )}
      <section className={`surface overflow-hidden rounded-xl border ${t.surface}`}>
        <div
          className={`flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4 ${t.headerBorder}`}
        >
          <div>
            <h2 className={`text-sm font-medium ${t.heading}`}>Schedule</h2>
            <p className={`mt-0.5 text-xs ${t.muted}`}>
              Brand-colored campaigns, July events, and your full post timeline
            </p>
            {brandColors.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {brandColors.slice(0, 5).map((color) => (
                    <span
                      key={color}
                      title={color}
                      className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className={`text-[10px] ${t.muted}`}>
                  From site CSS (not GPT guess)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void refreshBrandColors({ runId }).then((result) =>
                      setPublishNotice(result.message),
                    )
                  }
                  className={`text-[10px] underline-offset-2 hover:underline ${t.link}`}
                >
                  Re-scan from site
                </button>
                {(posts?.length ?? 0) > 0 && brandCompanyName && (
                  <button
                    type="button"
                    onClick={() =>
                      void regeneratePosters({ runId }).then((result) =>
                        setPublishNotice(result.message),
                      )
                    }
                    className={`text-[10px] underline-offset-2 hover:underline ${t.link}`}
                  >
                    Regenerate posters
                  </button>
                )}
              </div>
            )}
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
          {canGenerateEvents && (
            <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${t.emptyBox}`}>
              <p className={`text-xs leading-relaxed ${t.muted}`}>
                {missingEventCampaigns} July event campaign
                {missingEventCampaigns === 1 ? "" : "s"} still to generate
                (4th of July, Prime Day, mid-summer, Friendship Day) — one poster
                per event, posted to all platforms.
              </p>
              <button
                type="button"
                onClick={() =>
                  void generateEventCampaigns({ runId }).then((result) =>
                    setPublishNotice(result.message),
                  )
                }
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${t.postBtnPrimary}`}
              >
                Generate {missingEventCampaigns} event
                {missingEventCampaigns === 1 ? "" : "s"}
              </button>
            </div>
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
          ) : tab === "Timeline" ? (
            posts.length === 0 ? (
              isEarlyRun || runStatus === "processing" ? (
                <div className={`rounded-lg border px-4 py-6 text-center ${t.emptyBox}`}>
                  <p className={`text-sm font-medium ${t.heading}`}>
                    Building your post timeline
                  </p>
                  <p className={`mx-auto mt-2 max-w-md text-xs leading-relaxed ${t.muted}`}>
                    Evergreen campaigns plus July event posters (4th of July, Prime
                    Day, mid-summer, Friendship Day) will appear here as they generate.
                  </p>
                </div>
              ) : (
                <p className={`text-sm ${t.muted}`}>No posts scheduled yet.</p>
              )
            ) : (
              <PostsTimeline
                posts={posts}
                personaMap={personaMap}
                brandColors={brandColors}
                companyName={brandCompanyName}
                logoUrl={brandLogoUrl}
                variant={variant}
                onSelectPost={(postId) => setEditingPostId(postId)}
              />
            )
          ) : campaigns.length === 0 ? (
            isEarlyRun || runStatus === "processing" ? (
              <div className={`rounded-lg border px-4 py-6 text-center ${t.emptyBox}`}>
                <p className={`text-sm font-medium ${t.heading}`}>
                  Campaigns are on the way
                </p>
                <p className={`mx-auto mt-2 max-w-md text-xs leading-relaxed ${t.muted}`}>
                  Each persona gets brand-colored evergreen posts plus July event
                  campaigns scheduled across LinkedIn, X, and Instagram.
                </p>
              </div>
            ) : (
              <p className={`text-sm ${t.muted}`}>
                Campaigns appear here as each persona&apos;s posters are generated.
              </p>
            )
          ) : (
            <div className={`divide-y rounded-lg border ${t.cardBorder}`}>
              {campaigns.map((group) => {
                const done = isCampaignDone(group);
                const isEvent = group.campaignKey !== "evergreen";

                return (
                  <article
                    key={group.groupKey}
                    className="grid gap-4 px-5 py-4 lg:grid-cols-[88px_1fr_auto]"
                  >
                    <div
                      className={`relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-lg border ${t.posterBorder}`}
                    >
                      {group.posterUrl ? (
                        <BrandedPoster
                          posterUrl={group.posterUrl}
                          companyName={brandCompanyName}
                          logoUrl={brandLogoUrl}
                          brandColor={brandColors[0]}
                          className="h-full w-full"
                          imageClassName="h-full w-full object-cover"
                          width={88}
                          height={88}
                        />
                      ) : (
                        <div
                          className={`flex h-full items-center justify-center text-xs ${t.muted}`}
                        >
                          No poster
                        </div>
                      )}
                      {brandColors.length > 0 && (
                        <div className="absolute bottom-1 left-1 flex gap-0.5">
                          {brandColors.slice(0, 3).map((color) => (
                            <span
                              key={color}
                              className="h-2 w-2 rounded-full ring-1 ring-black/20"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-sm font-medium ${t.heading}`}>
                          {personaMap[group.personaId] ?? "Persona"}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                            isEvent ? t.eventBadge : t.evergreenBadge
                          }`}
                        >
                          {group.eventLabel ?? (isEvent ? group.campaignKey : "Evergreen")}
                        </span>
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
                            onClick={() => void handleApprove(group)}
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
