export type MarketingEvent = {
  key: string;
  label: string;
  month: number;
  day: number;
  posterBrief: string;
  captionHook: string;
};

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

export function eventsForNextMonth(from: Date = new Date()): MarketingEvent[] {
  const nextMonth = from.getMonth() + 2;
  return eventsForMonth(nextMonth > 12 ? nextMonth - 12 : nextMonth);
}

const PLATFORM_OFFSET_HOURS = {
  linkedin: 14,
  twitter: 17,
  instagram: 20,
} as const;

export function resolveEventYear(month: number, day: number, from: Date = new Date()): number {
  let year = from.getFullYear();
  const candidate = Date.UTC(year, month - 1, day, 12, 0, 0, 0);
  if (candidate < from.getTime()) {
    year += 1;
  }
  return year;
}

export function eventPostScheduledAt(
  event: MarketingEvent,
  platform: keyof typeof PLATFORM_OFFSET_HOURS,
  from: Date = new Date(),
): number {
  const year = resolveEventYear(event.month, event.day, from);
  const d = new Date(
    Date.UTC(year, event.month - 1, event.day, PLATFORM_OFFSET_HOURS[platform], 0, 0, 0),
  );
  return d.getTime();
}
