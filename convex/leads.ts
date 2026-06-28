import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
  advancePipelineStage,
} from "./lib/pipeline";

const pipelineStage = v.union(
  v.literal("inbound"),
  v.literal("new"),
  v.literal("prospecting"),
  v.literal("nurture"),
  v.literal("opportunity"),
  v.literal("customer"),
  v.literal("disqualified"),
);

export const insertLeads = internalMutation({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    leads: v.array(
      v.object({
        name: v.string(),
        title: v.string(),
        company: v.string(),
        email: v.optional(v.string()),
        linkedin: v.optional(v.string()),
        intentScore: v.number(),
        intentSignals: v.array(v.string()),
        motionScore: v.optional(v.number()),
        estimatedDealValue: v.optional(v.number()),
        dealValueExplanation: v.optional(v.string()),
        pipelineStage: v.union(
          v.literal("inbound"),
          v.literal("new"),
          v.literal("prospecting"),
          v.literal("nurture"),
          v.literal("opportunity"),
          v.literal("customer"),
          v.literal("disqualified"),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const lead of args.leads) {
      await ctx.db.insert("leads", {
        runId: args.runId,
        personaId: args.personaId,
        ...lead,
      });
    }
    await ctx.db.patch(args.personaId, { leadCount: args.leads.length });
  },
});

export const listByPersona = query({
  args: { personaId: v.id("personas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_persona", (q) => q.eq("personaId", args.personaId))
      .collect();
  },
});

export const listByRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

export const listMissingEmailByRun = internalQuery({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    return leads
      .filter((lead) => !lead.email && lead.linkedin)
      .map((lead) => ({
        leadId: lead._id,
        linkedin: lead.linkedin!,
      }));
  },
});

export const updateLeadContact = internalMutation({
  args: {
    leadId: v.id("leads"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, { email: args.email });
  },
});

export const updatePipelineStage = mutation({
  args: {
    leadId: v.id("leads"),
    pipelineStage,
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    await ctx.db.patch(args.leadId, { pipelineStage: args.pipelineStage });
  },
});

export const getLeadInternal = internalQuery({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.leadId);
  },
});

export const advanceLeadStage = internalMutation({
  args: {
    leadId: v.id("leads"),
    stage: pipelineStage,
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return;
    await ctx.db.patch(args.leadId, {
      pipelineStage: advancePipelineStage(lead.pipelineStage, args.stage),
    });
  },
});

export const clearProposalColumn = mutation({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    let moved = 0;
    for (const lead of leads) {
      if (lead.pipelineStage !== "opportunity") continue;
      await ctx.db.patch(lead._id, { pipelineStage: "nurture" });
      moved += 1;
    }

    const run = await ctx.db.get(args.runId);
    if (run?.siteId) {
      const cached = await ctx.db
        .query("siteLeads")
        .withIndex("by_site", (q) => q.eq("siteId", run.siteId!))
        .collect();
      for (const row of cached) {
        if (row.pipelineStage !== "opportunity") continue;
        await ctx.db.patch(row._id, { pipelineStage: "nurture" });
      }
    }

    return {
      success: true,
      moved,
      message:
        moved > 0
          ? `Moved ${moved} lead${moved === 1 ? "" : "s"} from Proposal to Nurture`
          : "Proposal column was already empty",
    };
  },
});

export const exportCsv = mutation({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    const header =
      "Name,Title,Company,Email,LinkedIn,Stage,Intent Score,Motion,Deal Value,Signals";
    const rows = leads.map(
      (l) =>
        `"${l.name}","${l.title}","${l.company}","${l.email ?? ""}","${l.linkedin ?? ""}","${l.pipelineStage ?? "inbound"}",${l.intentScore},${l.motionScore ?? ""},${l.estimatedDealValue ?? ""},"${l.intentSignals.join("; ")}"`,
    );
    return [header, ...rows].join("\n");
  },
});
