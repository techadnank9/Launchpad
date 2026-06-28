"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import {
  generateCaption,
  generatePosterBytes,
} from "../lib/openai";
import { brandFromRun } from "../lib/brandContext";

export const run = internalAction({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    productSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const [persona, run] = await Promise.all([
      ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: args.personaId,
      }),
      ctx.runQuery(internal.agents.helpers.getRun, { runId: args.runId }),
    ]);
    if (!persona || !run) return;

    const brand = brandFromRun(run, args.productSummary);

    try {
      const [caption, posterBytes] = await Promise.all([
        generateCaption(brand, persona),
        generatePosterBytes(brand, persona),
      ]);

      const storageId = await ctx.storage.store(
        new Blob([Buffer.from(posterBytes)], { type: "image/png" }),
      );
      const posterUrl = await ctx.storage.getUrl(storageId);
      if (!posterUrl) {
        throw new Error("Failed to store generated poster in Convex storage");
      }

      await ctx.runMutation(internal.personas.updatePersonaStatus, {
        personaId: args.personaId,
        status: "processing",
        caption,
        posterUrl,
      });

      await ctx.scheduler.runAfter(0, internal.agents.schedulerAgent.run, {
        runId: args.runId,
        personaId: args.personaId,
        caption,
        posterUrl,
      });
    } catch (error) {
      await ctx.runMutation(internal.personas.updatePersonaStatus, {
        personaId: args.personaId,
        status: "failed",
      });
      await ctx.scheduler.runAfter(0, internal.workflow.checkRunComplete, {
        runId: args.runId,
      });
      throw error;
    }
  },
});
