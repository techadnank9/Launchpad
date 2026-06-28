"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export const startWorkflow = internalAction({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.runQuery(internal.agents.helpers.getRun, {
      runId: args.runId,
    });
    if (!run) throw new Error("Run not found");

    await ctx.scheduler.runAfter(0, internal.agents.siteAnalyst.run, {
      runId: args.runId,
      url: run.url,
    });
  },
});

export const checkRunComplete = internalAction({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const personas = await ctx.runQuery(internal.agents.helpers.getRunPersonas, {
      runId: args.runId,
    });

    const allDone = personas.every(
      (p: Doc<"personas">) => p.status === "complete" || p.status === "failed",
    );

    if (allDone && personas.length > 0) {
      const anySucceeded = personas.some((p) => p.status === "complete");
      await ctx.runMutation(internal.runs.updateRunStatus, {
        runId: args.runId,
        status: anySucceeded ? "complete" : "failed",
        error: anySucceeded
          ? undefined
          : "All persona pipelines failed. Check API keys and integration logs.",
      });
    }
  },
});
