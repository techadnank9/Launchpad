import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const listByRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    const personas = await ctx.db
      .query("personas")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    const personaNames = Object.fromEntries(
      personas.map((p) => [p._id, p.name]),
    ) as Record<Id<"personas">, string>;

    return {
      siteId: run?.siteId ?? null,
      posts: posts.map((p) => ({
        id: p._id,
        kind: "post" as const,
        startsAt: p.scheduledAt,
        title: personaNames[p.personaId] ?? "Campaign",
        subtitle: p.platform,
        status: p.status,
        personaId: p.personaId,
        platform: p.platform,
        caption: p.caption,
        posterUrl: p.posterUrl,
      })),
      meetings: meetings.map((m) => ({
        id: m._id,
        kind: "meeting" as const,
        startsAt: m.startsAt,
        title: m.title,
        subtitle: m.leadName,
        status: m.status,
        personaId: m.personaId,
        type: m.type,
        company: m.company,
        durationMinutes: m.durationMinutes,
      })),
    };
  },
});

export const listBySite = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    const runIds = new Set(runs.map((r) => r._id));
    const personaNames: Record<string, string> = {};

    for (const runId of runIds) {
      const personas = await ctx.db
        .query("personas")
        .withIndex("by_run", (q) => q.eq("runId", runId))
        .collect();
      for (const p of personas) {
        personaNames[p._id] = p.name;
      }
    }

    const posts = (
      await Promise.all(
        runs.map((run) =>
          ctx.db
            .query("posts")
            .withIndex("by_run", (q) => q.eq("runId", run._id))
            .collect(),
        ),
      )
    ).flat();

    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    return {
      siteId: args.siteId,
      posts: posts.map((p) => ({
        id: p._id,
        kind: "post" as const,
        startsAt: p.scheduledAt,
        title: personaNames[p.personaId] ?? "Campaign",
        subtitle: p.platform,
        status: p.status,
        personaId: p.personaId,
        platform: p.platform,
        caption: p.caption,
        posterUrl: p.posterUrl,
        runId: p.runId,
      })),
      meetings: meetings.map((m) => ({
        id: m._id,
        kind: "meeting" as const,
        startsAt: m.startsAt,
        title: m.title,
        subtitle: m.leadName,
        status: m.status,
        personaId: m.personaId,
        type: m.type,
        company: m.company,
        durationMinutes: m.durationMinutes,
        runId: m.runId,
      })),
    };
  },
});
