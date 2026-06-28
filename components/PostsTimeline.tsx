"use client";

import { useMemo } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { BrandedPoster } from "./BrandedPoster";
import {
  eventLabelForKey,
  groupPostsByCampaign,
} from "@/lib/marketing-events";
import { formatTime } from "@/lib/calendar-utils";

type PostsTimelineProps = {
  posts: Doc<"posts">[];
  personaMap: Record<string, string>;
  brandColors?: string[];
  companyName?: string;
  logoUrl?: string;
  variant?: "light" | "dark";
  onSelectPost: (postId: Id<"posts">) => void;
};

const platformLabels: Record<Doc<"posts">["platform"], string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  instagram: "Instagram",
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimelineDay(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, tomorrow)) return "Tomorrow";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function campaignStatus(posts: Doc<"posts">[]): string {
  if (posts.every((post) => post.status === "posted")) return "posted";
  if (
    posts.every(
      (post) => post.status === "scheduled" || post.status === "posted",
    )
  ) {
    return "scheduled";
  }
  return "draft";
}

export function PostsTimeline({
  posts,
  personaMap,
  brandColors = [],
  companyName,
  logoUrl,
  variant = "light",
  onSelectPost,
}: PostsTimelineProps) {
  const isDark = variant === "dark";

  const campaigns = useMemo(() => groupPostsByCampaign(posts), [posts]);

  const dayGroups = useMemo(() => {
    const groups: Array<{
      date: Date;
      campaigns: ReturnType<typeof groupPostsByCampaign<Doc<"posts">>>;
    }> = [];

    for (const campaign of campaigns) {
      const date = new Date(campaign.scheduledAt);
      const last = groups[groups.length - 1];
      if (last && sameDay(last.date, date)) {
        last.campaigns.push(campaign);
      } else {
        groups.push({ date, campaigns: [campaign] });
      }
    }

    return groups;
  }, [campaigns]);

  const t = {
    heading: isDark ? "text-white" : "text-[#0a0a0a]",
    muted: isDark ? "text-zinc-400" : "text-[#52525b]",
    body: isDark ? "text-zinc-300" : "text-[#3f3f46]",
    border: isDark ? "border-white/10" : "border-[#ecece7]",
    row: isDark ? "border-white/10 bg-white/[0.02]" : "border-[#ecece7] bg-[#fafaf8]",
    rowHover: isDark ? "hover:bg-white/5" : "hover:bg-white",
    posterBorder: isDark ? "border-white/15 bg-white/5" : "border-[#d4d4cc] bg-white",
    eventBadge: isDark
      ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30"
      : "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
    evergreenBadge: isDark
      ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30"
      : "bg-violet-50 text-violet-900 ring-1 ring-violet-200",
    platformChip: isDark
      ? "bg-white/10 text-zinc-300"
      : "bg-[#ecece7] text-[#3f3f46]",
    scheduled: isDark ? "text-emerald-400" : "text-emerald-700",
    draft: isDark ? "text-zinc-500" : "text-[#a1a1aa]",
    rail: isDark ? "bg-white/10" : "bg-[#d4d4cc]",
    dot: isDark ? "bg-violet-400" : "bg-violet-500",
  };

  if (campaigns.length === 0) {
    return (
      <p className={`text-sm ${t.muted}`}>
        Posts will appear here as campaigns are generated and scheduled.
      </p>
    );
  }

  return (
    <div className="relative">
      <div className={`absolute bottom-2 left-[7px] top-2 w-px ${t.rail}`} aria-hidden />

      <div className="space-y-8">
        {dayGroups.map((group) => (
          <section key={group.date.toISOString()}>
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`relative z-10 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ${t.dot} ${
                  isDark ? "ring-[#141414]" : "ring-white"
                }`}
              />
              <h3 className={`text-sm font-medium ${t.heading}`}>
                {formatTimelineDay(group.date)}
              </h3>
              <span className={`text-xs ${t.muted}`}>
                {group.campaigns.length} campaign
                {group.campaigns.length === 1 ? "" : "s"}
              </span>
            </div>

            <ul className="ml-6 space-y-2">
              {group.campaigns.map((campaign) => {
                const eventLabel =
                  campaign.eventLabel ??
                  eventLabelForKey(campaign.campaignKey);
                const isEvent = campaign.campaignKey !== "evergreen";
                const status = campaignStatus(campaign.posts);
                const firstPost = campaign.posts[0]!;
                const lastPost = campaign.posts[campaign.posts.length - 1]!;
                const timeRange =
                  campaign.posts.length === 1
                    ? formatTime(firstPost.scheduledAt)
                    : `${formatTime(firstPost.scheduledAt)} – ${formatTime(lastPost.scheduledAt)}`;

                return (
                  <li key={campaign.groupKey}>
                    <button
                      type="button"
                      onClick={() => onSelectPost(firstPost._id)}
                      className={`grid w-full gap-3 rounded-lg border px-3 py-3 text-left transition sm:grid-cols-[56px_1fr_auto] ${t.border} ${t.row} ${t.rowHover}`}
                    >
                      <BrandedPoster
                        posterUrl={campaign.posterUrl}
                        companyName={companyName}
                        logoUrl={logoUrl}
                        brandColor={brandColors[0]}
                        className={`h-14 w-14 shrink-0 rounded-md border ${t.posterBorder}`}
                        imageClassName="h-full w-full object-cover"
                        width={56}
                        height={56}
                      />

                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-medium ${t.heading}`}>
                            {personaMap[campaign.personaId] ?? "Persona"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                              isEvent ? t.eventBadge : t.evergreenBadge
                            }`}
                          >
                            {eventLabel ?? "Evergreen"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {campaign.posts.map((post) => (
                            <span
                              key={post._id}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${t.platformChip}`}
                            >
                              {platformLabels[post.platform]}
                            </span>
                          ))}
                        </div>
                        <p className={`line-clamp-2 text-sm leading-relaxed ${t.body}`}>
                          {campaign.caption}
                        </p>
                        {brandColors.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {brandColors.slice(0, 4).map((color) => (
                              <span
                                key={color}
                                title={color}
                                className="h-3 w-3 rounded-full ring-1 ring-black/10"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            <span className={`text-[10px] ${t.muted}`}>
                              Brand palette
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-start gap-1 sm:items-end">
                        <span className={`text-xs tabular-nums ${t.muted}`}>
                          {timeRange}
                        </span>
                        <span
                          className={`text-[10px] font-medium uppercase ${
                            status === "scheduled" || status === "posted"
                              ? t.scheduled
                              : t.draft
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
