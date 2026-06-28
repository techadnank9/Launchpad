import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getRun = internalQuery({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});

export const getPersona = internalQuery({
  args: { personaId: v.id("personas") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.personaId);
  },
});

export const getRunPersonas = internalQuery({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("personas")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});
