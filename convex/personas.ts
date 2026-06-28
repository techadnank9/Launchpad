import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const personaInput = v.object({
  name: v.string(),
  painPoints: v.array(v.string()),
  messagingAngle: v.string(),
  contentTone: v.string(),
  outboundTargets: v.string(),
  posterStyle: v.string(),
});

export const createPersonas = internalMutation({
  args: {
    runId: v.id("runs"),
    personas: v.array(personaInput),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const persona of args.personas) {
      const id = await ctx.db.insert("personas", {
        runId: args.runId,
        ...persona,
        status: "pending",
        leadCount: 0,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const listByRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("personas")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

export const getPersona = query({
  args: { personaId: v.id("personas") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.personaId);
  },
});

export const updatePersonaStatus = internalMutation({
  args: {
    personaId: v.id("personas"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    leadCount: v.optional(v.number()),
    posterUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { personaId, ...updates } = args;
    await ctx.db.patch(personaId, updates);
  },
});
