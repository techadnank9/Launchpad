"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  addMonths,
  buildMonthGrid,
  eventsForDay,
  flattenCalendarData,
  formatDayLabel,
  formatMonthYear,
  formatTime,
  groupDayEvents,
  type DayDisplayItem,
  type PostCampaignGroup,
} from "@/lib/calendar-utils";

type CalendarViewProps = {
  runId: Id<"runs">;
  siteId?: Id<"sites"> | null;
  variant?: "light" | "dark";
};

export function CalendarView({ runId, siteId, variant = "light" }: CalendarViewProps) {
  const isDark = variant === "dark";
  const runEvents = useQuery(api.calendar.listByRun, { runId });
  const siteEvents = useQuery(
    api.calendar.listBySite,
    siteId ? { siteId } : "skip",
  );

  const data = siteId && siteEvents ? siteEvents : runEvents;
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const events = useMemo(
    () => (data ? flattenCalendarData(data) : []),
    [data],
  );

  const monthGrid = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const dayItems = useMemo(
    () => groupDayEvents(eventsForDay(events, selectedDay)),
    [events, selectedDay],
  );

  const t = {
    heading: isDark ? "text-white" : "text-[#0a0a0a]",
    muted: isDark ? "text-zinc-400" : "text-[#52525b]",
    body: isDark ? "text-zinc-300" : "text-[#3f3f46]",
    border: isDark ? "border-white/10" : "border-[#d4d4cc]",
    innerBorder: isDark ? "border-white/10" : "border-[#ecece7]",
    panel: isDark ? "bg-[#141414]" : "bg-white",
    panelMuted: isDark ? "bg-white/5" : "bg-[#fafaf8]",
    navBtn: isDark
      ? "border-white/15 text-zinc-300 hover:bg-white/10"
      : "border-[#d4d4cc] hover:bg-[#ecece7]",
    dayNum: isDark ? "text-zinc-300" : "text-[#3f3f46]",
    dayHover: isDark ? "hover:bg-white/5" : "hover:bg-[#fafaf8]",
    daySelected: isDark
      ? "bg-violet-500/15 ring-1 ring-inset ring-violet-400/40"
      : "bg-violet-50 ring-1 ring-inset ring-violet-300",
    row: isDark ? "border-white/10" : "border-[#ecece7]",
  };

  if (data === undefined) {
    return (
      <div className={`h-64 animate-pulse rounded-xl border ${t.border} ${t.panel}`} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewDate((d) => addMonths(d, -1))}
            className={`rounded-md border px-2 py-1 text-sm ${t.navBtn}`}
          >
            ←
          </button>
          <h3 className={`min-w-[160px] text-center font-[family-name:var(--font-display)] text-lg ${t.heading}`}>
            {formatMonthYear(viewDate)}
          </h3>
          <button
            type="button"
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            className={`rounded-md border px-2 py-1 text-sm ${t.navBtn}`}
          >
            →
          </button>
        </div>
        <div className={`flex flex-wrap gap-3 text-xs ${t.muted}`}>
          <Legend dot="bg-violet-500" label="Evergreen posts" />
          <Legend dot="bg-amber-500" label="Event campaigns" />
          <Legend dot="bg-emerald-500" label="Meetings" />
        </div>
      </div>

      <div className={`overflow-hidden rounded-lg border ${t.border} ${t.panel}`}>
        <div className={`grid grid-cols-7 border-b text-center text-[10px] font-semibold uppercase tracking-wide ${t.innerBorder} ${t.panelMuted} ${t.muted}`}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthGrid.map((day, i) => {
            if (!day) {
              return (
                <div
                  key={`empty-${i}`}
                  className={`min-h-[88px] border-b border-r last:border-r-0 ${t.innerBorder} ${t.panelMuted}/50`}
                />
              );
            }

            const grouped = groupDayEvents(eventsForDay(events, day));
            const isSelected = selectedDay.toDateString() === day.toDateString();
            const isToday = new Date().toDateString() === day.toDateString();

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`min-h-[88px] border-b border-r p-1.5 text-left transition last:border-r-0 ${t.innerBorder} ${t.dayHover} ${
                  isSelected ? t.daySelected : ""
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? isDark
                        ? "bg-white text-black"
                        : "badge-dark"
                      : t.dayNum
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {grouped.slice(0, 3).map((item) => (
                    <div
                      key={cellKey(item)}
                      className={`truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight ${
                        item.kind === "meeting"
                          ? "bg-emerald-100 text-emerald-950"
                          : item.eventLabel
                            ? "bg-amber-100 text-amber-950"
                            : "bg-violet-100 text-violet-950"
                      }`}
                    >
                      {item.kind === "meeting"
                        ? "Call"
                        : (item.eventLabel ?? item.heading).slice(0, 22)}
                    </div>
                  ))}
                  {grouped.length > 3 && (
                    <p className={`px-1 text-[9px] ${t.muted}`}>
                      +{grouped.length - 3} more
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${t.border} ${t.panel}`}>
        <h4 className={`text-sm font-medium ${t.heading}`}>
          {formatDayLabel(selectedDay)}
        </h4>
        {dayItems.length === 0 ? (
          <p className={`mt-2 text-sm ${t.muted}`}>Nothing scheduled this day.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dayItems.map((item) =>
              item.kind === "meeting" ? (
                <MeetingRow key={item.event.id} event={item.event} isDark={isDark} />
              ) : (
                <PostCampaignRow key={cellKey(item)} campaign={item} isDark={isDark} />
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function cellKey(item: DayDisplayItem): string {
  return item.kind === "meeting"
    ? item.event.id
    : `${item.personaId}:${item.campaignKey ?? "evergreen"}`;
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function PostCampaignRow({
  campaign,
  isDark,
}: {
  campaign: PostCampaignGroup;
  isDark: boolean;
}) {
  const timeRange =
    campaign.platforms.length === 1
      ? formatTime(campaign.platforms[0].startsAt)
      : `${formatTime(campaign.platforms[0].startsAt)} – ${formatTime(campaign.platforms[campaign.platforms.length - 1].startsAt)}`;

  return (
    <li className={`flex items-start gap-3 rounded-md border px-3 py-2 ${isDark ? "border-white/10" : "border-[#ecece7]"}`}>
      {campaign.posterUrl ? (
        <img
          src={campaign.posterUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span
          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
            campaign.eventLabel ? "bg-amber-500" : "bg-violet-500"
          }`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-medium leading-snug ${isDark ? "text-white" : "text-[#0a0a0a]"}`}>
            {campaign.heading}
          </p>
          {campaign.eventLabel && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${isDark ? "bg-amber-500/15 text-amber-200" : "bg-amber-100 text-amber-900"}`}>
              Event
            </span>
          )}
        </div>
        <p className={`mt-1 text-xs ${isDark ? "text-zinc-400" : "text-[#52525b]"}`}>
          {campaign.personaName} · {timeRange} ·{" "}
          {campaign.platforms.map((p) => p.platform).join(", ")}
        </p>
        {campaign.caption && campaign.caption !== campaign.heading && (
          <p className={`mt-1 line-clamp-2 text-xs ${isDark ? "text-zinc-300" : "text-[#3f3f46]"}`}>
            {campaign.caption}
          </p>
        )}
      </div>
      <span className={`shrink-0 text-[10px] uppercase ${isDark ? "text-zinc-500" : "text-[#a1a1aa]"}`}>
        {campaign.status}
      </span>
    </li>
  );
}

function MeetingRow({
  event,
  isDark,
}: {
  event: {
    id: string;
    title: string;
    type?: string;
    startsAt: number;
    durationMinutes?: number;
    company?: string;
    status: string;
  };
  isDark: boolean;
}) {
  return (
    <li className={`flex items-start gap-3 rounded-md border px-3 py-2 ${isDark ? "border-white/10" : "border-[#ecece7]"}`}>
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-[#0a0a0a]"}`}>{event.title}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-900"}`}>
            {event.type?.replace("_", " ")}
          </span>
        </div>
        <p className={`mt-0.5 text-xs ${isDark ? "text-zinc-400" : "text-[#52525b]"}`}>
          {formatTime(event.startsAt)}
          {event.durationMinutes ? ` · ${event.durationMinutes} min` : ""}
          {event.company ? ` · ${event.company}` : ""}
        </p>
      </div>
      <span className={`shrink-0 text-[10px] uppercase ${isDark ? "text-zinc-500" : "text-[#a1a1aa]"}`}>
        {event.status}
      </span>
    </li>
  );
}
