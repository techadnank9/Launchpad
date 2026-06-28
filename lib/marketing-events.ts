export type MarketingEvent = {
  key: string;
  label: string;
  month: number;
  day: number;
  posterBrief: string;
  captionHook: string;
};

/** Seasonal hooks used for poster + caption generation and calendar labels. */
export const MARKETING_EVENTS: MarketingEvent[] = [
  {
    key: "july-4",
    label: "Independence Day",
    month: 7,
    day: 4,
    posterBrief:
      "Independence Day / 4th of July summer celebration — fireworks, outdoor gatherings, patriotic summer energy woven into the brand look (use brand colors as the dominant palette, not generic red-white-blue unless they are brand colors).",
    captionHook:
      "Tie Independence Day / summer freedom themes to the product value — celebratory, timely, on-brand.",
  },
  {
    key: "prime-day",
    label: "Prime Day",
    month: 7,
    day: 8,
    posterBrief:
      "Prime Day / mid-year deals moment — bold offer energy, shopping carts, savings badges as visual metaphors (no readable text). Brand colors dominate the layout.",
    captionHook:
      "Prime Day / mid-year savings angle — urgency and value without being spammy.",
  },
  {
    key: "mid-summer",
    label: "Mid-summer",
    month: 7,
    day: 15,
    posterBrief:
      "Peak summer — bright sun, vacations, refreshed teams, outdoor productivity. Warm lighting graded in brand colors.",
    captionHook:
      "Mid-summer refresh — help teams or buyers finish the half strong with your product.",
  },
  {
    key: "friendship-day",
    label: "Friendship Day",
    month: 7,
    day: 30,
    posterBrief:
      "Community and connection — teams collaborating, handshakes, shared wins. Inclusive, human, brand-colored environment.",
    captionHook:
      "International Friendship Day — celebrate customers, teams, and partnerships.",
  },
];

export function eventsForMonth(month: number): MarketingEvent[] {
  return MARKETING_EVENTS.filter((event) => event.month === month);
}

/** Events in the calendar month immediately after `from`. */
export function eventsForNextMonth(from: Date = new Date()): MarketingEvent[] {
  const nextMonth = from.getMonth() + 2;
  return eventsForMonth(nextMonth > 12 ? nextMonth - 12 : nextMonth);
}

export function eventLabelForKey(key?: string | null): string | undefined {
  if (!key || key === "evergreen") return undefined;
  return MARKETING_EVENTS.find((event) => event.key === key)?.label ?? key;
}

export function campaignGroupKey(
  personaId: string,
  campaignKey?: string | null,
): string {
  return `${personaId}:${campaignKey ?? "evergreen"}`;
}

export type GroupedPostCampaign<T extends TimelinePost = TimelinePost> = {
  groupKey: string;
  personaId: string;
  campaignKey: string;
  eventLabel?: string;
  caption: string;
  posterUrl: string;
  scheduledAt: number;
  posts: T[];
};

type TimelinePost = {
  _id: string;
  personaId: string;
  campaignKey?: string;
  eventLabel?: string;
  caption: string;
  posterUrl: string;
  scheduledAt: number;
  platform: string;
  status: string;
};

export function groupPostsByCampaign<T extends TimelinePost>(
  posts: T[],
): GroupedPostCampaign<T>[] {
  const byGroup = new Map<string, GroupedPostCampaign<T>>();

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

  return Array.from(byGroup.values())
    .map((group) => ({
      ...group,
      posts: [...group.posts].sort((a, b) => a.scheduledAt - b.scheduledAt),
    }))
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
}

export function countMissingEventCampaigns(
  posts: Array<{ personaId: string; campaignKey?: string }>,
  personaIds: string[],
  from: Date = new Date(),
): number {
  const upcoming = eventsForNextMonth(from);
  let missing = 0;

  for (const personaId of personaIds) {
    for (const event of upcoming) {
      const exists = posts.some(
        (post) =>
          post.personaId === personaId && post.campaignKey === event.key,
      );
      if (!exists) missing += 1;
    }
  }

  return missing;
}
