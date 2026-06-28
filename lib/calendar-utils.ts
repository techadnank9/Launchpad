export type CalendarEvent = {
  id: string;
  kind: "post" | "meeting";
  startsAt: number;
  title: string;
  subtitle?: string;
  status: string;
  personaId?: string;
  platform?: string;
  caption?: string;
  posterUrl?: string;
  campaignKey?: string;
  eventLabel?: string;
  type?: string;
  company?: string;
  durationMinutes?: number;
  runId?: string;
};

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildMonthGrid(viewDate: Date): Array<Date | null> {
  const first = startOfMonth(viewDate);
  const startPad = first.getDay();
  const daysInMonth = endOfMonth(viewDate).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((e) => sameDay(new Date(e.startsAt), day))
    .sort((a, b) => a.startsAt - b.startsAt);
}

export type PostCampaignGroup = {
  kind: "post_campaign";
  personaId: string;
  personaName: string;
  heading: string;
  caption?: string;
  posterUrl?: string;
  campaignKey?: string;
  eventLabel?: string;
  platforms: Array<{
    platform: string;
    startsAt: number;
    status: string;
    id: string;
  }>;
  startsAt: number;
  status: string;
};

export type DayDisplayItem =
  | { kind: "meeting"; event: CalendarEvent }
  | PostCampaignGroup;

export function postHeadingFromCaption(caption?: string, maxLen = 72): string {
  if (!caption?.trim()) return "Scheduled post";
  const firstLine = caption.split("\n")[0]?.trim() ?? caption.trim();
  const sentence = firstLine.split(/(?<=[.!?])\s+/)[0]?.trim() ?? firstLine;
  const text = sentence || firstLine;
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trim()}…`;
}

export function groupDayEvents(events: CalendarEvent[]): DayDisplayItem[] {
  const meetings = events.filter((e) => e.kind === "meeting");
  const posts = events.filter((e) => e.kind === "post");

  const byCampaign = new Map<string, CalendarEvent[]>();
  for (const post of posts) {
    const key = `${post.personaId ?? post.id}:${post.campaignKey ?? "evergreen"}`;
    const list = byCampaign.get(key) ?? [];
    list.push(post);
    byCampaign.set(key, list);
  }

  const campaigns: PostCampaignGroup[] = Array.from(byCampaign.values()).map(
    (postList) => {
      const sorted = [...postList].sort((a, b) => a.startsAt - b.startsAt);
      const first = sorted[0];
      return {
        kind: "post_campaign",
        personaId: first.personaId ?? first.id,
        personaName: first.title,
        heading: first.eventLabel ?? postHeadingFromCaption(first.caption),
        caption: first.caption,
        posterUrl: first.posterUrl,
        campaignKey: first.campaignKey,
        eventLabel: first.eventLabel,
        platforms: sorted.map((p) => ({
          platform: p.platform ?? "post",
          startsAt: p.startsAt,
          status: p.status,
          id: p.id,
        })),
        startsAt: sorted[0].startsAt,
        status: sorted.every(
          (p) => p.status === "scheduled" || p.status === "posted",
        )
          ? sorted.some((p) => p.status === "posted")
            ? "posted"
            : "scheduled"
          : "draft",
      };
    },
  );

  return [
    ...meetings.map((event) => ({ kind: "meeting" as const, event })),
    ...campaigns,
  ].sort((a, b) => {
    const aTime = a.kind === "meeting" ? a.event.startsAt : a.startsAt;
    const bTime = b.kind === "meeting" ? b.event.startsAt : b.startsAt;
    return aTime - bTime;
  });
}

export function flattenCalendarData(data: {
  posts: CalendarEvent[];
  meetings: CalendarEvent[];
}): CalendarEvent[] {
  return [...data.posts, ...data.meetings].sort((a, b) => a.startsAt - b.startsAt);
}
