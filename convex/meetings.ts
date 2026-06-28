import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const MEETING_HOUR_UTC = 15; // 10am ET

function meetingStart(daysFromNow: number): number {
  const d = new Date(Date.now() + daysFromNow * DAY_MS);
  d.setUTCHours(MEETING_HOUR_UTC, 0, 0, 0);
  return d.getTime();
}

export const scheduleForPersona = internalMutation({
  args: {
    runId: v.id("runs"),
    siteId: v.optional(v.id("sites")),
    personaId: v.id("personas"),
    personaIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_persona", (q) => q.eq("personaId", args.personaId))
      .collect();

    const topLeads = leads
      .filter((l) => l.intentScore >= 50)
      .sort((a, b) => b.intentScore - a.intentScore)
      .slice(0, 2);

    const meetingTypes = ["discovery", "follow_up"] as const;
    const baseDay = 2 + args.personaIndex * 2;

    for (let i = 0; i < topLeads.length; i++) {
      const lead = topLeads[i];
      const type = meetingTypes[i] ?? "follow_up";
      const title =
        type === "discovery"
          ? `Discovery call · ${lead.company}`
          : `Follow-up · ${lead.name}`;

      await ctx.db.insert("meetings", {
        siteId: args.siteId,
        runId: args.runId,
        personaId: args.personaId,
        leadId: lead._id,
        title,
        leadName: lead.name,
        company: lead.company,
        startsAt: meetingStart(baseDay + i * 2),
        durationMinutes: type === "discovery" ? 30 : 15,
        type,
        status: "scheduled",
      });
    }
  },
});

export const listByRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

export const listBySite = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
  },
});
